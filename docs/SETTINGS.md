# Settings

Add-on options page (Add-ons → Manage ToDo Folders → Options). Every control saves on change; there is no Save button.

## Controls

1. **Email account** – dropdown of all accounts. Preselected from the account of the saved base folder, otherwise the first account.
2. **Base todo folder** – text input that live-filters the listbox below (case-insensitive substring on the folder path). The listbox shows the folders of the chosen account with IMAP modified UTF-7 names decoded. Clicking a row saves it; the line below shows `Current: /Company/@BKToDo`.
3. **ToDo tag prefix** – free text, e.g. `#bk_todo_`. The copied tag is prefix + folder number.

## Storage

`storage.local`, key `options`:

```jsonc
{
  "baseFolderId": "<opaque folder.id>",  // never the path or URL
  "tag": "#bk_todo_"
}
```

Defaults in `lib/options.js`: `baseFolderId: ""`, `tag: "#todo_"`. `getOptions()` merges defaults over stored values, so new options never need a migration. Saves merge over the stored object so unrelated keys survive.

## Notes and gotchas

- **Listbox, not `<datalist>`.** A `<datalist>` suggestion popup never renders inside the inline options iframe in about:addons: typing showed nothing and no event fired. A `<select size="8">` filtered by the input works without any popup.
- Only the folder id is stored. It is resolved back to a folder by scanning `messenger.folders.query({})` (there is no get-by-id API). A stale id shows `Current: (folder not found)`.
- Folder ids and account ids are opaque and must never be passed through `decodeImapUtf7`; only `folder.path` is decoded, for display.

## Relevant files

- `options/options.html`, `options/options.js`, `options/options.css`
- `lib/options.js` – defaults and `getOptions(storageArea)`.
- `lib/imapUtf7.js` – RFC 3501 modified UTF-7 decoder (copied from move-and-jump).
