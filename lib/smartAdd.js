// Autocomplete for the RTM Smart Add operators #tag, !priority and ^due in the Create ToDo prompt. Pure.
const TRIGGERS = "#!^";
const MAX_TAGS = 10;

// Word before the caret starting with a trigger char, at the start or after whitespace; else null.
export function tokenAt(value, caret) {
  const before = value.slice(0, caret);
  const match = /(^|\s)([#!^])(\S*)$/.exec(before);
  if (!match) return null;
  const start = caret - match[2].length - match[3].length;
  return { start, end: caret, kind: match[2], query: match[3] };
}

const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const pad = (n) => String(n).padStart(2, "0");
export const isoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const shortDate = (date) => date.toLocaleDateString("en", { month: "short", day: "numeric" });
const weekday = (date) => date.toLocaleDateString("en", { weekday: "long" });

function dueSuggestions(today) {
  const day = (offset, label, insert) => {
    const date = addDays(today, offset);
    return { label, hint: shortDate(date), insert: insert ?? `^${label.toLowerCase()} ` };
  };
  const week = addDays(today, 7);
  return [
    day(0, "Today"),
    day(1, "Tomorrow"),
    ...[2, 3, 4].map((offset) => day(offset, weekday(addDays(today, offset)))),
    // Single ISO token: a multi-word "^1 week" would let RTM's date parser swallow following words.
    { label: "1 week", hint: shortDate(week), insert: `^${isoDate(week)} ` },
    { label: "No due date", hint: "Never", insert: "" },
    { label: "Calendar picker", pick: "date" },
  ];
}

// [{ label, hint?, insert?, pick? }] for a token from tokenAt().
export function suggestions(token, { tags = [], today = new Date() } = {}) {
  if (!token || !TRIGGERS.includes(token.kind)) return [];
  if (token.kind === "#") {
    const needle = token.query.toLowerCase();
    return tags
      .filter((name) => name.toLowerCase().startsWith(needle))
      .slice(0, MAX_TAGS)
      .map((name) => ({ label: name, insert: `#${name} ` }));
  }
  if (token.kind === "!") {
    return [
      ...[1, 2, 3].map((n) => ({ label: `Priority ${n}`, insert: `!${n} ` })),
      { label: "No Priority", insert: "" },
    ];
  }
  return dueSuggestions(today);
}

export function applySuggestion(value, token, insert) {
  const rest = value.slice(token.end);
  // insert ends with a space; drop the one already following the token so none doubles up.
  const tail = insert && rest.startsWith(" ") ? rest.slice(1) : rest;
  return { value: value.slice(0, token.start) + insert + tail, caret: token.start + insert.length };
}
