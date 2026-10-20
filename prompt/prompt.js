import { getOptions } from "../lib/options.js";
import { getTags } from "../lib/rtm.js";
import { tokenAt, suggestions, applySuggestion, isoDate } from "../lib/smartAdd.js";

// Selected message ids travel through the query string and back via runtime message,
// so the background event page needs no state between the menu click and the answer.
const ids = (new URLSearchParams(window.location.search).get("ids") ?? "")
  .split(",")
  .filter(Boolean)
  .map(Number);
const input = /** @type {HTMLInputElement} */ (document.getElementById("name"));
const list = document.getElementById("suggest");
const datePick = /** @type {HTMLInputElement} */ (document.getElementById("datePick"));
const tagStatus = document.getElementById("tagStatus");

let tags = [];
let items = [];
let active = 0;
// Token the date picker replaces; the caret is gone once the picker has focus.
let pickToken = null;

async function loadTags(force = false) {
  const o = await getOptions(messenger.storage.local);
  if (!o.rtmToken) return;
  try {
    ({ names: tags } = await getTags({ apiKey: o.rtmApiKey, secret: o.rtmSecret, token: o.rtmToken }, messenger.storage.local, { force }));
    if (force) tagStatus.textContent = `${tags.length} tags`;
  } catch (error) {
    tagStatus.textContent = error.message;
  }
}

const close = () => {
  list.hidden = true;
  items = [];
};

function render() {
  const token = tokenAt(input.value, input.selectionStart ?? input.value.length);
  items = suggestions(token, { tags }).map((s) => ({ ...s, token }));
  if (!items.length) return close();
  active = Math.min(active, items.length - 1);
  list.innerHTML = "";
  items.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = index === active ? "active" : "";
    li.textContent = item.label;
    if (item.hint) {
      const hint = document.createElement("span");
      hint.className = "hint";
      hint.textContent = item.hint;
      li.appendChild(hint);
    }
    // mousedown, not click: click fires after the input lost focus.
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      accept(item);
    });
    list.appendChild(li);
  });
  list.hidden = false;
  list.children[active].scrollIntoView({ block: "nearest" });
}

function insert(token, text) {
  const { value, caret } = applySuggestion(input.value, token, text);
  input.value = value;
  input.focus();
  input.setSelectionRange(caret, caret);
  active = 0;
  render();
}

function accept(item) {
  if (item.pick === "date") {
    pickToken = item.token;
    close();
    datePick.showPicker();
    return;
  }
  insert(item.token, item.insert);
}

datePick.addEventListener("change", () => {
  if (datePick.value && pickToken) insert(pickToken, `^${datePick.value} `);
});
datePick.min = isoDate(new Date());

async function submit() {
  const name = input.value.trim();
  if (!name) return;
  await messenger.runtime.sendMessage({ type: "create-todo", name, ids });
  window.close();
}

input.addEventListener("input", () => {
  active = 0;
  render();
});
input.addEventListener("click", render);
input.addEventListener("blur", close);

document.getElementById("ok").addEventListener("click", submit);
document.getElementById("cancel").addEventListener("click", () => window.close());
document.getElementById("refreshTags").addEventListener("click", async () => {
  tagStatus.textContent = "Loading...";
  await loadTags(true);
  input.focus();
});

document.addEventListener("keydown", (e) => {
  if (e.target === input && items.length) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      render();
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      accept(items[active]);
      return;
    }
    if (e.key === "Escape") return close();
  }
  if (e.target === datePick) return;
  if (e.key === "Enter") submit();
  if (e.key === "Escape") window.close();
});

// Arrow left/right and Home/End move the caret into or out of a token.
input.addEventListener("keyup", (e) => {
  if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) render();
});

loadTags();
