"use strict";const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const src=fs.readFileSync("src/operation-tabs.js","utf8");
test("real product setup links to staffing, then preview/sales, then next period",()=>{
 assert.match(src,/goods":\["operations"/);
 assert.match(src,/operations":\["run"/);
 assert.match(src,/run":\["goods"/);
 assert.match(src,/button\.addEventListener\("click",\(\)=>open\(to\)\)/);
 assert.doesNotMatch(src,/localStorage|\.cash\s*=|\.inventory\s*=/);
 assert.doesNotThrow(()=>new vm.Script(src));
});