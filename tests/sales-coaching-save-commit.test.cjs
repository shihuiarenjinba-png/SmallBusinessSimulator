"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const E=require("../src/economy.js"),D=require("../src/daily-store.js");
const source=fs.readFileSync("src/app.js","utf8");
function fn(name,next){const start=source.indexOf("function "+name+"("),end=source.indexOf("function "+next+"(",start);assert.ok(start>0&&end>start,"missing "+name);return source.slice(start,end);}
const advanceSource=fn("advance","download"),resultsSource=fn("results","demandBars");
function sales(failStorage){
 const state=D.start(E.initial(321)),disk=new Map([["small-business-simulator-v1",JSON.stringify(state)]]);
 let redrawCount=0;const elem={dataset:{},setAttribute(){}};
 const elements={deliveryBelt:{...elem},deliveryReceipt:{textContent:""},results:{scrollIntoView(){}}};
 const plan=()=>{const v=D.defaultPlan(state);v.products.coffee.order=15;return v;};
 const make=new Function("E","D","localStorage","plan","initial","elements","onRedraw",`
  const KEY="small-business-simulator-v1";
  let state=initial,latest=null,notice="";
  const daily=()=>!!state.daily;
  const $=id=>elements[id];
  const renderStats=()=>{},preflight=()=>{},redraw=onRedraw;
  const yen=n=>String(n)+"円";
  const window={OperationTabs:{open(){}}};
  `+advanceSource+`
  return {advance,getState:()=>state,getLatest:()=>latest,getNotice:()=>notice};
 `);
 const storage={setItem(k,v){if(failStorage)throw Error("test: disk full");disk.set(k,v);},getItem:k=>disk.get(k)};
 const game=make(E,D,storage,plan,state,elements,()=>{redrawCount++});
 return{state,disk,game,redrawCount:()=>redrawCount};
}
test("completed business day is stored before cash/inventory/day changes",()=>{
 const h=sales(false),original=h.disk.get("small-business-simulator-v1");
 h.game.advance();
 assert.notEqual(h.disk.get("small-business-simulator-v1"),original);
 assert.equal(h.game.getState().daily.day,2);
 assert.equal(h.redrawCount(),1);
});
test("disk error cancels the business day instead of silently advancing",()=>{
 const h=sales(true),original=h.disk.get("small-business-simulator-v1");
 h.game.advance();
 assert.equal(h.disk.get("small-business-simulator-v1"),original);
 assert.deepEqual(h.game.getState(),h.state);
 assert.equal(h.game.getLatest(),null);
 assert.equal(h.redrawCount(),0);
 assert.match(h.game.getNotice(),/test: disk full/);
});
test("outcome panel offers a concrete next action rather than only numerical results",()=>{
 const cash={results:{children:[],replaceChildren(){this.children=[];},append(node){this.children.push(node);}},
  deliveryBelt:{hidden:false,dataset:{}}};
 const sample=D.advance(D.start(E.initial(600)),D.defaultPlan(D.start(E.initial(600)))).report;
 const element=(tag,text,cls)=>({tag,textContent:text||"",className:cls,children:[],append(...items){this.children.push(...items)}});
 const make=new Function("state","latest","elements","element",`
 const $=key=>elements[key],daily=()=>!!state.daily,yen=n=>Math.round(n)+"円";
 `+resultsSource+`results();`);
 make(D.start(E.initial(600)),sample,cash,element);
 const all=cash.results.children.filter(n=>n.textContent.startsWith("次の一手："));
 assert.equal(all.length,1);
 assert.match(all[0].textContent,/次回|在庫|仕入|価格|売上|赤字|値付け|廃棄/);
});
