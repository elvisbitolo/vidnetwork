import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scoreMatch,
  rankResults,
  buildAutocompleteSuggestions,
  parseSearchQuery,
} from "../search-engine.js";

test("scoreMatch: exact, prefix, word-boundary, contains, partial and none", () => {
  assert.equal(scoreMatch("yarn", "YARN"), 100);
  assert.equal(scoreMatch("yarn", "yarnclub"), 80);
  assert.equal(scoreMatch("club", "The Yarn Club"), 60);
  assert.equal(scoreMatch("arn", "Yarn"), 40);
  assert.equal(scoreMatch("klb", "Knitting club lounge"), 20);
  assert.equal(scoreMatch("zzz", "something"), 0);
});

test("scoreMatch: escapes regex special characters safely", () => {
  assert.equal(scoreMatch("c++", "learn c++"), 40);
  assert.equal(scoreMatch("(a)", "text (a) here"), 40);
  assert.doesNotThrow(() => scoreMatch(".*+?^${}()|[]\\", "anything"));
});

test("scoreMatch: empty query or non-string text scores 0", () => {
  assert.equal(scoreMatch("", "anything"), 0);
  assert.equal(scoreMatch("  ", "anything"), 0);
  assert.equal(scoreMatch("abc", null), 0);
  assert.equal(scoreMatch("abc", 123), 0);
});

test("rankResults: sorts by score descending and filters non-matches", () => {
  const items = [
    { id: "a", name: "Yarn Club" },
    { id: "b", name: "Knit Yarn" },
    { id: "c", name: "Sewing" },
    { id: "d", name: "Yarn" },
    { id: "e", name: "A fully Yarn thing" },
  ];
  const ranked = rankResults("yarn", items, (i) => i.name);
  assert.deepEqual(ranked.map((r) => r.id), ["d", "a", "b", "e"]);
  assert.equal(ranked.length, 4);
  assert.equal(ranked[0]._score, 100);
});

test("rankResults: supports array text getters and stable ordering for ties", () => {
  const items = [{ id: "x", name: "Fan", username: "yarnfan" }];
  const ranked = rankResults("yarn", items, (i) => [i.username, i.name]);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0]._score, 80);
});

test("buildAutocompleteSuggestions: returns top 8 with type/id/label/subtitle", () => {
  const members = [{ id: "m1", name: "Yarn Weaver", username: "yw" }];
  const spaces = [{ id: "s1", name: "Yarn Space", slug: "yarn-space" }];
  const courses = [{ id: "c1", title: "Yarn 101" }];
  const events = [{ id: "e1", title: "Knit Yarn Night" }];
  const sug = buildAutocompleteSuggestions("yarn", members, spaces, courses, events);
  assert.equal(sug.length, 4);
  assert.equal(sug[0].type, "member");
  assert.equal(sug[0].label, "Yarn Weaver");
  assert.equal(sug[0].subtitle, "@yw");
  assert.equal(sug[1].type, "space");
  assert.equal(sug[1].slug, "yarn-space");
  assert.equal(sug[2].type, "course");
  assert.equal(sug[3].type, "event");
});

test("buildAutocompleteSuggestions: caps at 8, drops empty and non-matching entries", () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, name: `Yarn ${i}` }));
  const empty = buildAutocompleteSuggestions("zzz-no-match", many, []);
  assert.equal(empty.length, 0);
  const capped = buildAutocompleteSuggestions("yarn", many, []);
  assert.equal(capped.length, 8);
});

test("parseSearchQuery: trims, lowercases and tokenizes", () => {
  assert.deepEqual(parseSearchQuery("  Hello   WORLD  "), {
    tokens: ["hello", "world"],
    phrase: "hello world",
  });
  assert.deepEqual(parseSearchQuery(""), { tokens: [], phrase: "" });
  assert.deepEqual(parseSearchQuery(null), { tokens: [], phrase: "" });
});
