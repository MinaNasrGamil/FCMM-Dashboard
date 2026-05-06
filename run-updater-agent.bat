param(
  [string]$TaskName = "FCMM Dashboard Updater Agent"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentScript = Join-Path $ScriptDir "fcmm-updater-agent.ps1"
$EnvFile = Join-Path $ScriptDir "fcmm-updater.env"

if (-not (Test-Path -LiteralPath $EnvFile)) {
  Write-Host "Missing fcmm-updater.env"
  Write-Host "Copy fcmm-updater.env.example to fcmm-updater.env and edit it first."
  exit 1
}

$PowerShell = (Get-Command powershell.exe -ErrorAction SilentlyContinue).Source
if (-not $PowerShell) {
  Write-Host "powershell.exe was not found."
  exit 1
}

$Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$AgentScript`""
$Action = New-ScheduledTaskAction -Execute $PowerShell -Argument $Arguments -WorkingDirectory $ScriptDir
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "FCMM Dashboard on-demand PowerShell updater agent" -Force
Start-ScheduledTask -TaskName $TaskName

Write-Host "Task installed and started: $TaskName"
Write-Host "The PowerShell updater agent will start whenever this Windows user logs in."
