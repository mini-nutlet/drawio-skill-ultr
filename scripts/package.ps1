<#
.SYNOPSIS
    Package the drawio-skill-ultr project into a distributable, installable skill directory.

.DESCRIPTION
    Creates a clean skill package by copying all needed files (SKILL.md, scripts/, assets/,
    references/, examples/) while excluding development artifacts (node_modules, output, specs,
    IDE files, generated .drawio files). Then runs `npm install --production` and creates
    a zip archive. Optionally installs directly to the Claude Code skills directory.

.PARAMETER OutputDir
    Directory where the packaged skill will be built. Default: "./dist/drawio-skill-ultr"

.PARAMETER InstallToClaude
    If set, also copies the packaged skill to ~/.claude/skills/drawio-skill-ultr after packaging.

.PARAMETER SkipZip
    If set, skip creating the zip archive. Useful during development iterations.

.PARAMETER SkipNpmInstall
    If set, skip npm install. Useful when packaging for environments that will install later.

.EXAMPLE
    .\scripts\package.ps1
    # Packages to ./dist/drawio-skill-ultr and creates a zip.

.EXAMPLE
    .\scripts\package.ps1 -OutputDir "D:\releases\drawio-skill-v1.0" -InstallToClaude
    # Packages to a custom directory and installs to Claude Code.

.EXAMPLE
    .\scripts\package.ps1 -SkipZip -SkipNpmInstall
    # Quick packaging for local testing — just copy files, no zip, no npm.
#>

param(
    [string]$OutputDir = "",
    [switch]$InstallToClaude,
    [switch]$SkipZip,
    [switch]$SkipNpmInstall
)

$ErrorActionPreference = "Stop"
$script:StartTime = Get-Date

# ── Paths ──────────────────────────────────────────────────────────
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
if (-not $OutputDir) {
    $OutputDir = Join-Path $ProjectRoot "dist\drawio-skill-ultr"
}
$ZipPath = Join-Path (Split-Path -Parent $OutputDir) "drawio-skill-ultr.zip"
$ClaudeSkillsDir = Join-Path $env:USERPROFILE ".claude\skills\drawio-skill-ultr"

# ── Colors ─────────────────────────────────────────────────────────
function Write-Step {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "`n══ " -NoNewline -ForegroundColor $Color
    Write-Host $Message -NoNewline -ForegroundColor $Color
    Write-Host " ══" -ForegroundColor $Color
}
function Write-Ok {
    param([string]$Message)
    Write-Host "  ✔ " -NoNewline -ForegroundColor Green
    Write-Host $Message
}
function Write-Warn {
    param([string]$Message)
    Write-Host "  ⚠ " -NoNewline -ForegroundColor Yellow
    Write-Host $Message -ForegroundColor Yellow
}
function Write-Err {
    param([string]$Message)
    Write-Host "  ✘ " -NoNewline -ForegroundColor Red
    Write-Host $Message -ForegroundColor Red
}

# ── Banner ─────────────────────────────────────────────────────────
Write-Host @"

  ╔══════════════════════════════════════════════════════════╗
  ║     drawio-skill-ultr  Package Builder v1.0.0            ║
  ╚══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

Write-Host "  Project root : " -NoNewline; Write-Host $ProjectRoot -ForegroundColor White
Write-Host "  Output dir   : " -NoNewline; Write-Host $OutputDir -ForegroundColor White
Write-Host "  Zip output   : " -NoNewline; Write-Host $ZipPath -ForegroundColor White

# ── Step 1: Clean output directory ─────────────────────────────────
Write-Step "Step 1/5: Prepare output directory"

if (Test-Path $OutputDir) {
    Write-Warn "Removing existing directory: $OutputDir"
    Remove-Item -Recurse -Force $OutputDir
}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
Write-Ok "Created: $OutputDir"

# ── Step 2: Copy skill files ───────────────────────────────────────
Write-Step "Step 2/5: Copy skill files"

# Files to copy at root level
$RootFiles = @(
    "SKILL.md",
    "README.md",
    "LICENSE",
    "package.json",
    "package-lock.json"
)

foreach ($file in $RootFiles) {
    $src = Join-Path $ProjectRoot $file
    if (Test-Path $src) {
        Copy-Item $src $OutputDir -Force
        Write-Ok "Copied: $file"
    } else {
        Write-Warn "Skipped (not found): $file"
    }
}

# Directories to copy recursively (with their internal structure)
$CopyDirs = @{
    "scripts"    = "scripts"
    "assets"     = "assets"
    "references" = "references"
    "examples"   = "examples"
}

foreach ($dir in $CopyDirs.Keys) {
    $src = Join-Path $ProjectRoot $dir
    $dst = Join-Path $OutputDir $CopyDirs[$dir]
    if (Test-Path $src) {
        Copy-Item $src $dst -Recurse -Force
        $fileCount = (Get-ChildItem $dst -Recurse -File).Count
        Write-Ok "Copied: $dir\ ($fileCount files)"
    } else {
        Write-Warn "Skipped (not found): $dir\"
    }
}

# ── Step 3: Remove files that should NOT be in the package ─────────
Write-Step "Step 3/5: Clean package (remove dev artifacts)"

$ExcludePatterns = @(
    "*.drawio",           # Generated diagram files
    "*.dtmp",             # draw.io temp files
    "*.swp", "*.swo",     # Vim swap files
    "*.log",              # Log files
    ".DS_Store",          # macOS metadata
    "Thumbs.db"           # Windows thumbnails
)

$ExcludeDirs = @(
    "node_modules",       # Will be re-installed
    "output",             # Generated output
    "specs",              # Generated specs
    ".git",               # Not needed for distribution
    ".idea",              # IDE config
    ".vscode"             # IDE config
)

# Remove matching files
foreach ($pattern in $ExcludePatterns) {
    $found = Get-ChildItem $OutputDir -Recurse -File -Filter $pattern -ErrorAction SilentlyContinue
    foreach ($f in $found) {
        Remove-Item $f.FullName -Force
        Write-Warn "Removed: $($f.FullName.Substring($OutputDir.Length))"
    }
}

# Remove matching directories
foreach ($dirName in $ExcludeDirs) {
    $found = Get-ChildItem $OutputDir -Recurse -Directory -Filter $dirName -ErrorAction SilentlyContinue
    foreach ($d in $found) {
        Remove-Item $d.FullName -Recurse -Force
        Write-Warn "Removed dir: $($d.FullName.Substring($OutputDir.Length))"
    }
}

# Clean any empty directories
$emptyDirs = Get-ChildItem $OutputDir -Recurse -Directory |
    Where-Object { (Get-ChildItem $_.FullName -Force).Count -eq 0 }
foreach ($d in $emptyDirs) {
    Remove-Item $d.FullName -Force
}

Write-Ok "Package cleaned"

# ── Step 4: Install dependencies ───────────────────────────────────
Write-Step "Step 4/5: Install npm dependencies"

if (-not $SkipNpmInstall) {
    Push-Location $OutputDir
    try {
        $npmResult = npm install --production 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "npm install --production completed"
        } else {
            Write-Warn "npm install had warnings (elkjs is optional; the skill works without it)"
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Warn "Skipped npm install (--SkipNpmInstall)"
}

# ── Step 5: Create zip archive ─────────────────────────────────────
Write-Step "Step 5/5: Create distribution archive"

# Build a manifest summary
$totalFiles = (Get-ChildItem $OutputDir -Recurse -File).Count
$totalSize = [math]::Round(((Get-ChildItem $OutputDir -Recurse -File | Measure-Object Length -Sum).Sum / 1KB), 1)
$totalDirs = (Get-ChildItem $OutputDir -Recurse -Directory).Count

Write-Host ""
Write-Host "  Package summary:" -ForegroundColor White
Write-Host "    Files : $totalFiles" -ForegroundColor Gray
Write-Host "    Dirs  : $totalDirs" -ForegroundColor Gray
Write-Host "    Size  : $totalSize KB" -ForegroundColor Gray

if (-not $SkipZip) {
    # Remove old zip if exists
    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force
    }

    # Ensure parent dir exists for zip
    $zipDir = Split-Path -Parent $ZipPath
    if (-not (Test-Path $zipDir)) {
        New-Item -ItemType Directory -Force -Path $zipDir | Out-Null
    }

    # Use Compress-Archive (built-in PowerShell 5+)
    Compress-Archive -Path "$OutputDir\*" -DestinationPath $ZipPath -Force
    $zipSize = [math]::Round(((Get-Item $ZipPath).Length / 1KB), 1)
    Write-Ok "Created archive: $ZipPath ($zipSize KB)"
} else {
    Write-Warn "Skipped zip creation (--SkipZip)"
}

# ── Optional: Install to Claude Code skills dir ────────────────────
if ($InstallToClaude) {
    Write-Step "Extra: Install to Claude Code skills directory"

    if (Test-Path $ClaudeSkillsDir) {
        Write-Warn "Removing existing skill: $ClaudeSkillsDir"
        Remove-Item -Recurse -Force $ClaudeSkillsDir
    }
    New-Item -ItemType Directory -Force -Path $ClaudeSkillsDir | Out-Null
    Copy-Item "$OutputDir\*" $ClaudeSkillsDir -Recurse -Force
    Write-Ok "Installed to: $ClaudeSkillsDir"
} else {
    Write-Host ""
    Write-Host "  To install manually, copy to:" -ForegroundColor Gray
    Write-Host "    $ClaudeSkillsDir" -ForegroundColor Yellow
}

# ── Done ────────────────────────────────────────────────────────────
$elapsed = [math]::Round(((Get-Date) - $script:StartTime).TotalSeconds, 1)
Write-Host ""
Write-Host "══ Package complete in ${elapsed}s ══" -ForegroundColor Green
Write-Host ""
Write-Host "  Output  : $OutputDir" -ForegroundColor White
if (-not $SkipZip) {
    Write-Host "  Archive : $ZipPath" -ForegroundColor White
}
if ($InstallToClaude) {
    Write-Host "  Installed to: $ClaudeSkillsDir" -ForegroundColor White
}
Write-Host ""
