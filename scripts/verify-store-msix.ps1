$ErrorActionPreference = "Stop"

function Get-FileSha256Hex {
  param([Parameter(Mandatory=$true)][string]$Path)
  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  $stream = [System.IO.File]::OpenRead($Path)
  try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace("-", "") }
  finally { $stream.Dispose(); $algorithm.Dispose() }
}

function Read-ZipText {
  param([Parameter(Mandatory=$true)]$Entry)
  $reader = New-Object System.IO.StreamReader($Entry.Open())
  try { return $reader.ReadToEnd() }
  finally { $reader.Dispose() }
}

$root = Split-Path -Parent $PSScriptRoot
$record = Get-Content -LiteralPath (Join-Path $root "store/partner-center-identity.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$expectedStoreDisplayName = if (($record.PSObject.Properties.Name -contains "storeDisplayName") -and $record.storeDisplayName) { [string]$record.storeDisplayName } else { [string]$record.productTitle }
$expectedCommit = [string]$env:STORE_SOURCE_COMMIT
if ($expectedCommit -notmatch '^[0-9A-Fa-f]{40}$') { throw "STORE_SOURCE_COMMIT must be a 40-character Git SHA" }

$dir = Join-Path $root "dist-msix-store-candidate"
if (-not (Test-Path -LiteralPath $dir)) { throw "MSIX output directory missing" }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$packages = @(Get-ChildItem -LiteralPath $dir -File -Filter "*.msix")
$uploads = @(Get-ChildItem -LiteralPath $dir -File -Filter "*.msixupload")
if ($packages.Count -ne 1 -or $uploads.Count -ne 1) { throw "Expected exactly one MSIX and one MSIXUPLOAD" }

$zip = [System.IO.Compression.ZipFile]::OpenRead($packages[0].FullName)
try {
  $entry = $zip.GetEntry("AppxManifest.xml")
  if (-not $entry) { throw "AppxManifest.xml missing" }
  [xml]$manifest = Read-ZipText -Entry $entry

  $identity = $manifest.SelectSingleNode("/*[local-name()='Package']/*[local-name()='Identity']")
  if (-not $identity) { throw "Identity node missing" }
  if ([string]$identity.Name -cne [string]$record.identityName) { throw "Identity.Name mismatch" }
  if ([string]$identity.Publisher -cne [string]$record.publisher) { throw "Identity.Publisher mismatch" }
  if ([string]$identity.Version -cne [string]$env:STORE_PACKAGE_VERSION) { throw "Identity.Version mismatch" }
  if ([string]$identity.Version -notmatch '^([0-9]+)\.([0-9]+)\.([0-9]+)\.0$') { throw "Identity.Version must have four numeric components with revision 0" }
  if ([string]$identity.ProcessorArchitecture -cne "x64") { throw "ProcessorArchitecture is not x64" }

  $pdn = $manifest.SelectSingleNode("//*[local-name()='PublisherDisplayName']")
  if (-not $pdn -or [string]$pdn.InnerText -cne [string]$record.publisherDisplayName) { throw "PublisherDisplayName mismatch" }

  $propertiesName = $manifest.SelectSingleNode("//*[local-name()='Properties']/*[local-name()='DisplayName']")
  $visualElements = @($manifest.SelectNodes("//*[local-name()='VisualElements']"))
  if (-not $propertiesName -or [string]$propertiesName.InnerText -cne $expectedStoreDisplayName) { throw "Package/Properties/DisplayName differs from reserved Store name" }
  if ($visualElements.Count -ne 1 -or [string]$visualElements[0].GetAttribute("DisplayName") -cne $expectedStoreDisplayName) { throw "uap:VisualElements/@DisplayName differs from reserved Store name" }

  $description = [string]$visualElements[0].GetAttribute("Description")
  if ($description -match '(?i)development|developer|candidate|HOLD|開発版|販売HOLD') { throw "Manifest Description exposes internal development wording" }

  $languages = @($manifest.SelectNodes("//*[local-name()='Resources']/*[local-name()='Resource']") | ForEach-Object { [string]$_.GetAttribute("Language") })
  if ($languages -notcontains "ja-JP") { throw "Manifest Resources must declare ja-JP" }

  $asarEntries = @($zip.Entries | Where-Object { $_.FullName -match '(^|/)resources/app\.asar$' })
  if ($asarEntries.Count -lt 1) { throw "app.asar missing from MSIX" }

  $licenseEntries = @($zip.Entries | Where-Object { $_.FullName -match '(^|/)LICENSE\.electron\.txt$' })
  if ($licenseEntries.Count -lt 1) { throw "Electron license missing from MSIX" }

  $commitEntries = @($zip.Entries | Where-Object { $_.FullName -match '(^|/)resources/SOURCE_GIT_COMMIT\.txt$' })
  if ($commitEntries.Count -ne 1) { throw "SOURCE_GIT_COMMIT.txt missing or duplicated in MSIX resources" }
  $actualCommit = (Read-ZipText -Entry $commitEntries[0]).Trim()
  if ($actualCommit -cne $expectedCommit) { throw "Embedded source commit does not match STORE_SOURCE_COMMIT" }

  Write-Host "MANIFEST_IDENTITY_PASS $($record.identityName) $($identity.Version) x64"
  Write-Host "STORE_DISPLAY_NAME_PASS $expectedStoreDisplayName"
  Write-Host "RESOURCE_LANGUAGE_PASS ja-JP"
  Write-Host "SOURCE_COMMIT_PASS $actualCommit"
  Write-Host ("MSIX_SHA256=" + (Get-FileSha256Hex -Path $packages[0].FullName))
  Write-Host ("MSIXUPLOAD_SHA256=" + (Get-FileSha256Hex -Path $uploads[0].FullName))
  Write-Host "Candidate only: Store upload, certification, publication, and Windows install/save/restore QA remain separate gates."
} finally {
  $zip.Dispose()
}
