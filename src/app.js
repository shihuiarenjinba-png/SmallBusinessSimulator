/* Readable, offline store UI. Keep private models out of the player-facing screen. */
(function(){"use strict";
const E=globalThis.SmallBusinessEconomy,$=id=>document.getElementById(id),KEY="small-business-simulator-v1";
let state=null,corruptRaw=null,recoveryBlocked=false,latest=null,notice="";
const yen=n=>Math.round(n).toLocaleString("ja-JP")+"円";
function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function load(){let raw=null;try{raw=localStorage.getItem(KEY);return raw?E.validateState(JSON.parse(raw)):E.createInitialState();}
 catch(e){recoveryBlocked=true;corruptRaw=raw;notice="保存記録を読み込めません。元のデータを保護しています。";return E.createInitialState();}}
function persist(){if(recoveryBlocked)return false;try{localStorage.setItem(KEY,JSON.stringify(state));return true;}
 catch(e){notice="自動保存できませんでした。セーブを書き出してください。";return false;}}
function numeric(id){const v=$(id).value.trim();if(!/^[0-9]+$/.test(v))throw Error("数値は0以上の整数で入力してください。");const n=Number(v);if(!Number.isSafeInteger(n))throw Error("数値が大きすぎます。");return n;}
function plan(){return {products:{
  coffee:{price:numeric("coffeePrice"),order:numeric("coffeeOrder")},
  sandwich:{price:numeric("sandwichPrice"),order:numeric("sandwichOrder")}},
 employees:numeric("employees"),advertising:numeric("advertising"),
 borrow:numeric("borrow"),repay:numeric("repay"),
 equipmentUpgrade:$("equipmentUpgrade").checked,
 qualityUpgrade:$("qualityUpgrade").checked,staffTraining:$("staffTraining").checked,
 unlockSandwich:$("unlockSandwich").checked};}
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
   inputs.append(makeField(id+"Price","店頭の販売価格（円）",state.products[id].price,1,E.RULES.maxPrice));
   inputs.append(makeField(id+"Order","今月の仕入数（個）",id==="coffee"?700:0,0,E.RULES.maxPurchase));
   card.append(inputs);
   const forecast=element("p",undefined,"forecast");forecast.id=id+"Forecast";const bars=element("div",undefined,"demand-bars");bars.id=id+"DemandBars";card.append(forecast,bars);dest.append(card);
 }
 $("unlockBox").hidden=state.sandwichUnlocked||state.month<4;
 $("unlockSandwich").checked=false;
 showSandwich();
}
function showSandwich(){const enabled=state.sandwichUnlocked||$("unlockSandwich").checked;$("sandwichCard").hidden=!enabled;}
function populate(){const p=E.defaultPlan(state);$("employees").value=String(p.employees);$("advertising").value=String(p.advertising);
 $("borrow").value="0";$("repay").value="0";$("equipmentUpgrade").checked=false;$("qualityUpgrade").checked=false;$("staffTraining").checked=false;$("staffTraining").disabled=state.month<6||state.staffSkill>=4||state.employees<1;
 products();}
function renderStats(){
 $("month").textContent=state.month>120?"完走":state.month+"か月目";
 $("cash").textContent=yen(state.cash);$("debt").textContent=yen(state.debt);$("headcount").textContent=state.employees+"人";
 $("staffProgress").textContent="従業員育成 "+state.staffSkill+" / 4 ｜ 研修は6か月目から（85,000円）";
 $("message").textContent=notice|| (state.month<=3?"まずは商品の価格と仕入れを決めましょう。":
   state.month===4&&!state.sandwichUnlocked?"新しい商品を扱うか、お店を磨くかを選びましょう。":
   "価格・仕入・人員を調整しながら成長を目指しましょう。");
}
function showHistory(){const root=$("history");root.replaceChildren();
 for(const h of state.history.slice(-12).reverse())root.append(element("div",h.month+"か月目 ｜ 売上 "+yen(h.revenue)+" ｜ 利益 "+yen(h.profit)+" ｜ 現金 "+yen(h.cash),"record"));
 if(!state.history.length)root.append(element("p","営業すると月次記録がここに残ります。","muted"));
}
function results(){const root=$("results");root.replaceChildren();if(!latest){root.append(element("p","価格・仕入・運営を決めて最初の1か月を始めましょう。","muted"));return;}
 const grid=element("div",undefined,"result-grid");
 for(const [label,value] of [["売上",yen(latest.revenue)],["営業利益",yen(latest.profit)],["販売数",latest.sold+"個"],["売り逃した数",latest.missed+"個"]]){
   const card=element("div",undefined,"result-cell");card.append(element("small",label),element("strong",value));grid.append(card);
 }root.append(grid);
 for(const d of Object.values(latest.byProduct)){root.append(element("p",d.name+"：希望 "+d.demanded+"個 / 販売 "+d.sold+"個 / 残り "+d.remaining+"個。競合店の価格目安 "+yen(d.competitorPrice),"muted"));}
 latest.notes.forEach(n=>root.append(element("p",n,"result-note")));
}

function demandBars(id,forecast,planned){
 const node=$(id+"DemandBars");node.replaceChildren();
 const supply=state.products[id].inventory+planned.products[id].order;
 const max=Math.max(1,supply,forecast.expected);
 for(const [title,value,type] of [["需要の予想",forecast.expected,"demand"],
    ["在庫＋今回の仕入",supply,"supply"]]){
   const wrap=element("div",undefined,"demand-meter "+type);
   const label=element("div",undefined,"demand-meter-header");
   label.append(element("span",title),element("strong",value.toLocaleString("ja-JP")+"個"));
   const meter=element("progress");meter.max=max;meter.value=value;meter.setAttribute("aria-label",title+" "+value+"個");
   wrap.append(label,meter);node.append(wrap);
 }
 const note=forecast.expected>supply?
   "需要予想に対して品物が不足する可能性があります。仕入費用と人員も確認しましょう。":
   "在庫に余裕があります。売れ残りの費用と値付けにも気をつけましょう。";
 node.append(element("p",note+" ※予想であり、売上・販売数の保証ではありません。"));
}

function preflight(){if(recoveryBlocked){$("preflight").textContent="セーブ復元が必要です。元データを退避するか、明示的に新規開始してください。";$("advance").disabled=true;return;}
 if(state.month>120){$("preflight").textContent="120か月の経営を完走しました。";$("advance").disabled=true;return;}
 try{
   const p=plan(),sim=E.nextMonth(state,p);
   const costs=sim.report.costs;
   $("preflight").textContent="今月の仕入 "+yen(costs.procurement)+" ＋ 固定費・広告・投資・返済など "+yen(costs.expense-costs.procurement)+"。営業開始前の残金 "+yen(state.cash+p.borrow-costs.expense)+"。";
   $("advance").disabled=false;
   for(const id of Object.keys(E.CATALOG)){
     if(id==="sandwich"&&!state.sandwichUnlocked&&!p.unlockSandwich)continue;
     const f=E.forecast(state,id,p.products[id].price,p.advertising,state.quality+Number(p.qualityUpgrade));
     $(id+"Forecast").textContent="この価格の需要予想："+f.expected+"個（販売は在庫と従業員数が上限）。競合店の参考価格 "+yen(f.competitor)+"。";
     demandBars(id,f,p);
   }
 }catch(e){$("preflight").textContent=e.message;$("advance").disabled=true;}
}
function redraw(){renderStats();populate();showHistory();results();preflight();}
function advance(){try{const output=E.nextMonth(state,plan());state=output.state;latest=output.report;notice=latest.profit>=0?"経営を続けられました。次は価格と仕入を見直しましょう。":"赤字になりました。経費と販売価格を調整してみましょう。";
 persist();redraw();$("results").scrollIntoView({block:"nearest",behavior:"smooth"});}
 catch(e){notice=e.message;renderStats();preflight();}}
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:"application/json"})),a=element("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportSave(){download(recoveryBlocked?"small-business-unreadable-original.json":"small-business-month-"+state.month+".json",
 recoveryBlocked&&corruptRaw!==null?corruptRaw:JSON.stringify({schema:E.VERSION,state},null,2));}
async function importSave(file){if(!file)return;try{if(file.size>400000)throw Error("保存ファイルが大きすぎます。");const data=JSON.parse(await file.text());
 if(data.schema!==E.VERSION)throw Error("保存形式が対応していません。");const next=E.validateState(data.state);
 if(!confirm("現在の進行を、このセーブに置き換えますか？"))return;
 state=next;recoveryBlocked=false;corruptRaw=null;latest=null;notice="セーブを復元しました。";persist();redraw();
 }catch(e){alert("セーブ読込失敗："+e.message);}}
function init(){
 state=load();if(!recoveryBlocked)persist();redraw();
 document.addEventListener("input",event=>{if(event.target.matches("input"))preflight();});
 document.addEventListener("change",event=>{if(event.target.id==="unlockSandwich")showSandwich();if(event.target.matches("input"))preflight();});
 $("advance").addEventListener("click",()=>{if(!recoveryBlocked)advance();});
 $("export").addEventListener("click",exportSave);$("import").addEventListener("click",()=>$("savefile").click());
 $("savefile").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";void importSave(f);});
 $("reset").addEventListener("click",()=>{if(!confirm(recoveryBlocked?"読込できない元の記録を上書きして新規開始します。先に元データを書き出しましたか？":"現在の進行を消して、初めから始めますか？"))return;
   recoveryBlocked=false;corruptRaw=null;state=E.createInitialState();latest=null;notice="新しく始めました。";persist();redraw();});
}
document.addEventListener("DOMContentLoaded",init);
})();
