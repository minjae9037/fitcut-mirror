$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$webRoot = Join-Path $repoRoot "apps\web"
$domain = "https://mirilook.com/"
$wwwDomain = "https://www.mirilook.com/"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Name,
    [Parameter(Mandatory = $true)]
    [scriptblock] $Action
  )

  Write-Host ""
  Write-Host "==> $Name" -ForegroundColor Cyan
  & $Action
}

function Assert-OkUrl {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Url
  )

  $response = Invoke-WebRequest -Uri $Url -TimeoutSec 45
  if ($response.StatusCode -ne 200) {
    throw "$Url returned HTTP $($response.StatusCode)"
  }

  if ($response.Content -notmatch "Miri Look") {
    throw "$Url did not include expected Miri Look branding"
  }

  Write-Host "OK $Url HTTP $($response.StatusCode)" -ForegroundColor Green
}

Invoke-Step "Check Vercel project link" {
  $projectPath = Join-Path $webRoot ".vercel\project.json"
  if (-not (Test-Path $projectPath)) {
    throw "Missing $projectPath. Run Vercel link in apps/web first."
  }

  $project = Get-Content $projectPath -Raw | ConvertFrom-Json
  if ($project.projectName -ne "mirilook") {
    throw "apps/web is linked to '$($project.projectName)', expected 'mirilook'."
  }

  Write-Host "Linked project: $($project.projectName)" -ForegroundColor Green
}

Invoke-Step "Lint web app" {
  Push-Location $repoRoot
  try {
    npm.cmd run lint --workspace web
  } finally {
    Pop-Location
  }
}

Invoke-Step "Build web app" {
  Push-Location $repoRoot
  try {
    npm.cmd run build --workspace web
  } finally {
    Pop-Location
  }
}

Invoke-Step "Deploy to Vercel production from apps/web" {
  Push-Location $webRoot
  try {
    npx vercel deploy --prod --yes
  } finally {
    Pop-Location
  }
}

Invoke-Step "Verify production domains" {
  Assert-OkUrl $domain
  Assert-OkUrl $wwwDomain
}

Write-Host ""
Write-Host "Miri Look production deploy complete: $domain" -ForegroundColor Green
