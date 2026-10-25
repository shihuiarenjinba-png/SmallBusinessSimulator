"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),url=require("node:url");
const out=path.resolve("ui-release-review");fs.mkdirSync(out,{recursive:true});
const entry=url.pathToFileURL(path.resolve("index.html")).href;
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[],remote=[];
 const track=p=>{p.on("pageerror",e=>errors.push(e.message));p.on("request",r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});p.on("dialog",d=>d.accept());};
 try{
  const context=await browser.newContext({viewport:{width:1280,height:720}}),p=await context.newPage();
  track(p);await p.goto(entry,{waitUntil:"load"});
  const shot=n=>p.screenshot({path:path.join(out,n),fullPage:true});
  assert.match(await p.locator("#month").innerText(),/1/);
  assert.match(await p.locator("#cash").innerText(),/円/);
  assert.equal(await p.locator("#products .product").count(),2);
  assert.equal(await p.locator("#advance").isEnabled(),true);
  await shot("01-1280-shop-opening.png");
  const initial=await p.locator("#cash").innerText();
  await p.locator('[data-operation-tab="run"]').click();
  assert.equal(await p.locator("#advance").isVisible(),true);
  await p.locator("#advance").click();
  assert.match(await p.locator("#month").innerText(),/2/);
  assert.match(await p.locator("#results").innerText(),/売上|利益/);
  await shot("02-1280-month-result.png");
  await p.reload();
  assert.match(await p.locator("#month").innerText(),/2/);
  await p.locator('[data-operation-tab="history"]').click();
  assert.match(await p.locator("#history").innerText(),/売上/);
  await p.locator('[data-operation-tab="goods"]').click();
  await p.locator("#coffeePrice").fill("0");
  await p.locator('[data-operation-tab="run"]').click();
  assert.equal(await p.locator("#advance").isDisabled(),true);
  await p.locator('[data-operation-tab="goods"]').click();
  await p.locator("#coffeePrice").fill("280");
  await p.locator('[data-operation-tab="run"]').click();
  assert.equal(await p.locator("#advance").isEnabled(),true);
  await shot("03-1280-invalid-input-recovery.png");
  const small=await browser.newContext({viewport:{width:1024,height:768}}),q=await small.newPage();
  track(q);await q.goto(entry,{waitUntil:"load"});
  const dim=await q.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  assert.ok(dim.body<=dim.viewport+2,"horizontal overflow at 1024: "+JSON.stringify(dim));
  assert.match(await q.locator("#preflight").innerText(),/円/);
  await q.screenshot({path:path.join(out,"04-1024-shop-opening.png"),fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  const player=await q.locator("body").innerText();
  for(const phrase of ["GitHub Actions","QA_UNSIGNED","Store Identity","WACK","MSIX","開発工程"]){
   assert.equal(player.includes(phrase),false,"pipeline content appeared: "+phrase);
  }
  const record={result:"PASS",monthAdvanced:2,savedAndReloaded:true,inputValidation:true,gameStats:true,
   width1024NoOverflow:true,internalPipelineHidden:true,screenshots:4,startingCash:initial,pageErrors:errors,remoteRequests:remote,
   scope:"Chromium UI QA, not installed MSIX"};
  fs.writeFileSync(path.join(out,"UI_RELEASE_QA.json"),JSON.stringify(record,null,2)+"\n");
  console.log("SMALL_BUSINESS_UI_QA_PASS "+JSON.stringify(record));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
