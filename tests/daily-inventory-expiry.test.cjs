"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const E=require("../src/economy.js"),D=require("../src/daily-store.js");
const plan=s=>D.defaultPlan(s);
test("new daily store and old monthly economy stay separate, reproducible and compatible",()=>{
 const a=E.initial(101);
 assert.equal(E.nextMonth(a,E.defaultPlan(a)).state.month,2);
 let s=D.start(a);assert.equal(s.daily.day,1);
 const base=E.validate(s);assert.equal(base.month,1);assert.equal(base.daily,undefined);
 assert.deepEqual(D.restore(base,JSON.parse(JSON.stringify(s.daily))),s);
 const q=plan(s);q.products.coffee.order=50;
 assert.deepEqual(D.advance(s,q),D.advance(D.start(E.initial(101)),q));
});
test("manual restock adds stock and purchase is charged exactly once",()=>{
 const s=D.start(E.initial(200)),p=plan(s);p.products.coffee.order=150;
 const out=D.advance(s,p);assert.equal(out.report.received,150);
 assert.equal(out.report.costs.procurement,30000);
 assert.equal(out.state.daily.day,2);
 assert.equal(out.state.daily.lots.coffee.reduce((z,x)=>z+x.qty,0),out.state.products.coffee.inventory);
 assert.equal(s.daily.day,1);assert.equal(s.cash,E.RULES.startingCash);
});
test("zero purchases when out of stock means zero sales; next-day restock can recover",()=>{
 let s=D.start(E.initial(201)),p=plan(s);
 let r=D.advance(s,p);assert.equal(r.report.sold,0);s=r.state;
 p=plan(s);p.products.coffee.order=100;r=D.advance(s,p);
 assert.ok(r.report.sold>0);assert.ok(r.report.byProduct.coffee.remaining>=0);
});
test("expiry lots disappear at end of shelf life and cannot sell after expiry",()=>{
 let s=D.start(E.initial(333)),p=plan(s);p.products.coffee.order=50;p.products.coffee.price=9999;
 let expired=0;for(let i=0;i<D.LIFE.coffee;i++){
  const out=D.advance(s,p);s=out.state;expired+=out.report.expired;p.products.coffee.order=0;
 }
 assert.equal(expired,50);assert.equal(s.products.coffee.inventory,0);
 assert.equal(s.daily.lots.coffee.length,0);
 const r=D.advance(s,p);assert.equal(r.report.sold,0);
});
test("discounted goods earn actual clearance price, not the undiscounted tag price",()=>{
 let s=D.start(E.initial(14)),p=plan(s);
 p.products.coffee.order=100;p.products.coffee.price=800;p.products.coffee.discount=50;
 const out=D.advance(s,p);
 assert.equal(out.report.byProduct.coffee.revenue,out.report.byProduct.coffee.sold*400);
 assert.equal(out.report.discounted,out.report.sold);
});
test("automatic markdown fee occurs only once in each month and FIFO expiry stays valid",()=>{
 let s=D.start(E.initial(45)),p=plan(s);p.products.coffee.order=1000;p.products.coffee.price=1400;
 p.automation=true;p.threshold=3;p.percent=20;
 let fees=0,discounted=0,days=0;
 for(let i=0;i<30;i++){
  const out=D.advance(s,p);s=out.state;fees+=out.report.costs.automationFee;
  discounted+=out.report.discounted;days++;p.products.coffee.order=0;
 }
 assert.equal(days,30);assert.equal(fees,D.AUTO_FEE);assert.ok(discounted>0);
 assert.equal(s.month,2);assert.equal(s.daily.day,1);assert.equal(s.daily.automationPaid,false);
 // Persistent opt-in is charged only when the next month is played.
 assert.equal(D.quote(s,p).automationFee,D.AUTO_FEE);
});
test("reserve gate protects money and rejects tampered day, lots and overdraft",()=>{
 const s=D.start(E.initial(17)),p=plan(s);
 p.products.coffee.order=5000;p.equipmentUpgrade=true;assert.throws(()=>D.advance(s,p),/資金/);
 assert.equal(s.products.coffee.inventory,0);
 const a=JSON.parse(JSON.stringify(s));a.daily.day=31;
 assert.throws(()=>D.restore(a,a.daily),/日/);
 const bb=JSON.parse(JSON.stringify(s));bb.daily.lots.coffee=[{qty:8,days:1}];
 assert.throws(()=>D.restore(bb,bb.daily),/一致/);
});
test("staff, equipment, and training still change output in daily mode",()=>{
 let s=D.start(E.initial(12)),p=plan(s);
 p.products.coffee.order=200;p.equipmentUpgrade=true;p.qualityUpgrade=true;
 const result=D.advance(s,p);
 assert.equal(result.state.equipment,1);assert.equal(result.state.quality,1);
 assert.equal(result.report.costs.equipment,E.RULES.equipmentCost);
 assert.equal(result.report.costs.quality,E.RULES.qualityCost);
 assert.equal(result.state.cash,s.cash+p.borrow-result.report.costs.expense+result.report.revenue);
});
test("30 daily ticks close exactly one month and preserve safe saved history",()=>{
 let s=D.start(E.initial(37)),p=plan(s);
 for(let i=0;i<30;i++){const out=D.advance(s,p);s=out.state;
  assert.equal(E.validate(s).history.length,Math.floor(i/30)+ (i===29?1:0));
 }
 assert.equal(s.month,2);assert.equal(s.history.length,1);
 assert.equal(s.daily.day,1);assert.deepEqual(D.restore(s,s.daily),s);
});

test("7-day batching purchases and financing apply only on day one, month end is hard stop",()=>{
 let start=D.start(E.initial(415)),p=plan(start);
 p.products.coffee.order=150;p.products.coffee.discount=20;p.borrow=200000;
 const fast=D.advanceDays(start,p,7);
 let manual=start,day=0,first=plan(manual);
 for(;day<7;day++){
  const current=JSON.parse(JSON.stringify(p));
  if(day){current.products.coffee.order=0;current.borrow=0;current.repay=0;
   current.unlockSandwich=false;current.equipmentUpgrade=false;current.qualityUpgrade=false;current.staffTraining=false;}
  manual=D.advance(manual,current).state;
 }
 assert.deepEqual(fast.state,manual);
 assert.equal(fast.report.daysProcessed,7);
 assert.equal(fast.report.received,150);
 assert.equal(fast.state.debt,200000);
 assert.equal(start.month,1);
 // A batch cannot continue past the end of a month.
 let near=D.start(E.initial(29));
 for(let i=0;i<28;i++)near=D.advance(near,plan(near)).state;
 const close=D.advanceDays(near,plan(near),7);
 assert.equal(close.report.daysProcessed,2);
 assert.equal(close.state.month,2);
 assert.equal(close.state.daily.day,1);
 assert.equal(close.state.history.length,1);
});
