import { getOptions } from "./lib/options.js";
import { pickTodoFolder, folderName } from "./lib/todo.js";
import { addTask } from "./lib/rtm.js";

const MENU_ID = "create-todo";

// removeAll first: the event page restarts on every wake-up and create() throws on a duplicate id.
messenger.menus.removeAll().then(() =>
  messenger.menus.create({ id: MENU_ID, title: "Create ToDo", contexts: ["message_list"] }),
);

messenger.menus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID) return;
  const ids = (info.selectedMessages?.messages ?? []).map((message) => message.id);
  if (!ids.length) return;
  // The prompt carries the ids and posts them back with the task name; no state kept here.
  openPopup("prompt/prompt.html", { ids: ids.join(",") }, 170);
});

messenger.runtime.onMessage.addListener((request) => {
  if (request?.type === "create-todo") createTodo(request.name, request.ids);
});

async function createTodo(name, ids) {
  try {
    const options = await getOptions(messenger.storage.local);
    const { baseFolderId, tag } = options;
    if (!baseFolderId) {
      await notify("Set the base todo folder in the add-on options first.");
      return;
    }

    const subfolders = await messenger.folders.getSubFolders(baseFolderId, false);
    // messages.list() instead of getFolderInfo().totalMessageCount: the cached count is unreliable
    // for IMAP subfolders (stale or undefined), which made every run create a new folder.
    const withCounts = await Promise.all(
      subfolders.map(async (folder) => {
        const { messages: page } = await messenger.messages.list(folder.id);
        return { ...folder, totalMessageCount: page.length };
      }),
    );
    console.log("Manage ToDo Folders: subfolders", withCounts.map((f) => `${f.name}=${f.totalMessageCount}`).join(" "));

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
    console.error("Manage ToDo Folders:", error);
    await notify(`Create ToDo failed: ${error.message}`);
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
