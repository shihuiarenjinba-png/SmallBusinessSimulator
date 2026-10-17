/* Offline deterministic shop economy. No server, no real-money transactions. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.SmallBusinessEconomy=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION=1;
const CATALOG=Object.freeze({
 coffee:{name:"店頭コーヒー",unitCost:200,referencePrice:650,baseDemand:850,elasticity:1.55,externalCost:8},
 sandwich:{name:"サンドイッチ",unitCost:370,referencePrice:950,baseDemand:480,elasticity:1.8,externalCost:12}
});
const RULES=Object.freeze({startingCash:1200000,monthlyRent:75000,monthlyWage:175000,
 hireCost:35000,staffCapacity:640,equipmentCapacity:260,equipmentCost:260000,
 qualityCost:150000,sandwichLicense:180000,loanLimit:2500000,monthlyInterest:0.008,
 maxEmployees:10,maxPurchase:15000,maxPrice:9999,maxAdvertising:300000});
const clone=x=>JSON.parse(JSON.stringify(x));
function integer(x,name,min,max){if(!Number.isSafeInteger(x)||x<min||x>max)throw Error(name+"は"+min+"〜"+max+"の整数が必要です。");return x;}
function initial(seed=20261018){integer(seed,"seed",1,2147483647);return {version:VERSION,seed,month:1,cash:RULES.startingCash,debt:0,employees:1,equipment:0,quality:0,sandwichUnlocked:false,products:{coffee:{price:650,inventory:0},sandwich:{price:950,inventory:0}},history:[]};}
function validate(raw){
 if(!raw||raw.version!==VERSION||!raw.products||!Array.isArray(raw.history))throw Error("セーブ形式が違います。");
 integer(raw.seed,"seed",1,2147483647);integer(raw.month,"month",1,121);
 integer(raw.cash,"cash",0,1e12);integer(raw.debt,"debt",0,RULES.loanLimit);
 integer(raw.employees,"employees",0,10);integer(raw.equipment,"equipment",0,6);integer(raw.quality,"quality",0,6);
 if(typeof raw.sandwichUnlocked!=="boolean"||raw.history.length!==raw.month-1)throw Error("保存内容の整合性が不正です。");
 const products={};
 for(const id of Object.keys(CATALOG)){const p=raw.products[id];if(!p)throw Error("商品の保存内容がありません。");products[id]={price:integer(p.price,"price",1,RULES.maxPrice),inventory:integer(p.inventory,"inventory",0,1e7)};}
 const history=raw.history.map(h=>{if(!h)throw Error("履歴の形式が不正です。");for(const key of ["month","revenue","profit","cash","sold"])integer(h[key],"history."+key,-1e12,1e12);return {month:h.month,revenue:h.revenue,profit:h.profit,cash:h.cash,sold:h.sold};});
 return {version:VERSION,seed:raw.seed,month:raw.month,cash:raw.cash,debt:raw.debt,employees:raw.employees,equipment:raw.equipment,quality:raw.quality,sandwichUnlocked:raw.sandwichUnlocked,products,history};
}
function noise(seed,month,id,salt){let n=(seed^Math.imul(month,0x9e3779b1)^salt)>>>0;for(const c of id){n^=c.charCodeAt(0);n=Math.imul(n,16777619)>>>0;}n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;n=Math.imul(n,0x846ca68b);n^=n>>>16;return(n>>>0)/4294967296;}
function competitorPrice(s,id){return Math.round(CATALOG[id].referencePrice*(.88+.30*noise(s.seed,s.month,id,26)));}
function demandDetail(s,id,price,ads=0,quality=s.quality){
 const item=CATALOG[id];if(!item)throw Error("不明な商品です。");
 integer(price,"price",1,RULES.maxPrice);integer(ads,"advertising",0,RULES.maxAdvertising);integer(quality,"quality",0,6);
 const season=1+.12*Math.sin((s.month-1)*Math.PI/6+(id==="coffee"?0:1.8));
 const macro=Math.max(.75,1+.07*Math.sin(s.month/4));
 const competitor=Math.pow(competitorPrice(s,id)/item.referencePrice,.36);
 const marketing=1+.18*Math.log1p(ads/20000);
 const improvement=1+quality*.08,shock=.93+.14*noise(s.seed,s.month,id,11);
 const intercept=item.baseDemand*season*macro*competitor*marketing*improvement*shock;
 const quantity=Math.min(50000,Math.max(0,Math.floor(intercept*Math.pow(price/item.referencePrice,-item.elasticity))));
 return {quantity,intercept,competitorPrice:competitorPrice(s,id)};
}
function forecast(s,id,price,ads=0,quality=s.quality){const d=demandDetail(s,id,price,ads,quality);return {expected:d.quantity,lower:Math.floor(d.quantity*.82),upper:Math.ceil(d.quantity*1.18),competitor:d.competitorPrice};}
function defaultPlan(s){s=validate(s);return {products:{coffee:{price:s.products.coffee.price,order:700},sandwich:{price:s.products.sandwich.price,order:0}},employees:s.employees,advertising:10000,borrow:0,repay:0,equipmentUpgrade:false,qualityUpgrade:false,unlockSandwich:false};}
function validatePlan(s,p){
 if(!p||!p.products)throw Error("計画が不正です。");
 const products={};
 for(const id of Object.keys(CATALOG)){const x=p.products[id];if(!x)throw Error(id+"の計画がありません。");products[id]={price:integer(x.price,id+"価格",1,RULES.maxPrice),order:integer(x.order,id+"仕入",0,RULES.maxPurchase)};}
 const q={products,employees:integer(p.employees,"employees",0,10),advertising:integer(p.advertising,"advertising",0,RULES.maxAdvertising),borrow:integer(p.borrow,"borrow",0,RULES.loanLimit),repay:integer(p.repay,"repay",0,RULES.loanLimit),equipmentUpgrade:p.equipmentUpgrade===true,qualityUpgrade:p.qualityUpgrade===true,unlockSandwich:p.unlockSandwich===true};
 if(s.debt+q.borrow-q.repay<0||s.debt+q.borrow-q.repay>RULES.loanLimit)throw Error("借入残高または返済金額が不正です。");
 if(q.equipmentUpgrade&&s.equipment>=6||q.qualityUpgrade&&s.quality>=6)throw Error("設備か品質が上限です。");
 if(q.unlockSandwich&&(s.month<4||s.sandwichUnlocked))throw Error("商品追加は4か月目から一度だけ可能です。");
 if(!s.sandwichUnlocked&&!q.unlockSandwich&&q.products.sandwich.order)throw Error("未解放の商品は仕入れできません。");
 return q;
}
function planCosts(s,p){
 const hiring=Math.max(0,p.employees-s.employees)*RULES.hireCost;
 const wages=p.employees*RULES.monthlyWage,procurement=Object.keys(CATALOG).reduce((n,id)=>n+CATALOG[id].unitCost*p.products[id].order,0);
 const equipment=p.equipmentUpgrade?RULES.equipmentCost:0,quality=p.qualityUpgrade?RULES.qualityCost:0,unlock=p.unlockSandwich?RULES.sandwichLicense:0;
 const debtAfterTransactions=s.debt+p.borrow-p.repay,interest=Math.round(debtAfterTransactions*RULES.monthlyInterest);
 const expense=hiring+wages+RULES.monthlyRent+procurement+p.advertising+equipment+quality+unlock+interest+p.repay;
 return {hiring,wages,procurement,equipment,quality,unlock,interest,rent:RULES.monthlyRent,advertising:p.advertising,repay:p.repay,expense,debtAfterTransactions};
}
function hiddenWelfare(item,price,sold,intercept){
 const elasticity=item.elasticity,power=1-1/elasticity;
 const gross=sold>0?item.referencePrice*Math.pow(intercept,1/elasticity)*Math.pow(sold,power)/power:0;
 const consumerSurplus=Math.max(0,Math.round(gross-price*sold));
 const producerSurplus=Math.round((price-item.unitCost)*sold),externalCost=item.externalCost*sold;
 const efficientQuantity=intercept*Math.pow(item.referencePrice/(item.unitCost+item.externalCost),elasticity);
 const optimalGross=item.referencePrice*Math.pow(intercept,1/elasticity)*Math.pow(efficientQuantity,power)/power;
 const optimalSurplus=optimalGross-(item.unitCost+item.externalCost)*efficientQuantity;
 return {consumerSurplus,producerSurplus,externalCost,totalSurplus:consumerSurplus+producerSurplus-externalCost,efficientQuantity:Math.round(efficientQuantity),socialEfficiencyLoss:Math.max(0,Math.round(optimalSurplus-(gross-(item.unitCost+item.externalCost)*sold)))};
}
function nextMonth(raw,rawPlan){
 const s=validate(raw);if(s.month>120)throw Error("120か月を完走しています。");
 const p=validatePlan(s,rawPlan),costs=planCosts(s,p);
 if(costs.expense>s.cash+p.borrow)throw Error("資金が不足しています。仕入や投資を減らすか、借入を検討してください。");
 const result=clone(s);result.sandwichUnlocked=s.sandwichUnlocked||p.unlockSandwich;result.employees=p.employees;
 result.equipment+=Number(p.equipmentUpgrade);result.quality+=Number(p.qualityUpgrade);
 result.debt=costs.debtAfterTransactions;result.cash+=p.borrow-costs.expense;
 let remainingCapacity=p.employees*RULES.staffCapacity+result.equipment*RULES.equipmentCapacity;
 const capacity=remainingCapacity;let revenue=0,soldCount=0,demanded=0,missed=0;
 for(const id of Object.keys(CATALOG)){result.products[id].price=p.products[id].price;result.products[id].inventory+=p.products[id].order;}
 const byProduct={};
 const enabled=Object.keys(CATALOG).filter(id=>id==="coffee"||result.sandwichUnlocked);
 enabled.sort((a,b)=>(p.products[b].price-CATALOG[b].unitCost)-(p.products[a].price-CATALOG[a].unitCost));
 for(const id of enabled){const item=CATALOG[id],price=p.products[id].price;
  const demand=demandDetail(result,id,price,p.advertising,result.quality);
  const stock=result.products[id].inventory,sold=Math.min(demand.quantity,stock,remainingCapacity);
  result.products[id].inventory-=sold;remainingCapacity-=sold;revenue+=sold*price;soldCount+=sold;
  demanded+=demand.quantity;missed+=demand.quantity-sold;
  byProduct[id]={name:item.name,price,order:p.products[id].order,demanded:demand.quantity,sold,remaining:stock-sold,revenue:sold*price,competitorPrice:demand.competitorPrice,missedSales:demand.quantity-sold,_welfare:hiddenWelfare(item,price,sold,demand.intercept)};
 }
 result.cash+=revenue;
 const costOfGoodsSold=Object.keys(byProduct).reduce((sum,id)=>sum+byProduct[id].sold*CATALOG[id].unitCost,0);
 const profit=revenue-costOfGoodsSold-costs.wages-costs.rent-costs.advertising-costs.interest-costs.hiring;
 const cashFlow=p.borrow-costs.expense+revenue;
 const report={month:s.month,revenue,profit,cashFlow,cash:result.cash,debt:result.debt,employees:p.employees,capacity,sold:soldCount,demanded,missed,byProduct,costs:{...costs,costOfGoodsSold},notes:[]};
 if(missed>0)report.notes.push("商品・在庫・販売能力の制約で販売機会を逃しました。");
 if(result.debt>0)report.notes.push("借入には毎月の利息がかかります。");
 if(profit<0)report.notes.push("今月は赤字でした。価格・費用・仕入れを見直してください。");
 if(result.cash<costs.rent+p.employees*costs.wages/Math.max(1,p.employees))report.notes.push("翌月の固定費に対して手元資金が少なくなっています。");
 result.history.push({month:s.month,revenue,profit,cash:result.cash,sold:soldCount});result.month++;
 return {state:validate(result),report};
}
return Object.freeze({VERSION,CATALOG,RULES,initial,createInitialState:initial,validate,validateState:validate,defaultPlan,demandDetail,forecast,planCosts,nextMonth,hiddenWelfare});
});
