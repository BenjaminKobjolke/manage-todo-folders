# Create ToDo

Context menu entry on the message list. Asks for a task name, creates a Remember The Milk task, moves the selected mail into the next free numbered todo folder named after the task and copies the matching tag.

## Flow

1. Right-click one or more selected messages → **Create ToDo**.
2. A small prompt window (`prompt/prompt.html`) asks for the task name in RTM Smart Add syntax, e.g. `Rechnung bezahlen !1 today`. Enter/OK submits, Escape/Cancel aborts. The selected message ids travel in the prompt's query string and come back with the name via `runtime.sendMessage`, so the background page keeps no state.
3. The add-on reads the options from storage. No base folder set → alert "Set the base todo folder in the add-on options first."
4. Direct subfolders of the base folder named `NNN` or `NNN - anything` are collected and sorted by number.
5. Each one is checked for emptiness by listing its messages (`messenger.messages.list`). The first empty folder is reused.
6. No empty folder → the next number is `max + 1`, zero-padded (`001…009` all full → `010`).
7. If RTM is connected (see `docs/RTM.md`): the task is created in the target list with Smart Add parsing and tagged `<prefix without #><NNN>` (`bk_todo_013`). RTM returns the clean name (`Rechnung bezahlen`). An RTM error aborts here, nothing is moved. Not connected → the raw input is used as the name and no task is created.
8. Folder name = `NNN - <clean name>` (`013 - Rechnung bezahlen`, `\ / :` replaced by `-`). A new folder is created, or the reused empty folder is renamed (`005 - old task` → `005 - Rechnung bezahlen`; its number and tag stay `005`).
9. All selected messages are moved into that folder in one call.
10. `<tag prefix><NNN>` (e.g. `#bk_todo_013`) is written to the clipboard.
11. An alert popup reports the result: `Moved 2 message(s) to 013 - Rechnung bezahlen - copied #bk_todo_013 - RTM task created`.

Errors are logged to the add-on console with the prefix `Manage ToDo Folders:` and shown in the same alert popup.

## Notes and gotchas

- **Emptiness check uses `messages.list`, not `folders.getFolderInfo`.** The cached `totalMessageCount` is stale or undefined for IMAP subfolders, which made every run create a new folder. Counts still come from Thunderbird's local copy of the folder: a folder emptied on another device reads as empty only after Thunderbird has synced it.
- Every run logs one line with all numbered folders and their counts, useful when the wrong folder is picked:
  ```
  Manage ToDo Folders: subfolders 001 - Steuer=3 002=1 003 - Rechnung=0
  ```
- Folders not matching `^\d{3}( - .*)?$` under the base folder are ignored.
- Multiple selected messages always go into one folder together.
- **Alert/prompt instead of `window.alert()`/`prompt()`.** The background page has neither. Small popup windows (`alert/alert.html`, `prompt/prompt.html`) are opened with the payload in the query string.
- The context menu is re-created on every background start (`menus.removeAll()` then `menus.create()`); the MV3 event page restarts on wake-up and `create()` throws on a duplicate id.
- `pickTodoFolder()` and `folderName()` are pure and unit-tested; the messenger calls live only in `background.js`.
- `folders.rename` returns the renamed folder; its id is used for the move, so the IMAP rename finishing later does not matter.

## Relevant files

- `background.js` – menu registration, prompt, RTM task, folder create/rename, move, clipboard, alert.
- `lib/todo.js` – `pickTodoFolder(subfolders)`: picks an existing empty numbered folder or the next number; `folderName(number, taskName)`.
- `lib/rtm.js` – RTM client, see `docs/RTM.md`.
- `test/todo.test.js` – unit tests for `pickTodoFolder` and `folderName`.
- `prompt/prompt.html`, `prompt/prompt.js` – task name prompt.
- `alert/alert.html`, `alert/alert.js` – result/error popup.
