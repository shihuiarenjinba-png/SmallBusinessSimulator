"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8");
test("player sees three clear decisions, optional advanced controls and offline resources",()=>{
 const html=read("index.html"),ui=read("src/app.js");
 assert.equal((html.match(/class="step"/g)||[]).length,3);
 for(const id of ["products","coffeePrice","sandwichCard","advance","preflight","results","export","import","reset"]){
  assert.ok(html.includes('id="'+id+'"')||ui.includes('id+"Price"')||ui.includes('id+"Card"'),id);
 }
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/設備・品質投資、借入・返済（高度な設定）/);
 assert.doesNotMatch(html,/<script[^>]+src="https?:/);
});
test("invalid saved game never auto-overwrites the raw local record",()=>{
 const ui=read("src/app.js");
 assert.match(ui,/recoveryBlocked=true/);
 assert.match(ui,/if\(recoveryBlocked\)return false/);
 assert.match(ui,/先に元データを書き出しましたか/);
 assert.match(ui,/E\.nextMonth\(state,plan\(\)\)/);
});
test("welfare is only in the engine, not the visible interface",()=>{
 const html=read("index.html"),ui=read("src/app.js");
 assert.doesNotMatch(html+ui,/consumerSurplus|socialEfficiencyLoss|efficientQuantity/);
});
