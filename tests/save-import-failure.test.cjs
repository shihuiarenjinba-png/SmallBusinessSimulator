"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const E=require("../src/economy.js"),D=require("../src/daily-store.js");
const app=fs.readFileSync("src/app.js","utf8");
const begin=app.indexOf("async function importSave(file){"),end=app.indexOf("\nfunction protectLegacyBackup",begin);
assert.ok(begin>0&&end>begin,"sale-save importer must exist");
const importer=app.slice(begin,end);
function launch(readOnly=false){
 const KEY="small-business-simulator-v1",prior=D.start(E.initial(71));
 const original=JSON.stringify(prior),saved=new Map([[KEY,original]]),alerts=[];
 const storage={getItem:k=>saved.get(k)??null,
  setItem(k,v){if(readOnly)throw Error("test: storage unavailable");saved.set(k,v);}};
 let rendered=0;
 const make=new Function("E","D","localStorage","KEY","confirm","alert","redraw","start",
  `let state=start,recoveryBlocked=false,corruptRaw=null,latest=null,notice="";`+
  importer+`return {importSave,getState:()=>state};`);
 const game=make(E,D,storage,KEY,()=>true,msg=>alerts.push(msg),()=>{rendered++;},prior);
 const next=E.initial(99),data={schema:E.VERSION,state:next},raw=JSON.stringify(data);
 return {game,prior,next,saved,original,alerts,rendered:()=>rendered,file:{size:raw.length,text:async()=>raw}};
}
test("storage failure during import keeps existing business state and save unchanged",async()=>{
 const h=launch(true);await h.game.importSave(h.file);
 assert.deepEqual(h.game.getState(),h.prior);
 assert.equal(h.saved.get("small-business-simulator-v1"),h.original);
 assert.equal(h.rendered(),0);assert.equal(h.alerts.length,1);
});
test("a valid import changes the saved state and memory only after persistence",async()=>{
 const h=launch();await h.game.importSave(h.file);
 assert.deepEqual(h.game.getState(),h.next);
 assert.deepEqual(JSON.parse(h.saved.get("small-business-simulator-v1")),h.next);
 assert.equal(h.rendered(),1);assert.equal(h.alerts.length,0);
});
