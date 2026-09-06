import { test } from "node:test";
import assert from "node:assert/strict";
import { md5 } from "../lib/md5.js";
import { sign, rtmCall, authUrl, addTask } from "../lib/rtm.js";

test("md5 known vectors", () => {
  assert.equal(md5(""), "d41d8cd98f00b204e9800998ecf8427e");
  assert.equal(md5("abc"), "900150983cd24fb0d6963f7d28e17f72");
  assert.equal(md5("The quick brown fox jumps over the lazy dog"), "9e107d9d372bb6826bd81d3542a419d6");
  assert.equal(md5("a".repeat(64)), "014842d480b571495a4a0363793f7367");
});

test("sign matches the RTM documentation example", () => {
  // https://www.rememberthemilk.com/services/api/authentication.rtm
  assert.equal(sign({ yxz: "foo", feg: "bar", abc: "baz" }, "BANANAS"), "82044aae4dd676094f23f1ec152159ba");
});

const fakeFetch = (handler) => {
  const calls = [];
  const fetch = async (url) => {
    const params = Object.fromEntries(new URL(url).searchParams);
    calls.push(params);
    return { json: async () => ({ rsp: handler(params) }) };
  };
  return { fetch, calls };
};

test("rtmCall adds api_key, format, auth_token and throws on fail", async () => {
  const { fetch, calls } = fakeFetch(() => ({ stat: "fail", err: { code: "96", msg: "Invalid signature" } }));
  await assert.rejects(
    rtmCall("rtm.test.echo", { foo: "bar" }, { apiKey: "K", secret: "S", token: "T", fetch }),
    { message: "RTM 96: Invalid signature" },
  );
  const sent = calls[0];
  assert.equal(sent.method, "rtm.test.echo");
  assert.equal(sent.api_key, "K");
  assert.equal(sent.format, "json");
  assert.equal(sent.auth_token, "T");
  const { api_sig, ...rest } = sent;
  assert.equal(api_sig, sign(rest, "S"));
});

test("authUrl carries perms=write and a signature", () => {
  const url = new URL(authUrl("FROB", { apiKey: "K", secret: "S" }));
  assert.equal(url.origin + url.pathname, "https://www.rememberthemilk.com/services/auth/");
  assert.equal(url.searchParams.get("perms"), "write");
  assert.equal(url.searchParams.get("frob"), "FROB");
  assert.equal(url.searchParams.get("api_sig"), sign({ api_key: "K", perms: "write", frob: "FROB" }, "S"));
});

test("addTask: timeline, parsed add, tag; returns parsed name", async () => {
  const { fetch, calls } = fakeFetch((p) => {
    if (p.method === "rtm.timelines.create") return { stat: "ok", timeline: "TL" };
    if (p.method === "rtm.tasks.add") {
      return { stat: "ok", list: { id: "L1", taskseries: { id: "TS", name: "Rechnung bezahlen", task: { id: "T" } } } };
    }
    return { stat: "ok" };
  });
  const creds = { apiKey: "K", secret: "S", token: "T", fetch };
  const result = await addTask({ name: "Rechnung bezahlen !1 today", listId: "L1", tag: "bk_todo_013" }, creds);
  assert.deepEqual(result, { name: "Rechnung bezahlen" });
  assert.deepEqual(calls.map((c) => c.method), ["rtm.timelines.create", "rtm.tasks.add", "rtm.tasks.addTags"]);
  assert.equal(calls[1].parse, "1");
  assert.equal(calls[1].list_id, "L1");
  assert.equal(calls[1].name, "Rechnung bezahlen !1 today");
  const { timeline, list_id, taskseries_id, task_id, tags } = calls[2];
  assert.deepEqual(
    { timeline, list_id, taskseries_id, task_id, tags },
    { timeline: "TL", list_id: "L1", taskseries_id: "TS", task_id: "T", tags: "bk_todo_013" },
  );
});

test("addTask handles array-shaped taskseries/task", async () => {
  const { fetch } = fakeFetch((p) => {
    if (p.method === "rtm.timelines.create") return { stat: "ok", timeline: "TL" };
    if (p.method === "rtm.tasks.add") {
      return { stat: "ok", list: { id: "L1", taskseries: [{ id: "TS", name: "x", task: [{ id: "T" }] }] } };
    }
    return { stat: "ok" };
  });
  const result = await addTask({ name: "x", listId: "", tag: "t" }, { apiKey: "K", secret: "S", token: "T", fetch });
  assert.deepEqual(result, { name: "x" });
});
