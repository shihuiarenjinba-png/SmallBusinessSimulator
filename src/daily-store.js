/* Day-by-day extension for Small Business Simulator.
 * Existing monthly economy and saves remain supported without mutation.
 * Free, deterministic, 100% offline; currency is in-game yen only.
 */
(function(root,factory){
 const api=factory(root.SmallBusinessEconomy||(typeof require==="function"?require("./economy.js"):null));
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.SmallBusinessDaily=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(E){
"use strict";
if(!E)throw Error("SmallBusinessEconomy must load first");
const DAYS=30, AUTO_FEE=12000, MAX_STOCK=5000;
const LIFE=Object.freeze({coffee:14,sandwich:3});
const IDS=Object.keys(E.CATALOG);
const copy=value=>JSON.parse(JSON.stringify(value));
const integer=(v,name,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error(name+"は"+min+"〜"+max+"の整数で指定してください。");return v;};
const initialTotals=()=>({revenue:0,profit:0,sold:0,missed:0,expired:0,received:0,discounted:0});
function validateDaily(base,daily){
 if(!daily||daily.version!==1)throw Error("日次在庫の保存形式が不正です。");
 const day=integer(daily.day,"日",1,30);
 if(typeof daily.automationPaid!=="boolean"||!daily.policy||
    typeof daily.policy.enabled!=="boolean")throw Error("自動値引き設定が不正です。");
 const threshold=integer(daily.policy.threshold,"値引き開始日",1,14);
 const percent=integer(daily.policy.percent,"自動値引率",0,90);
 const totals={};
 for(const id of Object.keys(initialTotals()))totals[id]=integer(daily.totals?.[id],"月内集計 "+id,id==="profit"?-1e12:0,1e12);
 const lots={};
 for(const id of IDS){
  const source=daily.lots?.[id];
  if(!Array.isArray(source)||source.length>600)throw Error(id+"の在庫ロットが不正です。");
  lots[id]=source.map(lot=>({
   qty:integer(lot?.qty,"在庫数量",1,MAX_STOCK),
   days:integer(lot?.days,"賞味期限残日数",1,LIFE[id])
  }));
  if(lots[id].reduce((a,l)=>a+l.qty,0)!==base.products[id].inventory)
   throw Error(id+"の在庫総数と保存ロットが一致しません。");
 }
 return {version:1,day,automationPaid:daily.automationPaid,
   policy:{enabled:daily.policy.enabled,threshold,percent},totals,lots};
}
function start(raw){
 const base=E.validateState(raw);
 const lots={};
 for(const id of IDS){
  if(base.products[id].inventory>MAX_STOCK)throw Error("在庫が多すぎるため、日次モードへ移行できません。");
  lots[id]=base.products[id].inventory?[{qty:base.products[id].inventory,days:LIFE[id]}]:[];
 }
 return {...base,daily:{version:1,day:1,automationPaid:false,
  policy:{enabled:false,threshold:2,percent:20},lots,totals:initialTotals()}};
}
function restore(raw,rawDaily){
 const base=E.validateState(raw),daily=validateDaily(base,rawDaily);
 return {...base,daily};
}
function defaultPlan(raw){
 const state=restore(raw,raw.daily),d=state.daily;
 return {products:Object.fromEntries(IDS.map(id=>[id,{price:state.products[id].price,order:0,discount:0}])),
  employees:state.employees,advertising:0,borrow:0,repay:0,
  automation:d.policy.enabled,threshold:d.policy.threshold,percent:d.policy.percent,
  unlockSandwich:false};
}
function validatePlan(s,p){
 if(!p||!p.products)throw Error("営業計画がありません。");
 const products={};
 for(const id of IDS){
  const v=p.products[id];
  products[id]={
   price:integer(v?.price,id+"の通常価格",1,E.RULES.maxPrice),
   order:integer(v?.order,id+"の入庫数量",0,MAX_STOCK),
   discount:integer(v?.discount??0,id+"の本日値引き",0,90)
  };
 }
 const q={products,employees:integer(p.employees,"従業員数",0,10),
  advertising:integer(p.advertising,"本日の広告費",0,10000),
  borrow:integer(p.borrow,"新規借入",0,E.RULES.loanLimit),
  repay:integer(p.repay,"返済額",0,E.RULES.loanLimit),
  automation:p.automation===true,threshold:integer(p.threshold,"期限前自動値引き日",1,14),
  percent:integer(p.percent,"自動値引率",0,90),unlockSandwich:p.unlockSandwich===true,
 equipmentUpgrade:p.equipmentUpgrade===true,qualityUpgrade:p.qualityUpgrade===true,
 staffTraining:p.staffTraining===true};
 if(q.equipmentUpgrade&&s.equipment>=6||q.qualityUpgrade&&s.quality>=6)
  throw Error("設備または品質の上限に達しています。");
 if(q.staffTraining&&(s.month<6||s.staffSkill>=4||q.employees<1))
  throw Error("従業員研修は6か月目以降、従業員1人以上で利用できます。");
 if(s.debt+q.borrow-q.repay<0||s.debt+q.borrow-q.repay>E.RULES.loanLimit)
  throw Error("借入・返済額が許容範囲外です。");
 if(q.unlockSandwich&&(s.month<4||s.sandwichUnlocked))
  throw Error("サンドイッチの新規販売は4か月目から一度だけです。");
 if(!s.sandwichUnlocked&&!q.unlockSandwich&&q.products.sandwich.order>0)
  throw Error("サンドイッチは販売解放後に入庫してください。");
 for(const id of IDS){
  if(s.products[id].inventory+q.products[id].order>MAX_STOCK)
   throw Error(id+"の保管上限 "+MAX_STOCK+"個を超えています。");
 }
 return q;
}
function quote(raw,p){
 const s=restore(raw,raw.daily),q=validatePlan(s,p),monthly=E.RULES;
 const hiring=Math.max(0,q.employees-s.employees)*monthly.hireCost;
 const wages=Math.ceil(q.employees*monthly.monthlyWage/DAYS);
 const rent=Math.ceil(monthly.monthlyRent/DAYS);
 const debt=s.debt+q.borrow-q.repay;
 const interest=Math.ceil(debt*monthly.monthlyInterest/DAYS);
 const unlock=q.unlockSandwich?monthly.sandwichLicense:0;
 const procurement=IDS.reduce((a,id)=>a+q.products[id].order*E.CATALOG[id].unitCost,0);
 const automationFee=q.automation&&!s.daily.automationPaid?AUTO_FEE:0;
 const equipment=q.equipmentUpgrade?monthly.equipmentCost:0;
 const quality=q.qualityUpgrade?monthly.qualityCost:0;
 const training=q.staffTraining?monthly.trainingCost:0;
 const expense=hiring+wages+rent+interest+unlock+procurement+automationFee+
  equipment+quality+training+q.advertising+q.repay;
 if(expense>s.cash+q.borrow)
   throw Error("本日の入庫・運営費に必要な資金が足りません。仕入数または支出を減らしてください。");
 return {hiring,wages,rent,interest,unlock,procurement,automationFee,equipment,quality,training,advertising:q.advertising,
  repay:q.repay,borrow:q.borrow,debt,expense,remaining:s.cash+q.borrow-expense};
}
function dayDemand(s,id,price,advertising){
 const d=E.demandDetail(s,id,price,Math.min(E.RULES.maxAdvertising,advertising*DAYS),s.quality);
 return Math.max(0,Math.round(d.quantity/DAYS));
}
function advance(raw,plan){
 const s=restore(raw,raw.daily);
 if(s.month>120)throw Error("120か月の経営期間が終了しました。");
 const p=validatePlan(s,plan),costs=quote(s,p),result=copy(s),day=s.daily.day;
 const d=result.daily;
 result.cash=costs.remaining;result.debt=costs.debt;result.employees=p.employees;
 result.equipment+=Number(p.equipmentUpgrade);
 result.quality+=Number(p.qualityUpgrade);
 result.staffSkill+=Number(p.staffTraining);
 if(p.unlockSandwich)result.sandwichUnlocked=true;
 d.policy={enabled:p.automation,threshold:p.threshold,percent:p.percent};
 d.automationPaid=d.automationPaid||p.automation;
 const report={month:s.month,day,byProduct:{},revenue:0,sold:0,missed:0,expired:0,received:0,
  discounted:0,profit:0,capacity:0,costs,events:[]};
 let capacity=Math.floor(result.employees*(E.RULES.staffCapacity+result.staffSkill*125)/DAYS)+
  Math.floor(result.equipment*E.RULES.equipmentCapacity/DAYS);
 report.capacity=capacity;
 for(const id of IDS){
  const goods=p.products[id],item=E.CATALOG[id];
  const enabled=id==="coffee"||result.sandwichUnlocked;
  result.products[id].price=goods.price;
  if(!enabled)continue;
  if(goods.order){d.lots[id].push({qty:goods.order,days:LIFE[id]});report.received+=goods.order;}
  const current=d.lots[id].reduce((a,l)=>a+l.qty,0);
  const clearance=l=>Math.max(goods.discount,d.policy.enabled&&l.days<=d.policy.threshold?d.policy.percent:0);
  const promoStock=d.lots[id].reduce((sum,l)=>sum+(clearance(l)>0?l.qty:0),0);
  const base=dayDemand(result,id,goods.price,p.advertising);
  // Limited extra demand for marked-down lots; never fabricate sales beyond actual stock or staff.
  const bonus=Math.min(base*2,Math.ceil(promoStock*Math.max(goods.discount,d.policy.enabled?d.policy.percent:0)/200));
  const wanted=base+bonus,sellable=Math.min(wanted,current,capacity);
  d.lots[id].sort((a,b)=>a.days-b.days);let toSell=sellable,earned=0,discounted=0;
  for(const lot of d.lots[id]){
   if(toSell===0)break;
   const take=Math.min(toSell,lot.qty),cut=clearance(lot);
   const unitPrice=Math.max(1,Math.floor(goods.price*(100-cut)/100));
   earned+=take*unitPrice;lot.qty-=take;toSell-=take;
   if(cut>0)discounted+=take;
  }
  d.lots[id]=d.lots[id].filter(x=>x.qty>0);
  let spoiled=0;
  for(const lot of d.lots[id]){
   lot.days--;
   if(lot.days===0)spoiled+=lot.qty;
  }
  d.lots[id]=d.lots[id].filter(x=>x.days>0);
  result.products[id].inventory=d.lots[id].reduce((a,l)=>a+l.qty,0);
  const lost=Math.max(0,wanted-sellable);
  report.byProduct[id]={name:item.name,price:goods.price,order:goods.order,
   demanded:wanted,sold:sellable,expired:spoiled,remaining:result.products[id].inventory,
   discounted,revenue:earned,missedSales:lost};
  report.revenue+=earned;report.sold+=sellable;report.missed+=lost;
  report.expired+=spoiled;report.discounted+=discounted;capacity-=sellable;
 }
 result.cash+=report.revenue;
 const cogs=IDS.reduce((sum,id)=>sum+(report.byProduct[id]?.sold||0)*E.CATALOG[id].unitCost,0);
 const lostCost=IDS.reduce((sum,id)=>sum+(report.byProduct[id]?.expired||0)*E.CATALOG[id].unitCost,0);
 report.costs.costOfGoodsSold=cogs;report.costs.expiredCost=lostCost;
 report.profit=report.revenue-cogs-lostCost-costs.hiring-costs.wages-costs.rent-
  costs.interest-costs.advertising-costs.automationFee-costs.training;
 const totals=d.totals;
 for(const field of Object.keys(totals))totals[field]+=report[field]||0;
 if(report.expired)report.events.push("賞味期限を過ぎた "+report.expired+"個を廃棄しました。");
 if(report.missed)report.events.push("在庫または従業員不足で販売機会を逃しました。");
 if(report.received)report.events.push("入庫 "+report.received+"個を売場・倉庫へ補充しました。");
 if(report.discounted)report.events.push("値引き品 "+report.discounted+"個を販売しました。");
 if(day===DAYS){
  result.history.push({month:s.month,revenue:totals.revenue,profit:totals.profit,
   cash:result.cash,sold:totals.sold});
  result.month++;
  d.day=1;d.totals=initialTotals();d.automationPaid=false;
  report.closedMonth=true;
 }else d.day++;
 const checked=restore(result,result.daily);
 return {state:checked,report};
}
function advanceDays(raw,plan,count=7){
 integer(count,"まとめて進める日数",1,7);
 let state=restore(raw,raw.daily);
 const reports=[];
 const output={byProduct:{},revenue:0,sold:0,missed:0,expired:0,received:0,
   discounted:0,profit:0,events:[],daysProcessed:0,closedMonth:false};
 for(let i=0;i<count;i++){
  const p=copy(plan);
  if(i){
   // Purchases and one-time financial/upgrade decisions happen on the first day only.
   for(const id of IDS)p.products[id].order=0;
   p.borrow=0;p.repay=0;p.unlockSandwich=false;
   p.equipmentUpgrade=false;p.qualityUpgrade=false;p.staffTraining=false;
  }
  const r=advance(state,p);state=r.state;reports.push(r.report);
  for(const name of ["revenue","sold","missed","expired","received","discounted","profit"])
   output[name]+=r.report[name];
  for(const [id,d] of Object.entries(r.report.byProduct)){
   const aggregate=output.byProduct[id]||(output.byProduct[id]={...d,order:0,demanded:0,sold:0,expired:0,discounted:0,revenue:0,missedSales:0});
   for(const key of ["order","demanded","sold","expired","discounted","revenue","missedSales"])
    aggregate[key]+=d[key]||0;
   aggregate.remaining=d.remaining;
  }
  output.events.push(...r.report.events);
  output.daysProcessed++;
  if(r.report.closedMonth){output.closedMonth=true;break;}
 }
 output.events=output.events.slice(-10);
 output.day=reports[0].day;output.month=reports[0].month;
 output.costs={expense:reports.reduce((sum,r)=>sum+r.costs.expense,0),
  procurement:reports.reduce((sum,r)=>sum+r.costs.procurement,0)};
 output.events.unshift(output.daysProcessed+"営業日分を一括処理しました。入庫・借入・投資は初日に1回だけ実行しました。");
 return {state,report:output};
}
return Object.freeze({DAYS,AUTO_FEE,LIFE,MAX_STOCK,start,restore,defaultPlan,quote,advance,advanceDays});
});
