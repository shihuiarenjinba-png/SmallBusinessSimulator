"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),E=require("../src/economy.js");
const normal=s=>E.defaultPlan(s);
test("state validates and defaults stay reproducible",()=>{
 const a=E.createInitialState(31415),b=E.createInitialState(31415);
 assert.deepEqual(a,b);assert.deepEqual(E.validateState(a),a);
 assert.deepEqual(E.nextMonth(a,normal(a)),E.nextMonth(b,normal(b)));
});
test("higher selling price never increases demand with other factors held fixed",()=>{
 for(let month=1;month<=24;month++)for(const id of Object.keys(E.CATALOG)){
  const s=E.createInitialState(700+month);s.month=month;
  s.history=Array.from({length:month-1},(_,i)=>({month:i+1,revenue:0,profit:0,cash:100,sold:0}));
  const low=E.demandDetail(s,id,500,10000).quantity,high=E.demandDetail(s,id,1200,10000).quantity;
  assert.ok(low>=high,id+" / "+month);
 }
});
test("sales never exceed stock, demand or staffed capacity",()=>{
 const s=E.createInitialState(11),p=normal(s);p.products.coffee.order=10;
 const {report,state}=E.nextMonth(s,p);const coffee=report.byProduct.coffee;
 assert.ok(coffee.sold<=10);assert.ok(coffee.sold<=coffee.demanded);assert.ok(report.sold<=report.capacity);
 assert.equal(state.products.coffee.inventory,10-coffee.sold);
});
test("cash flow balances receipts, spending and loans exactly",()=>{
 const s=E.createInitialState(1),p=normal(s),{state,report}=E.nextMonth(s,p);
 assert.equal(state.cash,s.cash+p.borrow-report.costs.expense+report.revenue);
 assert.equal(report.cashFlow,state.cash-s.cash);
 assert.equal(report.profit,report.revenue-report.costs.costOfGoodsSold-report.costs.wages-report.costs.rent-report.costs.advertising-report.costs.interest-report.costs.hiring);
 assert.equal(s.products.coffee.inventory,0);
});
test("inventory purchases are paid in cash but unsold units are not COGS",()=>{
 const s=E.createInitialState(33),p=normal(s);p.products.coffee.order=1200;p.products.coffee.price=9999;
 const {report,state}=E.nextMonth(s,p);
 assert.ok(report.byProduct.coffee.sold<=report.byProduct.coffee.demanded);
 assert.equal(report.costs.procurement,1200*E.CATALOG.coffee.unitCost);
 assert.equal(report.costs.costOfGoodsSold,report.byProduct.coffee.sold*E.CATALOG.coffee.unitCost);
 assert.equal(state.products.coffee.inventory,1200-report.byProduct.coffee.sold);
});
test("insufficient funds fail without mutating any inputs",()=>{
 const s=E.createInitialState(99),before=JSON.stringify(s),p=normal(s);p.products.coffee.order=15000;
 assert.throws(()=>E.nextMonth(s,p),/資金/);
 assert.equal(JSON.stringify(s),before);
});
test("borrowing and repayment are bounded and accounted separately",()=>{
 const s=E.createInitialState(42),p=normal(s);p.borrow=250000;
 const first=E.nextMonth(s,p),q=normal(first.state);q.repay=100000;
 const second=E.nextMonth(first.state,q);
 assert.equal(first.state.debt,250000);assert.equal(second.state.debt,150000);
 assert.equal(second.report.costs.repay,100000);
 assert.throws(()=>E.nextMonth(s,{...p,repay:250001}),/借入/);
});
test("sandwich must be unlocked after month four",()=>{
 const s=E.createInitialState(),p=normal(s);p.products.sandwich.order=1;
 assert.throws(()=>E.nextMonth(s,p),/未解放/);
 p.products.sandwich.order=0;p.unlockSandwich=true;
 assert.throws(()=>E.nextMonth(s,p),/4か月目/);
});
test("hidden welfare is finite and never displayed by the source UI",()=>{
 const s=E.createInitialState(),detail=E.demandDetail(s,"coffee",650);
 const welfare=E.hiddenWelfare(E.CATALOG.coffee,650,300,detail.intercept);
 for(const v of Object.values(welfare))assert.ok(Number.isFinite(v));
 assert.ok(welfare.socialEfficiencyLoss>=0);
});
test("long-run seed replay and cash conservation stay valid",()=>{
 for(const seed of [1,2,444,20261018]){
  let a=E.createInitialState(seed),b=E.createInitialState(seed);
  for(let i=0;i<20;i++){
   const p=normal(a);p.products.coffee.order=500;p.advertising=i%2?0:10000;
   const nextA=E.nextMonth(a,p),nextB=E.nextMonth(b,p);
   assert.deepEqual(nextA,nextB);assert.ok(nextA.state.cash>=0);assert.equal(nextA.state.history.length,i+1);
   a=nextA.state;b=nextB.state;
  }
 }
});
