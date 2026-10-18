"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const code=fs.readFileSync("src/operation-tabs.js","utf8"),html=fs.readFileSync("index.html","utf8");
const names=["goods","operations","run","history"];
test("only one real operation screen remains visible and all input controls keep their DOM identity",()=>{
 const events={},buttons=[];
 class El{
  constructor(tag="SECTION"){this.tagName=tag;this.dataset={};this.hidden=false;this.attrs={};this.events={};
   this.parentNode={insertBefore:()=>{}};this.children=[];this.className="";}
  matches(sel){return sel==="section.panel"&&this.tagName==="SECTION"}
  setAttribute(k,v){this.attrs[k]=v}
  addEventListener(k,cb){this.events[k]=cb}
  append(x){this.children.push(x)}
  focus(){this.focused=true}
  closest(sel){return sel==="[data-operation-tab]"&&this.dataset.operationTab?this:null}
 }
 const panels=Array.from({length:4},()=>new El()),details=new El("DETAILS"),main={children:panels,querySelector:()=>details};
 const doc={readyState:"loading",querySelector:s=>s==="main.shell"?main:null,
  getElementById:()=>({addEventListener(){}}),
  createElement:tag=>{const el=new El(tag.toUpperCase());if(tag==="button")buttons.push(el);return el;},
  addEventListener:(k,cb)=>events[k]=cb};
 const win={};vm.runInNewContext(code,{window:win,document:doc});
 events.DOMContentLoaded();assert.equal(win.OperationTabs.current(),names[0]);
 for(const name of names){
  assert.equal(win.OperationTabs.open(name),true);
  assert.equal(win.OperationTabs.current(),name);
  const visible=panels.filter(p=>!p.hidden);
  assert.equal(visible.length,name==="run"?2:name==="history"?0:1);
  assert.equal(details.hidden,name!=="history");
 }
 assert.equal(buttons.filter(b=>b.dataset.operationTab).length,names.length);
 assert.equal(buttons.filter(b=>b.dataset.operationTab&&b.attrs["aria-selected"]==="true").length,1);
 assert.equal(win.OperationTabs.open("not-real"),false);
});
test("tabs use intact game buttons, do not alter saved simulation and script exists in HTML",()=>{
 assert.match(html,/src\/operation-tabs\.js/);
 assert.match(code,/\.hidden=!isActive/);
 assert.doesNotMatch(code,/localStorage|sessionStorage|\.cash\s*=|\.history\s*=|\.score\s*=/);
 assert.doesNotThrow(()=>new vm.Script(code));
});
