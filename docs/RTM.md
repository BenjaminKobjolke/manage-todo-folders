# Remember The Milk integration

Create ToDo creates a task in Remember The Milk (RTM) for every todo folder. The task name comes from the prompt (Smart Add syntax), the tag is the tag prefix without `#` plus the folder number (`bk_todo_013`).

## Client

`lib/rtm.js` is a ~50 line REST client on `fetch`; no library. `rtm-js` (aranel616) was evaluated and skipped: archived since 2021, JSONP transport, needs an external md5, no frob/token helpers.

- Endpoint `https://api.rememberthemilk.com/services/rest/` with `format=json`. Responses are `{ rsp: { stat: "ok" | "fail", err: { code, msg } } }`; `rtmCall()` throws `RTM <code>: <msg>` on `fail`.
- Every request is signed: `api_sig = md5(secret + key1 + value1 + key2 + value2 ...)` with keys sorted and values **unencoded**. `sign()` is tested against the example from the RTM docs (`md5("BANANAS" + "abcbazfegbaryxzfoo")`).
- WebCrypto has no MD5, so `lib/md5.js` is a small RFC 1321 implementation over UTF-8 bytes. Tested against the standard vectors.
- `manifest.json` needs `host_permissions: ["https://api.rememberthemilk.com/*"]` for `fetch` from the background page.

## Auth (desktop flow)

Done in the options page (`options/options.js`):

1. `rtm.auth.getFrob` (api key + secret, no token).
2. `messenger.windows.openDefaultBrowser(authUrl)` with `https://www.rememberthemilk.com/services/auth/?api_key&perms=write&frob&api_sig`.
3. User authorises in the browser and clicks **Finish connection**.
4. `rtm.auth.getToken(frob)` → `rsp.auth.token` and `rsp.auth.user.username` are stored as `rtmToken` / `rtmUser`.

The frob lives only in the options page's memory. Closing the options before **Finish connection** means clicking **Connect** again.

## Task creation

`addTask({ name, listId, tag }, creds)` in `lib/rtm.js`:

1. `rtm.timelines.create` → `timeline` (write calls need one).
2. `rtm.tasks.add` with `parse=1` (Smart Add), `list_id` = target list. Response `rsp.list.taskseries.name` is the **clean** task name with all Smart Add tokens removed, including bare date words like `today`; this becomes the folder name.
3. `rtm.tasks.addTags` with `tags=bk_todo_013`. Uses `list.id` from the add response, because `#SomeList` in the input can override the target list.

`taskseries` and `task` are objects for a single item and arrays for several; the code takes `[0]` of `[].concat(x)`.

## Tag cache

`getTags(creds, storage, { force })` in `lib/rtm.js` backs the `#` autocomplete in the Create ToDo prompt. `rtm.tags.getList` is called at most once every 24 h; the names are stored as `rtmTags: { names, fetchedAt }` in `storage.local`. **Refresh tags** in the prompt and in the options forces a fetch. A failed fetch returns the stale cache. **Disconnect** removes the cache. `tags.tag` is an object for one tag and an array for several, same quirk as `taskseries`.

## Storage and security

API key, secret and token are stored in plain text in `storage.local` (key `options`). Same trust level as any RTM desktop client; the secret only signs requests for this key. **Disconnect** clears token, user and list id, not key/secret.

## Relevant files

- `lib/rtm.js` – `sign`, `rtmCall`, `authUrl`, `addTask`, `getTags`.
- `lib/md5.js` – MD5.
- `test/rtm.test.js` – signing vector, envelope handling, `addTask` call sequence.
- `options/options.js` – Connect / Finish / Disconnect, list selection.
- `background.js` – calls `addTask` before creating the folder.
