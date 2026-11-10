import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyTodoFolders, pickTodoFolder, folderName } from "../lib/todo.js";

const full = (name) => ({ id: `id-${name}`, name, totalMessageCount: 3 });

test("no numbered subfolders -> create 001", () => {
  assert.deepEqual(pickTodoFolder([{ id: "x", name: "Archive", totalMessageCount: 0 }]), { create: "001", number: "001" });
});

test("001..009 all full -> create 010", () => {
  const subs = Array.from({ length: 9 }, (_, i) => full(String(i + 1).padStart(3, "0")));
  assert.deepEqual(pickTodoFolder(subs), { create: "010", number: "010" });
});

test("first empty numbered folder is reused", () => {
  const subs = [full("001"), full("002"), { id: "id-003", name: "003", totalMessageCount: 0 }, full("004")];
  const pick = pickTodoFolder(subs);
  assert.equal(pick.existing.id, "id-003");
  assert.equal(pick.number, "003");
});

test("unsorted input still fills the lowest unused number", () => {
  assert.deepEqual(pickTodoFolder([full("010"), full("002")]), { create: "001", number: "001" });
});

test("named folders count by their number prefix", () => {
  const subs = [full("012 - Steuer"), { id: "id-005", name: "005 - old task", totalMessageCount: 0 }];
  assert.equal(pickTodoFolder(subs).number, "005");
  assert.deepEqual(pickTodoFolder([full("012 - Steuer"), full("003")]), { create: "001", number: "001" });
  assert.deepEqual(pickTodoFolder([full("0123"), full("12 - x"), full("abc - 001")]), { create: "001", number: "001" });
});

test("emptyTodoFolders returns only synced empty numbered folders without children, sorted by number", () => {
  const folders = [
    { id: "004", name: "004 - later", totalMessageCount: 0, synced: true, subFolders: [] },
    { id: "archive", name: "Archive", totalMessageCount: 0, synced: true, subFolders: [] },
    { id: "003", name: "003", totalMessageCount: 0, synced: false, subFolders: [] },
    { id: "002", name: "002", totalMessageCount: 0, synced: true, subFolders: [{ id: "child" }] },
    { id: "001", name: "001", totalMessageCount: 0, subFolders: [] },
    { id: "005", name: "005", totalMessageCount: 1, synced: true, subFolders: [] },
  ];

  assert.deepEqual(emptyTodoFolders(folders).map(({ id }) => id), ["001", "004"]);
});

test("pickTodoFolder uses the first eligible empty folder and fills numbering gaps", () => {
  const folders = [full("004"), full("002"), full("001")];
  assert.deepEqual(pickTodoFolder(folders), { create: "003", number: "003" });
  assert.deepEqual(pickTodoFolder([]), { create: "001", number: "001" });
  assert.deepEqual(pickTodoFolder([full("001"), full("002"), full("003")]), { create: "004", number: "004" });
});

test("folderName joins number and sanitised task name", () => {
  assert.equal(folderName("013", "Rechnung bezahlen"), "013 - Rechnung bezahlen");
  assert.equal(folderName("013", "  a/b\\c:d   e "), "013 - a-b-c-d e");
  assert.equal(folderName("013", ""), "013");
  assert.equal(folderName("013"), "013");
});
