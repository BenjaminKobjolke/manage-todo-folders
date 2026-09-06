// Selected message ids travel through the query string and back via runtime message,
// so the background event page needs no state between the menu click and the answer.
const ids = (new URLSearchParams(window.location.search).get("ids") ?? "")
  .split(",")
  .filter(Boolean)
  .map(Number);
const input = document.getElementById("name");

async function submit() {
  const name = input.value.trim();
  if (!name) return;
  await messenger.runtime.sendMessage({ type: "create-todo", name, ids });
  window.close();
}

document.getElementById("ok").addEventListener("click", submit);
document.getElementById("cancel").addEventListener("click", () => window.close());
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submit();
  if (e.key === "Escape") window.close();
});
