import { getOptions } from "../lib/options.js";
import { decodeImapUtf7 } from "../lib/imapUtf7.js";

const account = document.getElementById("account");
const folderSearch = document.getElementById("folderSearch");
const folderList = document.getElementById("folderList");
const folderCurrent = document.getElementById("folderCurrent");
const tag = document.getElementById("tag");

let allFolders = [];

const labelOf = (folder) => decodeImapUtf7(folder.path ?? "");

async function save(patch) {
  const current = await getOptions(messenger.storage.local);
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

async function load() {
  const [folders, accounts, options] = await Promise.all([
    messenger.folders.query({}),
    messenger.accounts.list(),
    getOptions(messenger.storage.local),
  ]);
  allFolders = folders;

  account.innerHTML = "";
  for (const a of accounts) {
    const option = document.createElement("option");
    option.value = a.id;
    option.textContent = a.name;
    account.appendChild(option);
  }

  const current = allFolders.find((f) => f.id === options.baseFolderId);
  account.value = current?.accountId ?? accounts[0]?.id ?? "";
  fillFolderList();

  tag.value = options.tag;
  showCurrent(options.baseFolderId);
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

load();
