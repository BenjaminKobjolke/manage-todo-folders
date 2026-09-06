import { test } from "node:test";
import assert from "node:assert/strict";
import { pickTodoFolder } from "../lib/todo.js";

const full = (name) => ({ id: `id-${name}`, name, totalMessageCount: 3 });

test("no numbered subfolders -> create 001", () => {
  assert.deepEqual(pickTodoFolder([{ id: "x", name: "Archive", totalMessageCount: 0 }]), { create: "001" });
});

test("001..009 all full -> create 010", () => {
  const subs = Array.from({ length: 9 }, (_, i) => full(String(i + 1).padStart(3, "0")));
  assert.deepEqual(pickTodoFolder(subs), { create: "010" });
});

test("first empty numbered folder is reused", () => {
  const subs = [full("001"), full("002"), { id: "id-003", name: "003", totalMessageCount: 0 }, full("004")];
  assert.equal(pickTodoFolder(subs).existing.id, "id-003");
});

test("unsorted input still picks numerically next", () => {
  assert.deepEqual(pickTodoFolder([full("010"), full("002")]), { create: "011" });
});
