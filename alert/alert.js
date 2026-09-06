document.getElementById("message").textContent =
  new URLSearchParams(window.location.search).get("message") ?? "";
document.getElementById("ok").addEventListener("click", () => window.close());
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === "Escape") window.close();
});
