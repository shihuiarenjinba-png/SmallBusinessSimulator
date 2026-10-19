"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const ps=fs.readFileSync("scripts/run-seven-game-windows-qa.ps1","utf8");
const capture=fs.readFileSync("scripts/capture-windows-ui.cjs","utf8");
test("seven-game local QA audits named branches without modifying source repositories",()=>{
 for(const name of ["SmallBusinessSimulator","UsedItemShopSimulator","FactoryInspectionSimulator",
  "NightOfficeAuditor","game-stadium","game-new","finance-simulation"])
   assert.ok(ps.includes('"'+name+'"'),"missing "+name);
 assert.match(ps,/git -C \$directory status --porcelain/);
 assert.match(ps,/workingTreeClean/);
 for(const forbidden of [/git -C \$directory checkout/,/git -C \$directory reset/,/git -C \$directory clean/,/npm\.cmd install/,/gh repo delete/,/Remove-Item.*\$directory/])
  assert.doesNotMatch(ps,forbidden);
 assert.match(ps,/SEVEN_GAME_QA_MANIFEST\.json/);
 assert.match(ps,/windows-edge-gameplay\.cjs/);
});
test("Edge screenshots reject incorrect screen selection, JS errors, and horizontal overflow",()=>{
 for(const evidence of ["activeTabIsSelected","wrongVisibleCount","visibleTargetCount","Runtime.exceptionThrown","inspected.horizontalOverflow"])
  assert.ok(capture.includes(evidence),"missing "+evidence);
 assert.match(capture,/Page\.captureScreenshot/);
 assert.match(capture,/errors\.concat\(runtimeErrors\)/);
});
