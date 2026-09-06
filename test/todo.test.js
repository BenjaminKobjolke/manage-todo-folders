import { test } from "node:test";
import assert from "node:assert/strict";
import { pickTodoFolder, folderName } from "../lib/todo.js";

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

test("unsorted input still picks numerically next", () => {
  assert.deepEqual(pickTodoFolder([full("010"), full("002")]), { create: "011", number: "011" });
});

test("named folders count by their number prefix", () => {
  const subs = [full("012 - Steuer"), { id: "id-005", name: "005 - old task", totalMessageCount: 0 }];
  assert.equal(pickTodoFolder(subs).number, "005");
  assert.deepEqual(pickTodoFolder([full("012 - Steuer"), full("003")]), { create: "013", number: "013" });
  assert.deepEqual(pickTodoFolder([full("0123"), full("12 - x"), full("abc - 001")]), { create: "001", number: "001" });
});

test("folderName joins number and sanitised task name", () => {
  assert.equal(folderName("013", "Rechnung bezahlen"), "013 - Rechnung bezahlen");
  assert.equal(folderName("013", "  a/b\\c:d   e "), "013 - a-b-c-d e");
  assert.equal(folderName("013", ""), "013");
  assert.equal(folderName("013"), "013");
});
