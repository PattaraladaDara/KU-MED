$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$projectRoot = $PSScriptRoot
$composeFile = Join-Path $projectRoot 'compose.yaml'
$logFile = Join-Path $projectRoot 'update-ku-med.log'
$dockerLogFile = Join-Path $projectRoot 'update-ku-med-docker.log'
Start-Transcript -Path $logFile -Force
try {
    Push-Location -LiteralPath $projectRoot
    Write-Host "Building project: $projectRoot"
    $source = Get-Content -LiteralPath (Join-Path $projectRoot 'src/components/payment-workflow.tsx') -Raw
    if (-not $source.Contains('cash-v2')) { throw 'The selected folder does not contain the updated payment form.' }
    $env:KUMED_BUILD_ID = [DateTimeOffset]::Now.ToUnixTimeSeconds().ToString()
    # Windows PowerShell 5 converts ordinary Docker stderr progress into errors.
    # Keep streaming it to the log and decide success from Docker's exit code.
    $ErrorActionPreference = 'Continue'
    docker compose --progress plain -f $composeFile --project-directory $projectRoot build app migrate 2>&1 | Tee-Object -FilePath $dockerLogFile
    $buildExitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($buildExitCode -ne 0) { throw 'Build failed. The old container has not been replaced. See update-ku-med-docker.log.' }
    $ErrorActionPreference = 'Continue'
    docker compose -f $composeFile --project-directory $projectRoot up -d db 2>&1 | Tee-Object -FilePath $dockerLogFile -Append
    $databaseExitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($databaseExitCode -ne 0) { throw 'Database startup failed. See update-ku-med-docker.log.' }
    $ErrorActionPreference = 'Continue'
    docker compose -f $composeFile --project-directory $projectRoot run --rm migrate 2>&1 | Tee-Object -FilePath $dockerLogFile -Append
    $migrationExitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($migrationExitCode -ne 0) { throw 'Migration failed. App deployment stopped. See update-ku-med-docker.log.' }
    $ErrorActionPreference = 'Continue'
    docker compose -f $composeFile --project-directory $projectRoot up -d --no-deps --force-recreate app 2>&1 | Tee-Object -FilePath $dockerLogFile -Append
    $appExitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($appExitCode -ne 0) { throw 'App startup failed. See update-ku-med-docker.log.' }
    $verified = $false
    for ($attempt = 0; $attempt -lt 12; $attempt++) {
        $ErrorActionPreference = 'Continue'
        docker compose -f $composeFile --project-directory $projectRoot exec -T app node scripts/verify-payment-build.mjs http://127.0.0.1:3000 2>&1 | Tee-Object -FilePath $dockerLogFile -Append
        $verificationExitCode = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        if ($verificationExitCode -eq 0) { $verified = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $verified) { throw 'The running app did not pass payment verification. See update-ku-med.log.' }
    Write-Host 'SUCCESS: Updated cash payment form is running. Reload the patient page.' -ForegroundColor Green
} finally {
    Pop-Location
    Stop-Transcript
}
