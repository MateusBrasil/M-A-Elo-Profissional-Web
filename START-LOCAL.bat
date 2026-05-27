@echo off
setlocal

set "SITE_DIR=%~dp0"
set "AGENT_DIR=C:\Users\mateu\Desktop\Projetos\ma-elo-profissional\ma-elo-recruitment-agent"

echo Starting M&A Elo local preview...
echo.
echo Website:    http://localhost:4174/profissoes.html
echo Forms app:  http://localhost:3005/apply/soldador
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$site='%SITE_DIR%'; $agent='%AGENT_DIR%';" ^
  "function Test-Port($port){ try { $c=New-Object Net.Sockets.TcpClient; $iar=$c.BeginConnect('127.0.0.1',$port,$null,$null); $ok=$iar.AsyncWaitHandle.WaitOne(500); if($ok){$c.EndConnect($iar)}; $c.Close(); return $ok } catch { return $false } }" ^
  "if(-not (Test-Port 4174)){ Start-Process cmd -ArgumentList '/k', ('cd /d ""' + $site + '"" && python -m http.server 4174') }" ^
  "if(-not (Test-Port 3005)){ Start-Process cmd -ArgumentList '/k', ('cd /d ""' + $agent + '"" && npm.cmd start') }" ^
  "for($i=0; $i -lt 20; $i++){ if((Test-Port 4174) -and (Test-Port 3005)){ break }; Start-Sleep -Milliseconds 500 }" ^
  "if((Test-Port 4174) -and (Test-Port 3005)){ Start-Process 'http://localhost:4174/profissoes.html'; Start-Process 'http://localhost:3005/apply/soldador' } else { Write-Host 'Nao foi possivel iniciar os dois servidores. Verifique as janelas abertas.'; pause }"

endlocal
