Set-Location $PSScriptRoot
Start-Process "http://localhost:8080"
try {
    python -m http.server 8080
}
catch {
    py -m http.server 8080
}
