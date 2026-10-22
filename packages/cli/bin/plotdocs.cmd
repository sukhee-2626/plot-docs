@echo off
rem plotdocs launcher for the packaged Windows app: <install>\resources\cli\plotdocs.cmd
setlocal
set ELECTRON_RUN_AS_NODE=1
"%~dp0..\..\PlotDocs.exe" "%~dp0plotdocs.cjs" %*
endlocal
