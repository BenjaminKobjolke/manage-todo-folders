# Create ToDo

Context menu entry on the message list. Moves the selected mail into the next free numbered todo folder and copies the matching tag.

## Flow

1. Right-click one or more selected messages → **Create ToDo**.
2. The add-on reads the base todo folder and tag prefix from storage. No base folder set → alert "Set the base todo folder in the add-on options first."
3. Direct subfolders of the base folder named `NNN` (exactly three digits) are collected and sorted by name.
4. Each one is checked for emptiness by listing its messages (`messenger.messages.list`). The first folder with zero messages is reused.
5. No empty folder → a new one is created named `max + 1`, zero-padded to three digits (`001…009` all full → `010`).
6. All selected messages are moved into that folder in one call.
7. `<tag prefix><NNN>` (e.g. `#bk_todo_010`) is written to the clipboard.
8. An alert popup window reports the result: `Moved 2 message(s) to 010 - copied #bk_todo_010`. OK, Enter or Escape closes it.

Errors are logged to the add-on console with the prefix `Manage ToDo Folders:` and shown in the same alert popup.

## Notes and gotchas

- **Emptiness check uses `messages.list`, not `folders.getFolderInfo`.** The cached `totalMessageCount` is stale or undefined for IMAP subfolders, which made every run create a new folder. Counts still come from Thunderbird's local copy of the folder: a folder emptied on another device reads as empty only after Thunderbird has synced it.
- Every run logs one line with all numbered folders and their counts, useful when the wrong folder is picked:
  ```
  Manage ToDo Folders: subfolders 001=3 002=1 003=0
  ```
- Folders not matching `^\d{3}$` under the base folder are ignored.
- Multiple selected messages always go into one folder together.
- **Alert instead of `window.alert()`.** The background page has no `alert()`. The add-on opens a small popup window (`alert/alert.html`) with the message passed via the query string.
- The context menu is re-created on every background start (`menus.removeAll()` then `menus.create()`); the MV3 event page restarts on wake-up and `create()` throws on a duplicate id.
- `pickTodoFolder()` is pure and unit-tested; the messenger calls live only in `background.js`.

## Relevant files

- `background.js` – menu registration, click handler, move, clipboard, alert.
- `lib/todo.js` – `pickTodoFolder(subfolders)`: picks an existing empty `NNN` folder or the next number to create.
- `test/todo.test.js` – unit tests for `pickTodoFolder`.
- `alert/alert.html`, `alert/alert.js` – result/error popup.
