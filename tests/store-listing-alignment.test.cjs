"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Store review brief describes the current 180-day daily game", () => {
  const brief = fs.readFileSync(path.join(__dirname, "../store/PRODUCT_BRIEF_JA.md"), "utf8");
  assert.match(brief, /180日/);
  assert.match(brief, /30日ごとに月次/);
  assert.match(brief, /コーヒー/);
  assert.match(brief, /サンドイッチ/);
  assert.match(brief, /賞味期限/);
  assert.match(brief, /1日または7日/);
  assert.doesNotMatch(brief, /120か月|12年/);
});
