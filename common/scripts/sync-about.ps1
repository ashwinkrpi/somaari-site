# Vendor somaari-common's about/*.json (from the main branch) into another repo.
# Usage: sync-about.ps1 <target_dir>
param([Parameter(Mandatory = $true)][string]$TargetDir)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$files = @("developer.json", "debug-fields.json")

git -C $repo rev-parse --verify --quiet main *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Error "no 'main' branch in $repo"
    exit 1
}

$dirty = git -C $repo status --porcelain -- about/
if ($dirty) {
    Write-Error "$repo has uncommitted changes under about/. Commit them to main first.`n$dirty"
    exit 1
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
foreach ($f in $files) {
    $content = git -C $repo show "main:about/$f"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "could not read about/$f from main"
        exit 1
    }
    $out = Join-Path $TargetDir $f
    # Write UTF-8 without BOM, LF line endings, matching the source file.
    [System.IO.File]::WriteAllText($out, (($content -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding $false))
    Write-Output "wrote $out"
}
