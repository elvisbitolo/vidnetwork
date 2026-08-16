import { test } from "node:test";
import assert from "node:assert";
import { regionKeyFor, regionChatId } from "../region.js";

test("regionKeyFor builds a region key from country and state", () => {
  assert.equal(regionKeyFor("United States", "Texas"), "Texas, United States");
  assert.equal(regionKeyFor("Nigeria", ""), "Nigeria");
  assert.equal(regionKeyFor("", "Lagos"), "Lagos");
  assert.equal(regionKeyFor("", ""), "");
  assert.equal(regionKeyFor("  France  ", "  "), "France");
});

test("regionChatId is stable and deterministic", () => {
  assert.equal(regionChatId("Texas, United States"), "region__texas-united-states");
  assert.equal(regionChatId("Texas, United States"), regionChatId("Texas, United States"));
  assert.equal(regionChatId("Nigeria"), "region__nigeria");
  assert.equal(regionChatId(""), "region__unknown");
});
