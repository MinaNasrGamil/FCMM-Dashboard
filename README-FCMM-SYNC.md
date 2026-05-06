# FCMM Dashboard On-Demand Sync - PowerShell Version

## What changed

The website Update button no longer opens the browser File Explorer.

Instead:

1. The website sends a sync request to Vercel.
2. The PowerShell updater agent running on the editor's PC sees the request.
3. The agent scans the local OneDrive synced folder.
4. The agent uploads the generated dashboard JSON to Vercel Blob.
5. The website reloads the latest shared dashboard data.

## Important

- The viewer PC does not need Node.js, PowerShell scripts, or OneDrive sync.
- The editor PC only needs Windows PowerShell, which is already available on Windows.
- Node.js is only used by Vercel serverless functions in the cloud, not by the editor or viewer PC.

## Files added

```text
api/dashboard-data.js
api/sync-request.js
scripts/fcmm-updater-agent.ps1
scripts/fcmm-updater.env.example
scripts/install-updater-task.ps1
scripts/run-updater-agent.bat
```

## Required Vercel Environment Variables

In Vercel Project Settings, add:

```text
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
FCMM_AGENT_SECRET=use-a-long-random-secret
```

The same `FCMM_AGENT_SECRET` must be added to the editor PC env file.

## Editor PC setup

1. Make sure OneDrive is synced locally.
2. Copy:

```text
scripts/fcmm-updater.env.example
```

to:

```text
scripts/fcmm-updater.env
```

3. Edit `scripts/fcmm-updater.env`:

```text
FCMM_DASHBOARD_URL=https://your-project.vercel.app
FCMM_AGENT_SECRET=same-secret-as-vercel
```

Optional path override:

```text
FCMM_ROOT_PATH=C:\Users\mina\The British University in Egypt\Ahmed.Mehaya - FCMM Dashboard Files
```

If `FCMM_ROOT_PATH` is not set, the agent uses:

```text
%USERPROFILE%\The British University in Egypt\Ahmed.Mehaya - FCMM Dashboard Files
```

## Test manually

Double-click:

```text
scripts/run-updater-agent.bat
```

Or run from PowerShell:

```powershell
.\scripts\fcmm-updater-agent.ps1 -Once
```

## Run in background on Windows login

Open PowerShell as the editor Windows user and run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\scripts\install-updater-task.ps1
```

After that, the updater agent starts automatically when the editor logs in.

## Normal usage

- Viewer or editor opens the website.
- Anyone presses Update.
- If the editor PC updater agent is running, the dashboard updates automatically.
- If the editor PC is offline, the request stays pending until the updater agent runs.
