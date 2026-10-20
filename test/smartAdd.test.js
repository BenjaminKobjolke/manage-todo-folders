import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenAt, suggestions, applySuggestion, isoDate } from "../lib/smartAdd.js";

test("tokenAt finds trigger words before the caret", () => {
  assert.deepEqual(tokenAt("#p", 2), { start: 0, end: 2, kind: "#", query: "p" });
  assert.deepEqual(tokenAt("hase !", 6), { start: 5, end: 6, kind: "!", query: "" });
  assert.deepEqual(tokenAt("hase ^to rest", 8), { start: 5, end: 8, kind: "^", query: "to" });
  assert.equal(tokenAt("hase", 4), null);
  assert.equal(tokenAt("a#b", 3), null);
  assert.equal(tokenAt("#p ", 3), null);
});

test("tag suggestions filter by prefix, case-insensitive", () => {
  const tags = ["money", "p_calmbase", "P_summera_ai", "shop"];
  const labels = suggestions({ kind: "#", query: "p" }, { tags }).map((s) => s.label);
  assert.deepEqual(labels, ["p_calmbase", "P_summera_ai"]);
  assert.equal(suggestions({ kind: "#", query: "p_s" }, { tags })[0].insert, "#P_summera_ai ");
});

test("priority suggestions", () => {
  const list = suggestions({ kind: "!", query: "" });
  assert.deepEqual(list.map((s) => s.insert), ["!1 ", "!2 ", "!3 ", ""]);
});

test("due suggestions from a fixed Tuesday", () => {
  const today = new Date(2026, 9, 20);
  const list = suggestions({ kind: "^", query: "" }, { today });
  assert.deepEqual(list.map((s) => s.label), [
    "Today", "Tomorrow", "Thursday", "Friday", "Saturday", "1 week", "No due date", "Calendar picker",
  ]);
  assert.equal(list[0].hint, "Oct 20");
  assert.equal(list[2].insert, "^thursday ");
  assert.equal(list[5].insert, "^2026-10-27 ");
  assert.equal(list[7].pick, "date");
  assert.equal(isoDate(new Date(2026, 0, 5)), "2026-01-05");
});

test("applySuggestion replaces the token and places the caret", () => {
  const token = tokenAt("hase #p rest", 7);
  assert.deepEqual(applySuggestion("hase #p rest", token, "#p_x "), { value: "hase #p_x rest", caret: 10 });
  assert.deepEqual(applySuggestion("hase !", tokenAt("hase !", 6), ""), { value: "hase ", caret: 5 });
});
