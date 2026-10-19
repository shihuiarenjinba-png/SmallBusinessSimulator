"use strict";
// Offline Windows UI screenshots: Node 22+ and the installed Microsoft Edge only.
// node scripts/capture-windows-ui.cjs C:\repos\UsedItemShopSimulator C:\captures
// Only switches tabs, never submits, buys, or changes game data.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),
cp=require("node:child_process"),{pathToFileURL}=require("node:url");
const screenInfo={
 SmallBusinessSimulator:{selector:"[data-operation-screen]",dataset:"operationScreen"},
 UsedItemShopSimulator:{selector:"[data-shop-screen]",dataset:"shopScreen"},
 FactoryInspectionSimulator:{selector:"[data-operation-screen]",dataset:"operationScreen"},
 NightOfficeAuditor:{selector:"[data-operation-screen]",dataset:"operationScreen"},
 "game-stadium":{selector:"[data-ekiden-screen]",dataset:"ekidenScreen"},
 "game-new":{selector:"#storyPanel,#evidencePanel",dataset:null},
 "finance-simulation":{selector:'section[id^="view-"]',dataset:null}
};
const configurations={
SmallBusinessSimulator:["data-operation-tab","goods operations run history"],
UsedItemShopSimulator:["data-shop-tab","home buy stock repair day money records"],
FactoryInspectionSimulator:["data-operation-tab","orders quality run history"],
NightOfficeAuditor:["data-operation-tab","case evidence decision report history"],
"game-stadium":["data-ekiden-tab","training team race management guide"],
"game-new":["data-handover-view","story clues"],
"finance-simulation":["data-view","overview portfolio trade bank records"]
};
const nap=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 if(process.argv.includes("--help")||process.argv.length<3){
  console.log("node scripts/capture-windows-ui.cjs <repo-directory> [output-directory]");return;
 }
 if(process.platform!=="win32")throw Error("Run on Windows");
 const root=path.resolve(process.argv[2]),project=path.basename(root),config=configurations[project];
 if(!config)throw Error("Unknown project directory "+project);
 const page=path.join(root,"index.html");
 if(!fs.existsSync(page))throw Error("index.html is absent");
 const output=path.resolve(process.argv[3]||path.join(root,"qa-screenshots"));
 const edge=[process.env.EDGE_PATH,
  process.env["PROGRAMFILES(X86)"]&&path.join(process.env["PROGRAMFILES(X86)"],"Microsoft/Edge/Application/msedge.exe"),
  process.env.PROGRAMFILES&&path.join(process.env.PROGRAMFILES,"Microsoft/Edge/Application/msedge.exe"),
  process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,"Microsoft/Edge/Application/msedge.exe")
 ].find(v=>v&&fs.existsSync(v));
 if(!edge)throw Error("Install Microsoft Edge or set EDGE_PATH");
 if(typeof WebSocket!=="function")throw Error("Node 22+ WebSocket support required");
 fs.mkdirSync(output,{recursive:true});
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),"game-capture-"));
 const edgeProcess=cp.spawn(edge,["--headless=new","--no-first-run","--disable-extensions",
 "--disable-background-networking","--allow-file-access-from-files",
 "--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{windowsHide:true,stdio:"ignore"});
 let ws;const results=[],errors=[],runtimeErrors=[];
 try{
  const portPath=path.join(profile,"DevToolsActivePort");let port;
  for(let i=0;i<110;i++){
   if(fs.existsSync(portPath)){port=Number(fs.readFileSync(portPath,"utf8").split(/\r?\n/)[0]);if(port)break;}
   if(edgeProcess.exitCode!==null)throw Error("Edge exited unexpectedly");
   await nap(100);
  }
  if(!port)throw Error("Edge DevTools port not ready");
  let target;
  for(let i=0;i<40;i++){
   try{const pages=await (await fetch("http://127.0.0.1:"+port+"/json/list")).json();
    target=pages.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
    if(target)break;
   }catch(e){}
   await nap(100);
  }
  if(!target)throw Error("Edge page target not found");
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener("open",resolve,{once:true});ws.addEventListener("error",reject,{once:true});});
  const pending=new Map();let serial=0;
  ws.addEventListener("message",ev=>{
   let m;try{m=JSON.parse(String(ev.data));}catch(e){return;}
   if(m.method==="Runtime.exceptionThrown"){
    runtimeErrors.push({kind:"page-exception",error:m.params?.exceptionDetails?.text||"JavaScript exception"});return;
   }
   const p=pending.get(m.id);if(!p)return;pending.delete(m.id);
   m.error?p.reject(Error(m.error.message)):p.resolve(m.result);
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{
   const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
  });
  await send("Page.enable");await send("Runtime.enable");
  await send("Page.navigate",{url:pathToFileURL(page).href});
  const tabs=config[1].split(" ");
  const selectors=tabs.map(t=>"["+config[0]+"="+JSON.stringify(t)+"]");
  let ready=false;
  for(let k=0;k<90;k++){
   const ret=await send("Runtime.evaluate",{expression:"!!document.querySelector("+JSON.stringify(selectors[0])+")",returnByValue:true});
   if(ret.result?.value){ready=true;break;}await nap(120);
  }
  if(!ready)throw Error("App did not create the expected navigation");
  for(const [width,height] of [[1280,720],[1920,1080]]){
   await send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:false});
   for(let i=0;i<tabs.length;i++){
    try{
     const info=screenInfo[project],id=project==="game-new"?
      (tabs[i]==="story"?"storyPanel":"evidencePanel"):
      project==="finance-simulation"?"view-"+tabs[i]:null;
     const selection=info.dataset?
      "p.dataset["+JSON.stringify(info.dataset)+"]==="+JSON.stringify(tabs[i]):
      "p.id==="+JSON.stringify(id);
     const expression="(()=>{const el=document.querySelector("+JSON.stringify(selectors[i])+
      ");if(!el)return null;el.click();scrollTo(0,0);"+
      "const nav=Array.from(document.querySelectorAll("+JSON.stringify("["+config[0]+"]")+"));"+
      "const active=nav.filter(b=>b.getAttribute('aria-selected')==='true'||"+
      "(b.hasAttribute('data-view')&&b.classList.contains('selected')));"+
      "const panels=Array.from(document.querySelectorAll("+JSON.stringify(info.selector)+"));"+
      "const target=panels.filter(p=>"+selection+");"+
      "const visible=p=>!p.hidden&&p.getClientRects().length>0;"+
      "return {horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,"+
      "activeTabIsSelected:active.length===1&&active[0]===el,"+
      "visibleTargetCount:target.filter(visible).length,"+
      "wrongVisibleCount:panels.filter(p=>!target.includes(p)&&visible(p)).length};})()";
     const state=await send("Runtime.evaluate",{expression,returnByValue:true});
     if(!state.result?.value)throw Error("Tab not found: "+tabs[i]);
     const inspected=state.result.value;
     if(!inspected.activeTabIsSelected||inspected.visibleTargetCount<1||inspected.wrongVisibleCount>0||inspected.horizontalOverflow)
      errors.push({kind:"tab-screen-mismatch",tab:tabs[i],width,height,inspection:inspected});
     await nap(320);
     const capture=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
     const filename=project+"_"+tabs[i]+"_"+width+"x"+height+".png";
     fs.writeFileSync(path.join(output,filename),Buffer.from(capture.data,"base64"));
     results.push({tab:tabs[i],width,height,filename,...state.result.value});
    }catch(e){errors.push({tab:tabs[i],width,height,error:String(e)});}
   }
  }
 }finally{
  try{ws?.close();}catch(e){}
  try{edgeProcess.kill();}catch(e){}
  await nap(250);
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:2,retryDelay:250});}catch(e){}
 }
 fs.writeFileSync(path.join(output,project+"_manifest.json"),JSON.stringify({
  type:"initial-tab screenshot with tab/screen visibility assertions; not active-game or MSIX validation",
  results,errors:errors.concat(runtimeErrors)
 },null,2));
 console.log("Saved "+results.length+" images; "+(errors.length+runtimeErrors.length)+" errors; "+output);
 if(errors.length||runtimeErrors.length)process.exitCode=1;
}
main().catch(e=>{console.error("UI capture: "+e);process.exitCode=1;});
