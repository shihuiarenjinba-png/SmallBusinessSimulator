/* Decorative scene headers only. All values remain owned by existing simulation controllers. */
/* No external images, sounds, paid assets, network calls or save format changes. */
(() => {"use strict";
const CONFIG={"goods":["売場と商品棚","価格と仕入れを決める場所。来客や営業結果はこの画面では演出しません。","store-shelves"],"operations":["レジと運営デスク","従業員数と設備・融資の設定を行う画面です。","store-desk"],"run":["営業・決算デスク","入力した計画を実行すると、この画面に売上と結果が表示されます。","store-register"],"history":["経営記録","過去の営業とセーブを確認します。店内の人物演出はありません。","paper-files"]};
const theme="small";
const $=id=>document.getElementById(id);
function build(){
 const nav=$("operationTabs");if(!nav)return;
 const scenes=[];
 for(const [key,[title,description,visual]] of Object.entries(CONFIG)){
   const panel=document.querySelector('[data-operation-screen="'+key+'"]');
   if(!panel||panel.querySelector(".context-scene"))continue;
   const figure=document.createElement("div");figure.className="context-scene";
   figure.dataset.sceneKey=key;figure.dataset.sceneVisual=visual;figure.dataset.sceneTheme=theme;
   const illustration=document.createElement("div");illustration.className="context-illustration";illustration.setAttribute("aria-hidden","true");
   for(const shape of ["backdrop","floor","structure","object","object-secondary","detail","worker"]){
    const piece=document.createElement("span");piece.className="scene-shape scene-"+shape;illustration.append(piece);
   }
   const words=document.createElement("div");words.className="context-description";
   const heading=document.createElement("h3");heading.textContent=title;
   const explainer=document.createElement("p");explainer.textContent=description;
   words.append(heading,explainer);figure.append(illustration,words);panel.insertBefore(figure,panel.firstChild);
   scenes.push(figure);
 }
 const staffControl=$(theme==="small"?"employees":theme==="factory"?"workers":null);
 const staffCount=$(theme==="small"?"headcount":null);
 function updateStaff(){
  const value=staffControl?.value??staffCount?.textContent??"0";
  const count=Number(String(value).replace(/[^0-9]/g,""));
  for(const element of scenes)element.dataset.workerVisible=Number.isFinite(count)&&count>0?"true":"false";
 }
 if(staffControl){staffControl.addEventListener("input",updateStaff);staffControl.addEventListener("change",updateStaff);}
 if(staffCount){const observer=new MutationObserver(updateStaff);observer.observe(staffCount,{childList:true,subtree:true,characterData:true});}
 updateStaff();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",build,{once:true});else build();
})();