# Settings

Add-on options page (Add-ons → Manage ToDo Folders → Options). Every control saves on change; there is no Save button.

## Controls

1. **Email account** – dropdown of all accounts. Preselected from the account of the saved base folder, otherwise the first account.
2. **Base todo folder** – text input that live-filters the listbox below (case-insensitive substring on the folder path). The listbox shows the folders of the chosen account with IMAP modified UTF-7 names decoded. Clicking a row saves it; the line below shows `Current: /Company/@BKToDo`.
3. **ToDo tag prefix** – free text, e.g. `#bk_todo_`. The copied tag is prefix + folder number. The RTM tag is the same without the leading `#`.

### Remember The Milk

4. **API key** / **Shared secret** – from `https://www.rememberthemilk.com/services/api/keys.rtm`. Saved on change.
5. **Connect** – fetches a frob and opens the RTM authorisation page in the default browser. After authorising, click **Finish connection**; the status line changes to `Connected as <user>`. **Disconnect** clears the token (key and secret stay).
6. **Target list** – dropdown of the account's regular lists (smart, archived and deleted lists hidden). Preselected from the stored id, otherwise the list named `Inbox`, and saved immediately.

Auth flow and API details: `docs/RTM.md`.

## Storage

`storage.local`, key `options`:

```jsonc
{
  "baseFolderId": "<opaque folder.id>",  // never the path or URL
  "tag": "#bk_todo_",
  "rtmApiKey": "",
  "rtmSecret": "",     // plain text
  "rtmToken": "",      // empty = not connected, Create ToDo skips RTM
  "rtmUser": "",
  "rtmListId": ""
}
```

Defaults in `lib/options.js`. `getOptions()` merges defaults over stored values, so new options never need a migration. Saves merge over the stored object so unrelated keys survive.

## Notes and gotchas

- **Listbox, not `<datalist>`.** A `<datalist>` suggestion popup never renders inside the inline options iframe in about:addons: typing showed nothing and no event fired. A `<select size="8">` filtered by the input works without any popup.
- Only the folder id is stored. It is resolved back to a folder by scanning `messenger.folders.query({})` (there is no get-by-id API). A stale id shows `Current: (folder not found)`.
- Folder ids and account ids are opaque and must never be passed through `decodeImapUtf7`; only `folder.path` is decoded, for display.
- The RTM frob is kept only in page memory between **Connect** and **Finish connection**. Reopening the options page means starting with **Connect** again.
- `rtm.auth.getFrob` / `getToken` are called without `auth_token` on purpose; a stale token must not be sent along.

## Relevant files

- `options/options.html`, `options/options.js`, `options/options.css`
- `lib/options.js` – defaults and `getOptions(storageArea)`.
- `lib/imapUtf7.js` – RFC 3501 modified UTF-7 decoder (copied from move-and-jump).
- `lib/rtm.js` – `rtmCall`, `authUrl`.
