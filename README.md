# Manage ToDo Folders

Thunderbird add-on (128+). Right-click selected mail → **Create ToDo**:

1. Looks at the `NNN` subfolders of your base todo folder, picks the first empty one, or creates the next number (`001…009` full → creates `010`).
2. Moves the selected messages there.
3. Copies `<tag prefix><number>` (e.g. `#bk_todo_010`) to the clipboard and shows an alert popup.

## Setup

Add-on options: pick the email account, filter and click the base todo folder (e.g. `@BKToDo`), set the tag prefix (e.g. `#bk_todo_`). See `docs/SETTINGS.md`.

## Docs

- `docs/CREATE_TODO.md` – how the context menu action picks/creates the folder.
- `docs/SETTINGS.md` – options page and storage schema.

## Development

```
npm install
npm test          # unit tests (node:test)
npm run lint      # web-ext lint
npm run build     # -> web-ext-artifacts/manage-todo-folders-<version>.xpi
```

Or `tools\windows\build_xpi.bat`. Load unpacked via Thunderbird → Add-ons → gear → Debug Add-ons → Load Temporary Add-on → `manifest.json`.
