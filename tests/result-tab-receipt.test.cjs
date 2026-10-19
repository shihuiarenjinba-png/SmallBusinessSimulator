"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const html=fs.readFileSync("index.html","utf8");
const app=fs.readFileSync("src/app.js","utf8");
const css=fs.readFileSync("daily-store.css","utf8");
test("the delivery conveyor belongs to the visible result panel, not inventory planning",()=>{
 const results=html.indexOf('<h2>経営の結果</h2>');
 const belt=html.indexOf('id="deliveryBelt"');
 const inventory=html.indexOf('id="products"');
 assert.ok(results>inventory);
 assert.ok(belt>results);
 assert.equal((html.match(/id="deliveryBelt"/g)||[]).length,1);
 assert.match(html,/id="deliveryBelt"[^>]*hidden/);
 assert.match(html,/id="deliveryReceipt"/);
 assert.match(css,/\.delivery-belt\[hidden\]\{display:none!important\}/);
});
test("confirmed receipt, not a speculative order, determines illustration and amount",()=>{
 assert.match(app,/const received=wasDaily\?latest\.received:0/);
 assert.match(app,/deliveryBelt"\)\.hidden=received===0/);
 assert.match(app,/deliveryReceipt"\)\.textContent=received>0/);
 assert.match(app,/OperationTabs\?\.open\("run"\)/);
 assert.match(app,/input,select/);
 assert.doesNotMatch(app,/setInterval|fetch\(/);
});