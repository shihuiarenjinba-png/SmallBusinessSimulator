"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("src/context-scenes.js","utf8");
const html=fs.readFileSync("index.html","utf8");
test("context scenes load from local files without external assets",()=>{
 assert.match(html,/context-scenes\.css/);assert.match(html,/src\/context-scenes\.js/);
 assert.ok(html.indexOf('src/operation-tabs.js')<html.indexOf('src/context-scenes.js'));
 assert.doesNotMatch(source,/\bfetch\(|XMLHttpRequest|http:\/\/|https:\/\/|localStorage|sessionStorage/);
 assert.match(source,/panel\.tagName==="DETAILS"/);
 assert.match(source,/summary\.insertAdjacentElement\("afterend",figure\)/);
 assert.doesNotThrow(()=>new vm.Script(source));
});
test("only the intended screens receive distinct visual headers",()=>{
 const names=["goods","operations","run","history"],theme="small";
 const views=Object.fromEntries(names.map(id=>[id,{scenes:[],querySelector(){return null;},insertBefore(el){this.scenes.push(el);}}]));
 class Element{
   constructor(tag){this.tag=tag;this.dataset={};this.children=[];this.listeners={};this.textContent="";this.className="";this.firstChild=null;}
   append(...children){this.children.push(...children);}
   setAttribute(){}
   addEventListener(type,fn){this.listeners[type]=fn;}
 }
 const nav=new Element("nav"),staff=new Element("input");staff.value="0";
 const obs=class{constructor(cb){this.callback=cb;}observe(){}};
 const doc={readyState:"loading",getElementById:id=>id==="operationTabs"?nav:
  id==="employees"||id==="workers"||id==="headcount"?staff:null,
  querySelector:q=>{const match=q.match(/data-operation-screen="([^"]+)"/);return match?views[match[1]]:null;},
  createElement:tag=>new Element(tag),addEventListener:(key,fn)=>{doc.events[key]=fn;},events:{}};
 vm.runInNewContext(source,{document:doc,MutationObserver:obs});
 doc.events.DOMContentLoaded();
 for(const id of names){assert.equal(views[id].scenes.length,1,id);
  const scene=views[id].scenes[0];assert.equal(scene.dataset.sceneTheme,theme);
  assert.ok(scene.children[0].children.length>=6);
  assert.ok(scene.children[1].children[0].textContent.length>0);
 }
 const people=names.map(id=>views[id].scenes[0]);
 if(theme==="small"||theme==="factory"){
   staff.value="2";staff.listeners.input();
   assert.equal(people[0].dataset.workerVisible,"true");
   staff.value="0";staff.listeners.change();
   assert.equal(people[0].dataset.workerVisible,"false");
 }
});
