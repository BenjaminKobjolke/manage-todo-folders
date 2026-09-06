const NUM = /^\d{3}$/;

// subfolders: [{ id, name, totalMessageCount }]
// Returns { existing: folder } for the first empty NNN folder, or { create: "NNN" } for the next number.
export function pickTodoFolder(subfolders) {
  const numbered = subfolders
    .filter((f) => NUM.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const empty = numbered.find((f) => f.totalMessageCount === 0);
  if (empty) return { existing: empty };
  const max = numbered.length ? Number(numbered.at(-1).name) : 0;
  return { create: String(max + 1).padStart(3, "0") };
}
