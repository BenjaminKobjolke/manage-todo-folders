// "013" or "013 - Rechnung bezahlen"; the number is the first group.
const NUM = /^(\d{3})(?: - .*)?$/;
const numberOf = (folder) => folder.name.match(NUM)?.[1];

// subfolders: [{ id, name, totalMessageCount }]
// Returns { existing: folder, number } for the first empty numbered folder,
// or { create: "NNN", number: "NNN" } for the next number.
export function pickTodoFolder(subfolders) {
  const numbered = subfolders
    .filter((f) => NUM.test(f.name))
    .sort((a, b) => numberOf(a).localeCompare(numberOf(b)));
  const empty = numbered.find((f) => f.totalMessageCount === 0);
  if (empty) return { existing: empty, number: numberOf(empty) };
  const max = numbered.length ? Number(numberOf(numbered.at(-1))) : 0;
  const number = String(max + 1).padStart(3, "0");
  return { create: number, number };
}

// "013" + "Rechnung bezahlen" -> "013 - Rechnung bezahlen". Path separators are not folder-name safe.
export function folderName(number, taskName = "") {
  const clean = taskName.replace(/[\\/:]/g, "-").replace(/\s+/g, " ").trim();
  return clean ? `${number} - ${clean}` : number;
}
