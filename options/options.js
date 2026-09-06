import { getOptions } from "../lib/options.js";
import { decodeImapUtf7 } from "../lib/imapUtf7.js";
import { rtmCall, authUrl } from "../lib/rtm.js";

const account = /** @type {HTMLSelectElement} */ (document.getElementById("account"));
const folderSearch = /** @type {HTMLInputElement} */ (document.getElementById("folderSearch"));
const folderList = /** @type {HTMLSelectElement} */ (document.getElementById("folderList"));
const folderCurrent = document.getElementById("folderCurrent");
const tag = /** @type {HTMLInputElement} */ (document.getElementById("tag"));
const rtmApiKey = /** @type {HTMLInputElement} */ (document.getElementById("rtmApiKey"));
const rtmSecret = /** @type {HTMLInputElement} */ (document.getElementById("rtmSecret"));
const rtmConnect = document.getElementById("rtmConnect");
const rtmFinish = document.getElementById("rtmFinish");
const rtmDisconnect = document.getElementById("rtmDisconnect");
const rtmStatus = document.getElementById("rtmStatus");
const rtmList = /** @type {HTMLSelectElement} */ (document.getElementById("rtmList"));

let allFolders = [];
// Frob from getFrob, valid until "Finish connection". Page memory only: reopening options restarts Connect.
let frob = "";

const labelOf = (folder) => decodeImapUtf7(folder.path ?? "");
const options = () => getOptions(messenger.storage.local);
const credsOf = (o) => ({ apiKey: o.rtmApiKey, secret: o.rtmSecret, token: o.rtmToken });

async function save(patch) {
  const current = await options();
  await messenger.storage.local.set({ options: { ...current, ...patch } });
}

function showCurrent(folderId) {
  const folder = allFolders.find((f) => f.id === folderId);
  folderCurrent.textContent = folderId
    ? `Current: ${folder ? labelOf(folder) : "(folder not found)"}`
    : "Current: none";
}

// Listbox instead of <datalist>: datalist popups do not render inside the inline options iframe.
function fillFolderList() {
  const needle = folderSearch.value.trim().toLowerCase();
  folderList.innerHTML = "";
  for (const folder of allFolders.filter((f) => f.accountId === account.value)) {
    const label = labelOf(folder);
    if (needle && !label.toLowerCase().includes(needle)) continue;
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = label;
    folderList.appendChild(option);
  }
}

async function refreshRtm() {
  const o = await options();
  rtmFinish.hidden = !frob;
  rtmDisconnect.hidden = !o.rtmToken;
  rtmList.innerHTML = "";
  if (!o.rtmToken) {
    if (!frob) rtmStatus.textContent = "Not connected";
    return;
  }
  rtmStatus.textContent = `Connected as ${o.rtmUser}`;
  try {
    const { lists } = await rtmCall("rtm.lists.getList", {}, credsOf(o));
    // RTM JSON flags are the strings "0"/"1".
    const usable = [].concat(lists.list).filter(
      (l) => String(l.smart) !== "1" && String(l.archived) !== "1" && String(l.deleted) !== "1",
    );
    for (const l of usable) {
      const option = document.createElement("option");
      option.value = l.id;
      option.textContent = l.name;
      rtmList.appendChild(option);
    }
    const selected =
      usable.find((l) => l.id === o.rtmListId) ?? usable.find((l) => l.name === "Inbox") ?? usable[0];
    if (selected) {
      rtmList.value = selected.id;
      if (selected.id !== o.rtmListId) await save({ rtmListId: selected.id });
    }
  } catch (error) {
    rtmStatus.textContent = error.message;
  }
}

async function load() {
  const [folders, accounts, o] = await Promise.all([
    messenger.folders.query({}),
    messenger.accounts.list(),
    options(),
  ]);
  allFolders = folders;

  account.innerHTML = "";
  for (const a of accounts) {
    const option = document.createElement("option");
    option.value = a.id;
    option.textContent = a.name;
    account.appendChild(option);
  }

  const current = allFolders.find((f) => f.id === o.baseFolderId);
  account.value = current?.accountId ?? accounts[0]?.id ?? "";
  fillFolderList();

  tag.value = o.tag;
  showCurrent(o.baseFolderId);

  rtmApiKey.value = o.rtmApiKey;
  rtmSecret.value = o.rtmSecret;
  await refreshRtm();
}

account.addEventListener("change", () => {
  folderSearch.value = "";
  fillFolderList();
});

folderSearch.addEventListener("input", fillFolderList);

folderList.addEventListener("change", async () => {
  const folderId = folderList.value;
  if (!folderId) return;
  await save({ baseFolderId: folderId });
  showCurrent(folderId);
});

tag.addEventListener("change", () => save({ tag: tag.value.trim() }));
rtmApiKey.addEventListener("change", () => save({ rtmApiKey: rtmApiKey.value.trim() }));
rtmSecret.addEventListener("change", () => save({ rtmSecret: rtmSecret.value.trim() }));

// Desktop auth flow: getFrob -> user authorises in the browser -> getToken(frob).
rtmConnect.addEventListener("click", async () => {
  try {
    const creds = { ...credsOf(await options()), token: "" };
    ({ frob } = await rtmCall("rtm.auth.getFrob", {}, creds));
    await messenger.windows.openDefaultBrowser(authUrl(frob, creds));
    rtmStatus.textContent = "Authorize the add-on in your browser, then click Finish connection.";
    rtmFinish.hidden = false;
  } catch (error) {
    rtmStatus.textContent = error.message;
  }
});

rtmFinish.addEventListener("click", async () => {
  try {
    const creds = { ...credsOf(await options()), token: "" };
    const { auth } = await rtmCall("rtm.auth.getToken", { frob }, creds);
    frob = "";
    await save({ rtmToken: auth.token, rtmUser: auth.user.username });
    await refreshRtm();
  } catch (error) {
    rtmStatus.textContent = error.message;
  }
});

rtmDisconnect.addEventListener("click", async () => {
  frob = "";
  await save({ rtmToken: "", rtmUser: "", rtmListId: "" });
  await refreshRtm();
});

rtmList.addEventListener("change", () => save({ rtmListId: rtmList.value }));

load();
