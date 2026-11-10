# Manage ToDo Folders

Thunderbird add-on (128+). Right-click selected mail → **Create ToDo**:

1. Asks for a task name in Remember The Milk Smart Add syntax, e.g. `Rechnung bezahlen !1 today`.
2. Looks at the `NNN - name` subfolders of your base todo folder, picks the first empty one, or takes the next number (`001…009` full → `010`).
3. If RTM is connected, creates the task in your target list, tagged `bk_todo_010`, and uses RTM's parsed name.
4. Creates (or renames) the folder `010 - Rechnung bezahlen` and moves the selected messages there.
5. Copies `<tag prefix><number>` (e.g. `#bk_todo_010`) to the clipboard and shows an alert popup.

Right-click the folder pane → **Delete empty ToDo folders** to permanently remove empty numbered
folders under the configured base folder. A folder is removed only after its sync succeeds, both
message counts are zero, and it has no subfolders; nothing is moved to Trash.

Move and Jump can call this action with `messenger.runtime.sendMessage("manage-todo-folders@kobjolke.de", { type: "delete-empty-todo-folders" })`.
It returns `{ ok: true, deleted: string[] }` or `{ ok: false, error: string, deleted?: string[] }`.
Send `{ type: "ping" }` to check availability; this add-on accepts external messages only from
`move-and-jump@bovender.de`.

## Setup

Add-on options: pick the email account, filter and click the base todo folder (e.g. `@BKToDo`), set the tag prefix (e.g. `#bk_todo_`). For RTM enter API key and shared secret, click **Connect**, authorise in the browser, click **Finish connection**, pick the target list (default Inbox). See `docs/SETTINGS.md`.

The add-on bundles a small WebExtension Experiment (`experiments/imapSync`) to sync IMAP todo folders before checking them for emptiness, so Thunderbird's install prompt asks for full access.

**Tip:** new folders open threaded/grouped by default. To get a flat list in every new todo folder, open Thunderbird Settings → General → **Config Editor…** and set `mailnews.default_view_flags` to `0` (optionally `mailnews.default_sort_type` = `18`, `mailnews.default_sort_order` = `2` for newest first). Applies to folders created afterwards only.

## Docs

- `docs/CREATE_TODO.md` – how the context menu action picks/creates the folder and removes empty folders.
- `docs/SETTINGS.md` – options page and storage schema.
- `docs/RTM.md` – Remember The Milk auth, signing and task creation.

## Development

```
npm install
npm test          # unit tests (node:test)
npm run lint      # ESLint
npm run build     # -> web-ext-artifacts/manage-todo-folders-<version>.xpi
```

Or `tools\windows\build_xpi.bat`. Load unpacked via Thunderbird → Add-ons → gear → Debug Add-ons → Load Temporary Add-on → `manifest.json`.
