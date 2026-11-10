import { getOptions } from "./lib/options.js";
import { emptyTodoFolders, pickTodoFolder, folderName } from "./lib/todo.js";
import { addTask } from "./lib/rtm.js";
import { logger } from "./lib/logger.js";

const MENU_ID = "create-todo";
const DELETE_EMPTY_MENU_ID = "delete-empty-todo-folders";
const EXTERNAL_MESSAGE_SENDER_ID = "move-and-jump@bovender.de";
const EXTERNAL_MESSAGE_TYPES = Object.freeze({
  PING: "ping",
  DELETE_EMPTY_TODO_FOLDERS: "delete-empty-todo-folders",
});

// removeAll first: the event page restarts on every wake-up and create() throws on a duplicate id.
messenger.menus.removeAll().then(() => Promise.all([
  messenger.menus.create({ id: MENU_ID, title: "Create ToDo", contexts: ["message_list"] }),
  messenger.menus.create({
    id: DELETE_EMPTY_MENU_ID,
    title: messenger.i18n.getMessage("deleteEmptyTodoFoldersMenu"),
    contexts: ["folder_pane"],
  }),
]));

messenger.menus.onClicked.addListener((info) => {
  if (info.menuItemId === DELETE_EMPTY_MENU_ID) {
    deleteEmptyTodoFoldersFromMenu();
    return;
  }
  if (info.menuItemId !== MENU_ID) return;
  const ids = (info.selectedMessages?.messages ?? []).map((message) => message.id);
  if (!ids.length) return;
  // The prompt carries the ids and posts them back with the task name; no state kept here.
  openPopup("prompt/prompt.html", { ids: ids.join(",") }, 380);
});

async function deleteEmptyTodoFoldersFromMenu() {
  try {
    const result = await deleteEmptyTodoFolders();
    const message = !result.ok
      ? result.error
      : result.deleted.length
        ? messenger.i18n.getMessage("deletedEmptyTodoFolders", [String(result.deleted.length)])
        : messenger.i18n.getMessage("noEmptyTodoFolders");
    await notify(message);
  } catch (error) {
    logger.error("Manage ToDo Folders: menu action failed", error);
    await notify(messenger.i18n.getMessage("deleteEmptyTodoFoldersError", [error.message ?? String(error)]));
  }
}

messenger.runtime.onMessage.addListener((request) => {
  if (request?.type === "create-todo") createTodo(request.name, request.ids);
});

messenger.runtime.onMessageExternal.addListener(async (request, sender) => {
  if (sender.id !== EXTERNAL_MESSAGE_SENDER_ID) return;
  const message = normalizeExternalMessage(request);
  if (!message) return;

  if (message.type === EXTERNAL_MESSAGE_TYPES.PING) return { ok: true };
  if (message.type === EXTERNAL_MESSAGE_TYPES.DELETE_EMPTY_TODO_FOLDERS) {
    try {
      return await deleteEmptyTodoFolders();
    } catch (error) {
      logger.error("Manage ToDo Folders: external delete request failed", error);
      return { ok: false, error: messenger.i18n.getMessage("deleteEmptyTodoFoldersError", [error.message ?? String(error)]) };
    }
  }
});

function normalizeExternalMessage(request) {
  if (!request || typeof request !== "object" || Array.isArray(request) || typeof request.type !== "string") return null;
  return Object.values(EXTERNAL_MESSAGE_TYPES).includes(request.type) ? { type: request.type } : null;
}

async function createTodo(name, ids) {
  try {
    const options = await getOptions(messenger.storage.local);
    const { baseFolderId, tag } = options;
    if (!baseFolderId) {
      await notify(messenger.i18n.getMessage("baseTodoFolderMissing"));
      return;
    }

    const withCounts = await listTodoSubfolders(baseFolderId);

    const pick = pickTodoFolder(withCounts);
    const label = `${tag}${pick.number}`;

    // RTM parses the Smart Add syntax and returns the clean task name; without RTM the raw input is used.
    let cleanName = name;
    let rtmNote = "";
    if (options.rtmToken) {
      const creds = { apiKey: options.rtmApiKey, secret: options.rtmSecret, token: options.rtmToken };
      ({ name: cleanName } = await addTask(
        { name, listId: options.rtmListId, tag: label.replace(/^#/, "") },
        creds,
      ));
      rtmNote = " - RTM task created";
    }

    const wanted = folderName(pick.number, cleanName);
    let target;
    if (!pick.existing) {
      target = await messenger.folders.create(baseFolderId, wanted);
    } else if (pick.existing.name === wanted) {
      target = pick.existing;
    } else {
      target = await messenger.folders.rename(pick.existing.id, wanted);
    }

    await messenger.messages.move(ids, target.id, { isUserAction: true });

    await navigator.clipboard.writeText(label);
    await notify(`Moved ${ids.length} message(s) to ${target.name} - copied ${label}${rtmNote}`);
  } catch (error) {
    logger.error("Manage ToDo Folders:", error);
    await notify(`Create ToDo failed: ${error.message}`);
  }
}

async function listTodoSubfolders(baseFolderId) {
  const subfolders = await messenger.folders.getSubFolders(baseFolderId, false);
  // messages.list() reads the local DB, which is empty for an IMAP folder filled but never opened here,
  // so each folder is synced first. getFolderInfo().totalMessageCount can be stale or undefined; take
  // the larger count so a full folder is never reused.
  const withCounts = await Promise.all(
    subfolders.map(async (folder) => {
      // ponytail: 10 s cap per folder so a server that never answers can't hang Create ToDo.
      let timeoutId;
      const timeout = new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve(false), 10000);
      });
      let synced;
      try {
        synced = await Promise.race([
          messenger.imapSync.syncFolder(folder.id).then((success) => success === true),
          timeout,
        ]);
      } finally {
        clearTimeout(timeoutId);
      }
      const [{ messages: page }, info] = await Promise.all([
        messenger.messages.list(folder.id),
        messenger.folders.getFolderInfo(folder.id),
      ]);
      const children = await messenger.folders.getSubFolders(folder.id, false);
      const counts = `${page.length}/${info.totalMessageCount}`;
      return { ...folder, counts, synced, subFolders: children, totalMessageCount: Math.max(page.length, info.totalMessageCount ?? 0) };
    }),
  );
  logger.info("Manage ToDo Folders: subfolders (listed/info)", withCounts.map((f) => `${f.name}=${f.counts}`).join(" "));
  return withCounts;
}

async function deleteEmptyTodoFolders() {
  const deleted = [];
  try {
    const options = await getOptions(messenger.storage.local);
    if (!options.baseFolderId) return { ok: false, error: messenger.i18n.getMessage("baseTodoFolderMissing") };
    const folders = await listTodoSubfolders(options.baseFolderId);
    for (const folder of emptyTodoFolders(folders)) {
      await messenger.imapSync.deleteFolder(folder.id);
      deleted.push(folder.name);
    }
    return { ok: true, deleted };
  } catch (error) {
    logger.error("Manage ToDo Folders: deleting empty folders failed", error);
    return {
      ok: false,
      error: messenger.i18n.getMessage("deleteEmptyTodoFoldersError", [error.message ?? String(error)]),
      deleted,
    };
  }
}

// Background pages have no window.alert()/prompt(); small popup windows are the closest equivalent.
function notify(message) {
  return openPopup("alert/alert.html", { message }, 160);
}

function openPopup(page, params, height) {
  return messenger.windows.create({
    type: "popup",
    url: `${page}?${new URLSearchParams(params)}`,
    width: 420,
    height,
    allowScriptsToClose: true,
  });
}
