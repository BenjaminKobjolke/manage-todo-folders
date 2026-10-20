import { md5 } from "./md5.js";

// Minimal Remember The Milk REST client. Pure: no messenger calls, fetch is injectable for tests.
const REST = "https://api.rememberthemilk.com/services/rest/";
const AUTH = "https://www.rememberthemilk.com/services/auth/";

// api_sig = md5(secret + key1value1key2value2...) with keys sorted, values unencoded.
export function sign(params, secret) {
  const joined = Object.keys(params).sort().map((key) => key + params[key]).join("");
  return md5(secret + joined);
}

const signedQuery = (params, secret) => new URLSearchParams({ ...params, api_sig: sign(params, secret) });

// creds: { apiKey, secret, token?, fetch? }. Throws Error("RTM <code>: <msg>") on stat "fail".
export async function rtmCall(method, params, { apiKey, secret, token, fetch = /** @type {(url: string) => Promise<{ json(): Promise<any> }>} */ (globalThis.fetch) }) {
  const all = { method, api_key: apiKey, format: "json", ...(token && { auth_token: token }), ...params };
  const response = await fetch(`${REST}?${signedQuery(all, secret)}`);
  const { rsp } = await response.json();
  if (rsp.stat !== "ok") throw new Error(`RTM ${rsp.err?.code}: ${rsp.err?.msg}`);
  return rsp;
}

export function authUrl(frob, { apiKey, secret }) {
  return `${AUTH}?${signedQuery({ api_key: apiKey, perms: "write", frob }, secret)}`;
}

// Creates the task with Smart Add parsing, tags it, returns the parsed (clean) task name.
export async function addTask({ name, listId, tag }, creds) {
  const { timeline } = await rtmCall("rtm.timelines.create", {}, creds);
  const { list } = await rtmCall(
    "rtm.tasks.add",
    { timeline, name, parse: "1", ...(listId && { list_id: listId }) },
    creds,
  );
  // taskseries/task are objects for one item, arrays for several.
  const series = [].concat(list.taskseries)[0];
  const task = [].concat(series.task)[0];
  await rtmCall(
    "rtm.tasks.addTags",
    { timeline, list_id: list.id, taskseries_id: series.id, task_id: task.id, tags: tag },
    creds,
  );
  return { name: series.name };
}

const TAG_TTL = 24 * 60 * 60 * 1000;

export async function fetchTags(creds) {
  const { tags } = await rtmCall("rtm.tags.getList", {}, creds);
  // tag is an object for one tag, an array for several; older responses use plain strings.
  return [].concat(tags?.tag ?? []).map((t) => t.name ?? t).sort();
}

// Tag names cached in storage as rtmTags: { names, fetchedAt }, refetched at most every 24 h unless forced.
// A failed fetch falls back to the stale cache so the prompt still works offline.
export async function getTags(creds, storageArea, { force = false, now = Date.now() } = {}) {
  const { rtmTags } = await storageArea.get("rtmTags");
  if (rtmTags && !force && now - rtmTags.fetchedAt < TAG_TTL) return rtmTags;
  try {
    const fresh = { names: await fetchTags(creds), fetchedAt: now };
    await storageArea.set({ rtmTags: fresh });
    return fresh;
  } catch (error) {
    if (rtmTags) return rtmTags;
    throw error;
  }
}
