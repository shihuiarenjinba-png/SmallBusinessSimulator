/* Readable, offline store UI. Keep private models out of the player-facing screen. */
(function(){"use strict";
const E=globalThis.SmallBusinessEconomy,D=globalThis.SmallBusinessDaily,$=id=>document.getElementById(id),KEY="small-business-simulator-v1",BACKUP="small-business-before-daily-v1";
let state=null,corruptRaw=null,recoveryBlocked=false,latest=null,notice="";
const daily=()=>!!state?.daily;
const yen=n=>Math.round(n).toLocaleString("ja-JP")+"円";
function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function load(){let raw=null;try{raw=localStorage.getItem(KEY);if(!raw)return D.start(E.createInitialState());
 const value=JSON.parse(raw),base=E.validateState(value);
 return value.daily?D.restore(base,value.daily):base;}
 catch(e){recoveryBlocked=true;corruptRaw=raw;notice="保存記録を読み込めません。元のデータを保護しています。";return E.createInitialState();}}
function persist(){if(recoveryBlocked)return false;try{localStorage.setItem(KEY,JSON.stringify(state));return true;}
 catch(e){notice="自動保存できませんでした。セーブを書き出してください。";return false;}}
function numeric(id){const v=$(id).value.trim();if(!/^[0-9]+$/.test(v))throw Error("数値は0以上の整数で入力してください。");const n=Number(v);if(!Number.isSafeInteger(n))throw Error("数値が大きすぎます。");return n;}
function plan(){return {products:{
  coffee:{price:numeric("coffeePrice"),order:numeric("coffeeOrder"),discount:daily()?numeric("coffeeDiscount"):0},
  sandwich:{price:numeric("sandwichPrice"),order:numeric("sandwichOrder"),discount:daily()?numeric("sandwichDiscount"):0}},
 employees:numeric("employees"),advertising:numeric("advertising"),
 borrow:numeric("borrow"),repay:numeric("repay"),
 equipmentUpgrade:$("equipmentUpgrade").checked,
 qualityUpgrade:$("qualityUpgrade").checked,staffTraining:$("staffTraining").checked,
 unlockSandwich:$("unlockSandwich").checked,
 automation:daily()&&$("autoDiscount").checked,
 threshold:daily()?numeric("autoDays"):2,percent:daily()?numeric("autoPercent"):20};}
function makeField(id,label,value,min,max){
 const holder=element("label",label);const input=element("input");
 input.id=id;input.type="number";input.min=String(min);input.max=String(max);input.step="1";input.value=String(value);
 holder.append(input);return holder;
}
function products(){
 const dest=$("products");dest.replaceChildren();
 for(const [id,item] of Object.entries(E.CATALOG)){
   const card=element("div",undefined,"product");card.id=id+"Card";
   card.append(element("h3",item.name),element("p","原価 "+yen(item.unitCost)+" / 個 ｜ 前月までの在庫 "+state.products[id].inventory+"個","muted"));
   const inputs=element("div",undefined,"controls");
   inputs.append(makeField(id+"Price","通常販売価格（円）",state.products[id].price,1,E.RULES.maxPrice));
   inputs.append(makeField(id+"Order",daily()?"本日入庫する数量（個）":"今月の仕入数（個）",
  daily()?0:(id==="coffee"?700:0),0,daily()?D.MAX_STOCK:E.RULES.maxPurchase));
   if(daily()){
    const label=element("label","今日だけの一括値引き");
    const picker=element("select");picker.id=id+"Discount";
    for(const [pct,name] of [[0,"値引きなし"],[20,"20％オフ"],[50,"半額（50％オフ）"]]){
      const option=element("option",name);option.value=String(pct);picker.append(option);
    }
    label.append(picker);inputs.append(label);
    const ending=state.daily.lots[id].filter(l=>l.days<=2).reduce((a,l)=>a+l.qty,0);
    card.append(element("p","現在庫 "+state.products[id].inventory+"個 ｜ 残り2日以内の在庫 "+ending+
      "個 ｜ 参考保存期間 "+D.LIFE[id]+"営業日","muted"));
   }
   card.append(inputs);
   const forecast=element("p",undefined,"forecast");forecast.id=id+"Forecast";const bars=element("div",undefined,"demand-bars");bars.id=id+"DemandBars";card.append(forecast,bars);dest.append(card);
 }
 $("unlockBox").hidden=state.sandwichUnlocked||state.month<4;
 $("unlockSandwich").checked=false;
 showSandwich();
}
function showSandwich(){const enabled=state.sandwichUnlocked||$("unlockSandwich").checked;$("sandwichCard").hidden=!enabled;}
function populate(){const p=daily()?D.defaultPlan(state):E.defaultPlan(state);$("employees").value=String(p.employees);$("advertising").value=String(p.advertising);
 $("advertisingLabel").textContent=daily()?"本日の広告費（円）":"今月の広告費（円）";
 $("autoDiscount").checked=daily()?state.daily.policy.enabled:false;
 $("autoDays").value=daily()?String(state.daily.policy.threshold):"2";
 $("autoPercent").value=daily()?String(state.daily.policy.percent):"20";
 $("autoDiscountBox").hidden=!daily();$("dailyView").hidden=!daily();$("dailyMigration").hidden=daily();
 $("monthActionTitle").textContent=daily()?"本日のお店を営業する":"この計画で1か月営業する";
 $("monthActionDescription").textContent=daily()?"毎日入庫・値付け・賞味期限を確認できます。30営業日で1か月決算です。":"売上と利益、売れ残りを確認して次の手を考えましょう。";
 $("advance").textContent=daily()?"この計画で1営業日進める →":"この計画で1か月進める →";
 $("borrow").value="0";$("repay").value="0";$("equipmentUpgrade").checked=false;$("qualityUpgrade").checked=false;$("staffTraining").checked=false;$("staffTraining").disabled=state.month<6||state.staffSkill>=4||state.employees<1;
 products();}
function renderStats(){
 $("month").textContent=state.month>120?"完走":state.month+"か月目";
 $("cash").textContent=yen(state.cash);$("debt").textContent=yen(state.debt);$("headcount").textContent=state.employees+"人";
 $("staffProgress").textContent="従業員育成 "+state.staffSkill+" / 4 ｜ 研修は6か月目から（85,000円）";
 $("dailyView").textContent=daily()?state.month+"か月目・第"+state.daily.day+
 "営業日 / 30日｜入庫と値引きは日ごとに変更可能｜自動値引き利用料はゲーム内 "+yen(D.AUTO_FEE)+" / 月":"";
 $("message").textContent=notice|| (state.month<=3?"まずは商品の価格と仕入れを決めましょう。":
   state.month===4&&!state.sandwichUnlocked?"新しい商品を扱うか、お店を磨くかを選びましょう。":
   "価格・仕入・人員を調整しながら成長を目指しましょう。");
}
function showHistory(){const root=$("history");root.replaceChildren();
 for(const h of state.history.slice(-12).reverse())root.append(element("div",h.month+"か月目 ｜ 売上 "+yen(h.revenue)+" ｜ 利益 "+yen(h.profit)+" ｜ 現金 "+yen(h.cash),"record"));
 if(!state.history.length)root.append(element("p","営業すると月次記録がここに残ります。","muted"));
}
function results(){
 const root=$("results");root.replaceChildren();
 if(!latest){root.append(element("p",daily()?"在庫・値引き・入庫を決めて1日進めてください。":"価格・仕入・運営を決めて1か月進めてください。","muted"));return;}
 const grid=element("div",undefined,"result-grid");
 const metrics=[["売上",yen(latest.revenue)],["営業利益",yen(latest.profit)],["販売数",latest.sold+"個"],["販売機会の損失",latest.missed+"個"]];
 if(daily())metrics.push(["期限切れ廃棄",latest.expired+"個"],["値引き販売",latest.discounted+"個"],["本日の入庫",latest.received+"個"]);
 for(const [label,value] of metrics){
  const card=element("div",undefined,"result-cell");card.append(element("small",label),element("strong",value));grid.append(card);
 }root.append(grid);
 for(const detail of Object.values(latest.byProduct)){
  const line=daily()?
   detail.name+"：需要 "+detail.demanded+"個 / 販売 "+detail.sold+"個 / 入庫 "+detail.order+"個 / 残り "+detail.remaining+
   "個 / 期限切れ "+detail.expired+"個 / 値引き販売 "+detail.discounted+"個":
   detail.name+"：希望 "+detail.demanded+"個 / 販売 "+detail.sold+"個 / 残り "+detail.remaining+
   "個。競合店の参考価格 "+yen(detail.competitorPrice);
  root.append(element("p",line,"muted"));
 }
 for(const msg of (latest.notes||latest.events||[]))root.append(element("p",msg,"result-note"));
 if(latest.closedMonth)root.append(element("p","30日分の月次決算が確定し、翌月へ進みました。","result-note"));
}
function demandBars(id,forecast,planned){
 const node=$(id+"DemandBars");node.replaceChildren();
 const available=state.products[id].inventory+planned.products[id].order;
 const expected=daily()?Math.round(forecast.expected/30):forecast.expected;
 const difference=expected-available;
 node.append(element("strong",difference>0?"在庫不足の可能性":difference<0?"売れ残りの可能性":"需要と在庫は同程度"),
 element("p","予想需要 "+expected+"個 / "+(daily()?"日":"月")+" ｜ 仕入後の在庫 "+available+"個。"+
 (difference>0?"不足目安 "+difference+"個。再入庫や人員・価格を見直しましょう。":
 difference<0?"余剰目安 "+(-difference)+"個。期限切れ前の割引も検討できます。":"販売数は販売能力によって変わります。")+
 " ※需要予測であり販売を保証しません。","stock-advice"));
}
function preflight(){
 if(recoveryBlocked){$("preflight").textContent="セーブ復元が必要です。元の記録を保護しています。";$("advance").disabled=true;return;}
 if(state.month>120){$("preflight").textContent="120か月の経営を完走しました。";$("advance").disabled=true;return;}
 try{
  const p=plan(),costs=daily()?D.quote(state,p):E.nextMonth(state,p).report.costs;
  $("preflight").textContent=(daily()?"本日":"今月")+"の入庫費 "+yen(costs.procurement)+
   " ＋ 人件費・家賃・広告・その他 "+yen(costs.expense-costs.procurement)+
   "。営業前に残る現金 "+yen(state.cash+p.borrow-costs.expense)+"。";
  $("advance").disabled=false;
  for(const id of Object.keys(E.CATALOG)){
   if(id==="sandwich"&&!state.sandwichUnlocked&&!p.unlockSandwich)continue;
   const forecasts=E.forecast(state,id,p.products[id].price,daily()?Math.min(300000,p.advertising*30):p.advertising,state.quality+Number(p.qualityUpgrade));
   $(id+"Forecast").textContent="通常価格での需要予想 "+(daily()?Math.round(forecasts.expected/30):forecasts.expected)+
    "個 / "+(daily()?"日":"月")+"。参考競合価格 "+yen(forecasts.competitor)+"。";
   demandBars(id,forecasts,p);
  }
 }catch(e){$("preflight").textContent=e.message;$("advance").disabled=true;}
}
function redraw(){renderStats();populate();showHistory();results();preflight();}
function advance(){
 try{
  const wasDaily=daily(),output=wasDaily?D.advance(state,plan()):E.nextMonth(state,plan());
  state=output.state;latest=output.report;
  notice=latest.profit>=0?"営業を完了しました。次の値付けと入庫を決めてください。":"赤字です。仕入・値引き・費用を確認してください。";
  persist();redraw();
  $("deliveryBelt").dataset.active=String(wasDaily&&latest.received>0);
  $("deliveryBelt").setAttribute("aria-label",wasDaily&&latest.received>0?"本日"+latest.received+"個入庫しました":"今回の入庫はありません");
  window.OperationTabs?.open("run");
  $("results").scrollIntoView({block:"nearest",behavior:"smooth"});
 }catch(e){notice=e.message;renderStats();preflight();}
}
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:"application/json"})),a=element("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportSave(){download(recoveryBlocked?"small-business-unreadable-original.json":"small-business-month-"+state.month+".json",
 recoveryBlocked&&corruptRaw!==null?corruptRaw:JSON.stringify({schema:E.VERSION,state},null,2));}
async function importSave(file){if(!file)return;try{if(file.size>400000)throw Error("保存ファイルが大きすぎます。");const data=JSON.parse(await file.text());
 if(data.schema!==E.VERSION)throw Error("保存形式が対応していません。");
 const base=E.validateState(data.state),next=data.state.daily?D.restore(base,data.state.daily):base;
 if(!confirm("現在の進行を、このセーブに置き換えますか？"))return;
 state=next;recoveryBlocked=false;corruptRaw=null;latest=null;notice="セーブを復元しました。";persist();redraw();
 }catch(e){alert("セーブ読込失敗："+e.message);}}
function init(){
 state=load();if(!recoveryBlocked)persist();redraw();
 document.addEventListener("input",event=>{if(event.target.matches("input,select"))preflight();});
 document.addEventListener("change",event=>{if(event.target.id==="unlockSandwich")showSandwich();if(event.target.matches("input"))preflight();});
 $("advance").addEventListener("click",()=>{if(!recoveryBlocked)advance();});
 $("migrateDaily").addEventListener("click",()=>{
  if(recoveryBlocked||daily())return;
  if(!confirm("旧月次セーブを別領域に保護して、日次の入庫・値引き管理へ切り替えますか？現在庫は新しく入庫したものとして期限を設定します。"))return;
  try{
   const raw=localStorage.getItem(KEY);if(raw!==null)localStorage.setItem(BACKUP,raw);
   const candidate=D.start(state);
   localStorage.setItem(KEY,JSON.stringify(candidate));state=candidate;latest=null;
   notice="旧セーブをバックアップし、日次営業に切り替えました。";redraw();
  }catch(e){notice=e.message;renderStats();}
 });
 $("export").addEventListener("click",exportSave);$("import").addEventListener("click",()=>$("savefile").click());
 $("savefile").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";void importSave(f);});
 $("reset").addEventListener("click",()=>{if(!confirm(recoveryBlocked?"読込できない元の記録を上書きして新規開始します。先に元データを書き出しましたか？":"現在の進行を消して、初めから始めますか？"))return;
   recoveryBlocked=false;corruptRaw=null;state=D.start(E.createInitialState());latest=null;notice="新しく始めました。";persist();redraw();});
}
document.addEventListener("DOMContentLoaded",init);
})();
