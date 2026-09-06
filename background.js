import { getOptions } from "./lib/options.js";
import { pickTodoFolder } from "./lib/todo.js";

const MENU_ID = "create-todo";

// removeAll first: the event page restarts on every wake-up and create() throws on a duplicate id.
messenger.menus.removeAll().then(() =>
  messenger.menus.create({ id: MENU_ID, title: "Create ToDo", contexts: ["message_list"] }),
);

messenger.menus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) return;
  try {
    const messages = info.selectedMessages?.messages ?? [];
    if (!messages.length) return;

    const { baseFolderId, tag } = await getOptions(messenger.storage.local);
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
    const target = pick.existing ?? (await messenger.folders.create(baseFolderId, pick.create));

    await messenger.messages.move(
      messages.map((message) => message.id),
      target.id,
      { isUserAction: true },
    );

    const label = `${tag}${target.name}`;
    await navigator.clipboard.writeText(label);
    await notify(`Moved ${messages.length} message(s) to ${target.name} - copied ${label}`);
  } catch (error) {
    console.error("Manage ToDo Folders:", error);
    await notify(`Create ToDo failed: ${error.message}`);
  }
});

// Background pages have no window.alert(); a small popup window is the closest equivalent.
function notify(message) {
  return messenger.windows.create({
    type: "popup",
    url: `alert/alert.html?${new URLSearchParams({ message })}`,
    width: 420,
    height: 160,
    allowScriptsToClose: true,
  });
}
