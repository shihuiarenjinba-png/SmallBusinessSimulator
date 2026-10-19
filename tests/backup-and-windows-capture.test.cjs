"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const app=fs.readFileSync("src/app.js","utf8"),screen=fs.readFileSync("scripts/capture-windows-ui.cjs","utf8");
test("an existing unrelated monthly backup cannot be overwritten during migration",()=>{
 const a=app.indexOf("function protectLegacyBackup(raw){"),b=app.indexOf("function init(){",a);
 assert.ok(a>0&&b>a);
 const storage=new Map(),key="old-backup";
 const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,v)};
 const fn=new Function("localStorage","BACKUP",app.slice(a,b)+"return protectLegacyBackup;")(localStorage,key);
 assert.throws(()=>fn(null),/原本/);
 assert.equal(fn("legacy-one"),true);
 assert.equal(storage.get(key),"legacy-one");
 assert.equal(fn("legacy-one"),true);
 assert.throws(()=>fn("legacy-two"),/上書き/);
 assert.equal(storage.get(key),"legacy-one");
 assert.match(app,/const candidate=D\.start\(state\); \/\/ validate conversion before editing any storage key/);
});
test("Edge capture helper is local-only, captures tab views, never clicks game decisions",()=>{
 assert.doesNotThrow(()=>new vm.Script(screen));
 for(const project of ["SmallBusinessSimulator","UsedItemShopSimulator",
  "FactoryInspectionSimulator","NightOfficeAuditor","game-stadium","game-new","finance-simulation"])
  assert.match(screen,new RegExp(project.replace(/[-]/g,"\\-")));
 assert.match(screen,/Page\.captureScreenshot/);
 assert.match(screen,/remote-debugging-port=0/);
 assert.match(screen,/edgeProcess\.kill\(\)/);
 assert.doesNotMatch(screen,/npm install|shell\.openExternal|https:\/\/|child_process\.exec\(/);
});
