# bunstrap on Windows: make sure a runtime exists, then hand off to setup.
#
# Prefers bun: one already on PATH, or a pinned copy installed into the Thursday
# root. Falls back to node 24+ for a user who does not run bun. Nothing is
# installed system-wide.
#
#   powershell -ExecutionPolicy Bypass -File scripts\bunstrap.ps1 --personal $HOME\th --skills-dir $HOME\.commandcode\skills --yes
#
# Every argument is passed through to scripts\setup.ts.

$ErrorActionPreference = "Stop"
$NodeFloor = 24
$BunVersion = "1.4.2"
$RepoDir = Split-Path -Parent $PSScriptRoot

function Get-ThursdayRoot {
    if ($env:THURSDAY_ROOT) { return $env:THURSDAY_ROOT }
    return Join-Path $env:LOCALAPPDATA "thursday"
}

function Test-NodeCurrent {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) { return $false }
    $major = & node -p 'process.versions.node.split(".")[0]'
    return [int]$major -ge $NodeFloor
}

$Root = Get-ThursdayRoot
$LocalBun = Join-Path $Root "bin\bun.exe"
$Runtime = $null
$RuntimeRun = @()

$onPath = Get-Command bun -ErrorAction SilentlyContinue
if ($onPath) {
    $Runtime = $onPath.Source
    $RuntimeRun = @("run")
    Write-Host "using bun at $Runtime"
}
elseif (Test-Path $LocalBun) {
    $Runtime = $LocalBun
    $RuntimeRun = @("run")
    Write-Host "using bun at $Runtime"
}
elseif (Test-NodeCurrent) {
    $Runtime = (Get-Command node).Source
    Write-Host "using node at $Runtime"
}
else {
    Write-Host "bun not found, and no node $NodeFloor+. installing bun $BunVersion into $Root\bin"
    Write-Host "this fetches and runs the official installer from bun.sh"
    $env:BUN_INSTALL = $Root
    Invoke-Expression (Invoke-RestMethod "https://bun.sh/install.ps1")
    $Runtime = $LocalBun
    $RuntimeRun = @("run")
}

if (-not (Test-Path $Runtime)) {
    Write-Error "no usable runtime after install; tried $Runtime"
    exit 2
}

& $Runtime @RuntimeRun (Join-Path $RepoDir "scripts\setup.ts") @args
exit $LASTEXITCODE
