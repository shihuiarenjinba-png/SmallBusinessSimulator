# Seven Windows games acceptance: read-only against locally checked-out QA branches.
# Requires Node.js 22+, Microsoft Edge, and an existing source directory with seven repositories.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$SourceRoot,
 [string]$OutputRoot = (Join-Path $env:USERPROFILE ("Downloads\WindowsGamesQA_" + (Get-Date -Format "yyyyMMdd_HHmmss")))
)
$ErrorActionPreference="Stop"
$Expected=[ordered]@{
 "SmallBusinessSimulator"="qa/seven-game-screen-state-audit-20261019"
 "UsedItemShopSimulator"="fix/usedshop-restored-report-ui-20261019"
 "FactoryInspectionSimulator"="fix/factory-save-transaction-ui-20261019"
 "NightOfficeAuditor"="fix/night-audit-save-integrity-20261019"
 "game-stadium"="qa/ekiden-current-flow-ci-20261019"
 "game-new"="qa/handover-story-ui-ci-20261019"
 "finance-simulation"="fix/liquid-save-backup-ui-20261019"
}
if(-not (Test-Path -LiteralPath $SourceRoot -PathType Container)){throw "SourceRoot was not found: $SourceRoot"}
if(Test-Path -LiteralPath $OutputRoot){throw "QA output directory already exists; refusing overwrite: $OutputRoot"}
if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js not found"}
if(-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)){throw "npm.cmd not found"}
$version=(& node -p "process.versions.node").Trim()
if([int]($version.Split(".")[0]) -lt 22){throw "Node.js 22 or newer required: $version"}
$capture=Join-Path $PSScriptRoot "capture-windows-ui.cjs"
if(-not (Test-Path -LiteralPath $capture)){throw "Capture helper missing: $capture"}
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
$results=New-Object System.Collections.Generic.List[object]
foreach($name in $Expected.Keys){
 $directory=Join-Path $SourceRoot $name
 $out=Join-Path $OutputRoot $name
 New-Item -ItemType Directory -Path $out -Force | Out-Null
 $item=[ordered]@{
  repository=$name;expectedBranch=$Expected[$name];headSha=$null;workingTreeClean=$null
  sourceTests="NOT_RUN";sourceTestExitCode=$null;edgeTabs="NOT_RUN";edgeCaptureExitCode=$null
  screenshotCount=0;gameplay="NOT_RUN";gameplayExitCode=$null;errors=@()
 }
 try{
  if(-not(Test-Path -LiteralPath $directory -PathType Container)){throw "Repository folder missing"}
  $branch=(& git -C $directory branch --show-current).Trim()
  if($LASTEXITCODE -ne 0){throw "Cannot read Git branch"}
  if($branch -ne $Expected[$name]){throw "Unexpected branch '$branch'. Required: '$($Expected[$name])'"}
  $item.headSha=(& git -C $directory rev-parse HEAD).Trim()
  if($LASTEXITCODE -ne 0){throw "Cannot read commit SHA"}
  $dirty=(@(& git -C $directory status --porcelain) -join "`n").Trim()
  if($LASTEXITCODE -ne 0){throw "Cannot check working tree"}
  $item.workingTreeClean=($dirty.Length -eq 0)
  if(-not $item.workingTreeClean){throw "Uncommitted changes detected; not validating a reproducible commit"}
  $testLog=Join-Path $out "node-tests.txt"
  Push-Location $directory
  try{
   $testOutput=(& npm.cmd test 2>&1 | Out-String)
   $testStatus=$LASTEXITCODE
  }finally{Pop-Location}
  [IO.File]::WriteAllText($testLog,$testOutput,[Text.UTF8Encoding]::new($false))
  $item.sourceTestExitCode=$testStatus
  $item.sourceTests=if($testStatus -eq 0){"PASS"}else{"FAIL"}
  $screenOut=Join-Path $out "Edge-Initial-Tabs"
  $edgeLog=(& node $capture $directory $screenOut 2>&1 | Out-String)
  $edgeStatus=$LASTEXITCODE
  [IO.File]::WriteAllText((Join-Path $out "edge-capture.txt"),$edgeLog,[Text.UTF8Encoding]::new($false))
  $item.edgeCaptureExitCode=$edgeStatus
  $manifest=Join-Path $screenOut ($name+"_manifest.json")
  if(Test-Path -LiteralPath $manifest){
   $check=(Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json)
   $item.screenshotCount=@($check.results).Count
   if(@($check.errors).Count -gt 0){
    $item.errors+=@($check.errors | ConvertTo-Json -Compress -Depth 8)
   }
   $item.edgeTabs=if($edgeStatus -eq 0 -and @($check.errors).Count -eq 0){"PASS"}else{"FAIL"}
  }else{
   $item.edgeTabs="FAIL";$item.errors+=@("Capture manifest missing")
  }
  if($name -eq "finance-simulation"){
   $gameplay=Join-Path $directory "scripts/windows-edge-gameplay.cjs"
   if(Test-Path -LiteralPath $gameplay){
    $playOut=Join-Path $out "Edge-Gameplay"
    $playLog=(& node $gameplay $directory $playOut 2>&1 | Out-String)
    $playStatus=$LASTEXITCODE
    [IO.File]::WriteAllText((Join-Path $out "edge-gameplay.txt"),$playLog,[Text.UTF8Encoding]::new($false))
    $item.gameplayExitCode=$playStatus
    $item.gameplay=if($playStatus -eq 0){"PASS"}else{"FAIL"}
   }else{$item.gameplay="MISSING_SCRIPT"}
  }else{$item.gameplay="NOT_YET_AUTOMATED"}
 }catch{
  $item.errors+=@([string]$_)
 }
 $results.Add([pscustomobject]$item)
 Write-Host ("{0} / source={1} / Edge={2} / gameplay={3} / PNGs={4}" -f $name,$item.sourceTests,$item.edgeTabs,$item.gameplay,$item.screenshotCount)
}
$report=[ordered]@{
 schema="seven-game-windows-source-audit-v1";createdAt=(Get-Date).ToString("o");
 sourceRoot=$SourceRoot;nodeVersion=$version;
 limitation="Tests run from original source files in Edge, NOT from MSIX; active gameplay only automated for finance-simulation.";
 results=@($results)
}
$reportFile=Join-Path $OutputRoot "SEVEN_GAME_QA_MANIFEST.json"
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $reportFile -Encoding utf8
$fail=@($results | Where-Object {$_.sourceTests -ne "PASS" -or $_.edgeTabs -ne "PASS" -or $_.errors.Count -gt 0 -or ($_.repository -eq "finance-simulation" -and $_.gameplay -ne "PASS")})
Write-Host "Completed. Evidence: $reportFile; failed or incomplete $($fail.Count)/7"
if($fail.Count -gt 0){exit 1}
