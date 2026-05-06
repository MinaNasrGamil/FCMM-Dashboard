param(
  [switch]$Once
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvPath = Join-Path $ScriptDir "fcmm-updater.env"

function Read-FcmmEnvFile {
  param([string]$Path)
  $config = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $config
  }
  Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) { return }
    $eq = $line.IndexOf('=')
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim()
    $value = $value.Trim("'`"")
    $config[$key] = $value
  }
  return $config
}

$config = Read-FcmmEnvFile -Path $EnvPath

$DashboardUrl = if ($config.FCMM_DASHBOARD_URL) { $config.FCMM_DASHBOARD_URL.TrimEnd('/') } else { $env:FCMM_DASHBOARD_URL }
$AgentSecret = if ($config.FCMM_AGENT_SECRET) { $config.FCMM_AGENT_SECRET } else { $env:FCMM_AGENT_SECRET }
$PollSeconds = if ($config.FCMM_POLL_SECONDS) { [int]$config.FCMM_POLL_SECONDS } elseif ($env:FCMM_POLL_SECONDS) { [int]$env:FCMM_POLL_SECONDS } else { 15 }
$RootPath = if ($config.FCMM_ROOT_PATH) { $config.FCMM_ROOT_PATH } elseif ($env:FCMM_ROOT_PATH) { $env:FCMM_ROOT_PATH } else { Join-Path $env:USERPROFILE "The British University in Egypt\Ahmed.Mehaya - FCMM Dashboard Files" }
$RootName = if ($config.FCMM_ROOT_NAME) { $config.FCMM_ROOT_NAME } elseif ($env:FCMM_ROOT_NAME) { $env:FCMM_ROOT_NAME } else { "Faculty of Communication and Mass Media" }
$MachineName = if ($config.FCMM_MACHINE_NAME) { $config.FCMM_MACHINE_NAME } elseif ($env:FCMM_MACHINE_NAME) { $env:FCMM_MACHINE_NAME } else { $env:COMPUTERNAME }

if ([string]::IsNullOrWhiteSpace($DashboardUrl)) {
  Write-Host "Missing FCMM_DASHBOARD_URL. Create scripts\fcmm-updater.env first."
  exit 1
}
if ([string]::IsNullOrWhiteSpace($AgentSecret)) {
  Write-Host "Warning: FCMM_AGENT_SECRET is empty. Use a strong secret in production."
}

$Headers = @{}
if (-not [string]::IsNullOrWhiteSpace($AgentSecret)) {
  $Headers.Authorization = "Bearer $AgentSecret"
}

$IgnoreNames = @(
  'desktop.ini',
  'Thumbs.db',
  'structure.txt',
  'FCMMDashboardApp',
  'FCMM_Dashboard.html',
  'update-dashboard.bat',
  'update-dashboard.ps1',
  'update-dashboard.js',
  'dashboard-sync.config.json',
  'node_modules',
  '.git'
)
$IgnorePrefixes = @('~$', '.')
$PathIdMap = @{
  '.' = 'home'
  'HR' = 'hr'
  'HR/Recruitment' = 'recruitment'
  'HR/Recruitment/Full Time' = 'fulltime'
  'HR/Recruitment/Part Time' = 'parttime'
  'HR/Compensation & Benefits' = 'comp'
  'Finance' = 'finance'
  'Finance/Faculty Budget' = 'faculty'
}

function Test-IgnoreName {
  param([string]$Name)
  if ($IgnoreNames -contains $Name) { return $true }
  foreach ($prefix in $IgnorePrefixes) {
    if ($Name.StartsWith($prefix)) { return $true }
  }
  return $false
}

function Get-FcmmFileType {
  param([string]$Name)
  $ext = [System.IO.Path]::GetExtension($Name).TrimStart('.').ToLowerInvariant()
  if (@('xls','xlsx','xlsm','csv') -contains $ext) { return 'excel' }
  if (@('doc','docx','txt','msg') -contains $ext) { return 'word' }
  if ($ext -eq 'pdf') { return 'pdf' }
  if (@('png','jpg','jpeg','gif','webp','bmp','tif','tiff') -contains $ext) { return 'image' }
  if (@('zip','rar','7z') -contains $ext) { return 'zip' }
  return 'word'
}

function Remove-FcmmExtension {
  param([string]$Name)
  return [System.IO.Path]::GetFileNameWithoutExtension($Name)
}

function New-FcmmNode {
  param(
    [string]$AbsPath,
    [string]$RelPath = ''
  )

  $displayPath = if ([string]::IsNullOrWhiteSpace($RelPath)) { '.' } else { $RelPath }
  $nodeName = if ([string]::IsNullOrWhiteSpace($RelPath)) { $RootName } else { Split-Path -Leaf $AbsPath }

  $node = [ordered]@{
    name = $nodeName
    type = 'folder'
    path = $displayPath
    children = @()
  }

  if ($PathIdMap.ContainsKey($displayPath)) {
    $node.id = $PathIdMap[$displayPath]
  }

  $entries = Get-ChildItem -LiteralPath $AbsPath -Force -ErrorAction Stop |
    Where-Object { -not (Test-IgnoreName -Name $_.Name) } |
    Sort-Object @{ Expression = { if ($_.PSIsContainer) { 0 } else { 1 } } }, @{ Expression = { $_.Name } }

  foreach ($entry in $entries) {
    $childAbs = $entry.FullName
    $childRel = if ([string]::IsNullOrWhiteSpace($RelPath)) { $entry.Name } else { "$RelPath/$($entry.Name)" }

    if ($entry.PSIsContainer) {
      $node.children += New-FcmmNode -AbsPath $childAbs -RelPath $childRel
    } else {
      $node.children += [ordered]@{
        name = Remove-FcmmExtension -Name $entry.Name
        type = Get-FcmmFileType -Name $entry.Name
        path = $childRel
      }
    }
  }

  return $node
}

function Get-FcmmItemCount {
  param($Node)
  $count = 1
  foreach ($child in @($Node.children)) {
    if ($child.type -eq 'folder') {
      $count += Get-FcmmItemCount -Node $child
    } else {
      $count += 1
    }
  }
  return $count
}

function Invoke-FcmmApi {
  param(
    [string]$Path,
    [string]$Method = 'GET',
    $Body = $null
  )

  $uri = "$DashboardUrl$Path"
  $params = @{
    Uri = $uri
    Method = $Method
    Headers = $Headers
    ErrorAction = 'Stop'
  }

  if ($null -ne $Body) {
    $jsonBody = $Body | ConvertTo-Json -Depth 100 -Compress
    $params.Body = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
    $params.ContentType = 'application/json; charset=utf-8'
  }

  return Invoke-RestMethod @params
}

function Set-FcmmSyncState {
  param(
    [string]$Action,
    [hashtable]$Extra = @{}
  )

  $body = @{
    action = $Action
    machine = $MachineName
  }
  foreach ($key in $Extra.Keys) {
    $body[$key] = $Extra[$key]
  }
  return Invoke-FcmmApi -Path '/api/sync-request' -Method 'PATCH' -Body $body
}

function Send-FcmmDashboardData {
  param(
    $Data,
    [int]$ItemCount
  )

  $body = @{
    data = $Data
    metadata = @{
      updatedByMachine = $MachineName
      sourceRoot = $RootPath
      itemCount = $ItemCount
      generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    }
  }

  return Invoke-FcmmApi -Path '/api/dashboard-data' -Method 'POST' -Body $body
}

function Invoke-FcmmPendingSync {
  param($State)

  $requestId = $State.requestId
  Write-Host "[$((Get-Date).ToUniversalTime().ToString('o'))] Sync request found: $requestId"

  Set-FcmmSyncState -Action 'start' -Extra @{ requestId = $requestId } | Out-Null

  try {
    if (-not (Test-Path -LiteralPath $RootPath)) {
      throw "Root path not found: $RootPath"
    }

    $data = New-FcmmNode -AbsPath $RootPath -RelPath ''
    $itemCount = Get-FcmmItemCount -Node $data
    $upload = Send-FcmmDashboardData -Data $data -ItemCount $itemCount

    Set-FcmmSyncState -Action 'complete' -Extra @{
      requestId = $requestId
      itemCount = $itemCount
      dataUpdatedAt = $upload.updatedAt
    } | Out-Null

    Write-Host "[$((Get-Date).ToUniversalTime().ToString('o'))] Sync completed. Items: $itemCount"
  }
  catch {
    $message = $_.Exception.Message
    Write-Host "[$((Get-Date).ToUniversalTime().ToString('o'))] Sync failed: $message"
    Set-FcmmSyncState -Action 'fail' -Extra @{
      requestId = $requestId
      error = $message
    } | Out-Null
  }
}

function Invoke-FcmmTick {
  try {
    $result = Invoke-FcmmApi -Path '/api/sync-request' -Method 'GET'
    $state = $result.state
    if ($state.status -eq 'pending') {
      Invoke-FcmmPendingSync -State $state
    } else {
      Write-Host "[$((Get-Date).ToUniversalTime().ToString('o'))] No pending request. Status: $($state.status)"
    }
  }
  catch {
    Write-Host "[$((Get-Date).ToUniversalTime().ToString('o'))] Poll failed: $($_.Exception.Message)"
  }
}

Write-Host "FCMM PowerShell updater agent started"
Write-Host "Dashboard: $DashboardUrl"
Write-Host "Root path: $RootPath"
Write-Host "Machine: $MachineName"
Write-Host "Polling every $PollSeconds seconds"

if ($Once) {
  Invoke-FcmmTick
  exit 0
}

while ($true) {
  Invoke-FcmmTick
  Start-Sleep -Seconds $PollSeconds
}
