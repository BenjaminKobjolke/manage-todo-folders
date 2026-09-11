# IMAP folder sync (Experiment)

Before Create ToDo checks the numbered todo folders for emptiness, it syncs each IMAP folder from the server. Without the sync, a full folder can read as empty and get a second todo's mail.

## Problem

`messages.list` and `folders.getFolderInfo` both read Thunderbird's **local** message DB. That DB is empty for an IMAP folder that was filled (by an earlier Create ToDo move, a rename, or another device) and never opened in Thunderbird. Thunderbird only syncs a folder when it is selected, or when background sync happens to reach it.

Seen in the wild: `009 - TÜV` held 1 mail, the log showed `009 - TÜV=0/0` (`listed/info`), and the folder was reused: renamed to `009 - 998877`, with the new mail moved in next to the old one.

The WebExtension API has no way to force a sync:

- `folders.*`: no sync or update-from-server call.
- `messages.query({ online: true })`: NNTP only, and only for `headerMessageId`.
- `mailTabs.update({ displayedFolderId })` would sync, but it switches the user's visible tab.

## Solution

A WebExtension Experiment (a privileged API bundled in the add-on) calls the same core method that selecting a folder in the UI runs:

```js
folder.updateFolderWithListener(null, urlListener) // nsIMsgImapMailFolder
```

This downloads the folder's headers from the server into the local DB. Afterwards `messages.list` returns the real messages.

- API: `messenger.imapSync.syncFolder(folderId)`, which resolves when the IMAP URL stops running.
- The folder is resolved with `getFolder(folderId)` from the internal `resource:///modules/ExtensionAccounts.sys.mjs`, which accepts a `MailFolder.id` string.
- Non-IMAP folders (`!(folder instanceof Ci.nsIMsgImapMailFolder)`) resolve immediately. Local folders are always current.
- `background.js` syncs all subfolders in parallel (Thunderbird queues them on its IMAP connection pool), each raced against a **10 s timeout**. On timeout the run continues with the local counts.
- The count is still the larger of `messages.list` length and `getFolderInfo().totalMessageCount`, as a second guard for the timeout path.

## Registration

`manifest.json`:

```json
"experiment_apis": {
  "imapSync": {
    "schema": "experiments/imapSync/schema.json",
    "parent": {
      "scopes": ["addon_parent"],
      "paths": [["imapSync"]],
      "script": "experiments/imapSync/implementation.js"
    }
  }
}
```

`implementation.js` is a privileged **script**, not an ES module. It defines the global `var imapSync = class extends ExtensionCommon.ExtensionAPI`. `eslint.config.js` sets `sourceType: "script"` and the globals `ChromeUtils`, `ExtensionCommon`, `Ci` for `experiments/**`. `types/globals.d.ts` declares them for `tsc`.

## Gotchas

- **Full privileges.** Thunderbird's install prompt warns that the add-on has full, unrestricted access. An ATN listing gets a stricter review.
- **Internal module.** `ExtensionAccounts.sys.mjs` and `getFolder` are not a public API. A major Thunderbird update can rename or move them. Symptom: Create ToDo fails with an error from `imapSync.syncFolder`. Check the comm-central source for the current export.
- **`npm run lint` reports `MANIFEST_FIELD_PRIVILEGED`** for `experiment_apis`. web-ext's linter follows Firefox rules, and Firefox does not allow experiments. Thunderbird does, and `npm run build` is not affected.
- A folder emptied on another device reads as empty only after the sync. That is now automatic, as long as the server answers within 10 s.

## Relevant files

- `experiments/imapSync/implementation.js` – `syncFolder(folderId)`.
- `experiments/imapSync/schema.json` – namespace `imapSync`, async function `syncFolder(folderId: string)`.
- `manifest.json` – `experiment_apis` entry.
- `background.js` – sync + timeout before `messages.list` / `getFolderInfo` in `createTodo()`.
