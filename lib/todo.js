// "013" or "013 - Rechnung bezahlen"; the number is the first group.
const NUM = /^(\d{3})(?: - .*)?$/;
const numberOf = (folder) => folder.name.match(NUM)?.[1];

// An empty folder is safe to reuse or delete only after a successful sync and when it has no children.
export function emptyTodoFolders(subfolders) {
  return subfolders
    .filter((folder) => NUM.test(folder.name) && folder.totalMessageCount === 0 && folder.synced !== false && !folder.subFolders?.length)
    .sort((a, b) => numberOf(a).localeCompare(numberOf(b)));
}

// Returns the first safe empty numbered folder, or the lowest positive number not already in use.
export function pickTodoFolder(subfolders) {
  const numbered = subfolders
    .filter((f) => NUM.test(f.name))
    .sort((a, b) => numberOf(a).localeCompare(numberOf(b)));
  const empty = emptyTodoFolders(subfolders)[0];
  if (empty) return { existing: empty, number: numberOf(empty) };
  const usedNumbers = new Set(numbered.map(numberOf));
  let nextNumber = 1;
  while (usedNumbers.has(String(nextNumber).padStart(3, "0"))) nextNumber += 1;
  const number = String(nextNumber).padStart(3, "0");
  return { create: number, number };
}

// "013" + "Rechnung bezahlen" -> "013 - Rechnung bezahlen". Path separators are not folder-name safe.
export function folderName(number, taskName = "") {
  const clean = taskName.replace(/[\\/:]/g, "-").replace(/\s+/g, " ").trim();
  return clean ? `${number} - ${clean}` : number;
}
