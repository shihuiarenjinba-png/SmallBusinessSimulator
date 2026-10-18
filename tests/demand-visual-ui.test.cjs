const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const app=fs.readFileSync("src/app.js","utf8"),css=fs.readFileSync("styles.css","utf8");
test("forecast bars compare real supply and forecast, with no sales guarantee",()=>{
 assert.match(app,/id\+"DemandBars"/);
 assert.match(app,/function demandBars\(id,forecast,planned\)/);
 assert.match(app,/state\.products\[id\]\.inventory\+planned\.products\[id\]\.order/);
 assert.match(app,/demandBars\(id,f,p\)/);
 assert.match(app,/売上・販売数の保証ではありません/);
 assert.match(app,/在庫不足の可能性|売れ残りの可能性/);
});
