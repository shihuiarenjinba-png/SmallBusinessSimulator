"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const E=require("../src/economy.js"),D=require("../src/daily-store.js");

test("twenty 180-day store campaigns maintain inventory, cash and month accounting",()=>{
 for(let seed=1;seed<=20;seed++){
  let s=D.start(E.initial(seed));
  for(let day=1;day<=180;day++){
   const p=D.defaultPlan(s);
   p.products.coffee.price=650;
   p.products.coffee.order=25;
   p.automation=day>10;p.threshold=3;p.percent=20;
   const out=D.advance(s,p);
   assert.equal(out.state.cash,s.cash+p.borrow-out.report.costs.expense+out.report.revenue);
   assert.equal(out.state.daily.lots.coffee.reduce((v,l)=>v+l.qty,0),out.state.products.coffee.inventory);
   assert.ok(out.report.sold>=0&&out.report.expired>=0);
   s=out.state;
   if(day%30===0){
    assert.equal(s.history.length,day/30);
    assert.equal(s.daily.day,1);
    assert.deepEqual(D.restore(JSON.parse(JSON.stringify(s)),s.daily),s);
   }
  }
  assert.equal(s.month,7);
  assert.ok(s.cash>=0);
 }
});

test("7-day skip has the same economic state as seven explicit days with first-day-only decisions",()=>{
 for(let seed=1;seed<=20;seed++){
  let base=D.start(E.initial(seed));
  const p=D.defaultPlan(base);
  p.products.coffee.order=15+seed;
  p.products.coffee.discount=seed%2===0?20:50;
  p.automation=true;p.percent=20;
  p.borrow=seed%3===0?150000:0;
  const all=D.advanceDays(base,p,7);
  let manual=base;
  for(let i=0;i<7;i++){
   const step=JSON.parse(JSON.stringify(p));
   if(i>0){
    step.products.coffee.order=0;step.products.sandwich.order=0;
    step.borrow=0;step.repay=0;step.equipmentUpgrade=false;
    step.qualityUpgrade=false;step.staffTraining=false;step.unlockSandwich=false;
   }
   manual=D.advance(manual,step).state;
  }
  assert.deepEqual(all.state,manual);
  assert.equal(all.report.received,p.products.coffee.order);
  assert.equal(all.report.daysProcessed,7);
 }
});
