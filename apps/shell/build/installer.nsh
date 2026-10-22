; Keeps the plotdocs command line (resources\cli, holding plotdocs.cmd and the
; extension-less plotdocs for Git Bash) on the installing user's PATH for the
; lifetime of the install. The value is read and written unexpanded
; (REG_EXPAND_SZ) so entries such as %USERPROFILE%\bin survive, and Explorer
; is told about the change so terminals opened afterwards see it.
; electron-builder compiles the script twice (the second pass, with
; BUILD_UNINSTALLER, only produces the uninstaller); an unreferenced function
; in either pass is a warning makensis treats as an error, hence the guards.
!include "WinMessages.nsh"
!include "StrFunc.nsh"
!include "nsProcess.nsh"

!macro SSOfficeKillHelper NAME
  ${nsProcess::FindProcess} "${NAME}" $R0
  ${if} $R0 == 0
    ${nsProcess::KillProcess} "${NAME}" $R0
    Sleep 300
  ${endIf}
!macroend

; electron-builder's stock CHECK_APP_RUNNING runs powershell.exe via nsExec
; (CREATE_NEW_CONSOLE + SW_HIDE); Windows Terminal as default host ignores
; SW_HIDE, so every silent update flashed a PowerShell window. nsProcess does
; the same work in-process. Used by both the installer and the uninstaller.
!macro customCheckAppRunning
  ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  ${if} $R0 == 0
    ${if} ${isUpdated}
      ; let the app finish quitting on its own
      Sleep 1000
      Goto plotdocsStopApp
    ${endIf}
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK plotdocsStopApp
    Quit

    plotdocsStopApp:
    DetailPrint "$(appClosing)"
    ${nsProcess::CloseProcess} "${APP_EXECUTABLE_FILENAME}" $R0
    Sleep 300
    StrCpy $R1 0

    plotdocsWaitLoop:
      IntOp $R1 $R1 + 1
      ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
      ${if} $R0 == 0
        Sleep 1000
        ${nsProcess::KillProcess} "${APP_EXECUTABLE_FILENAME}" $R0
        ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
        ${if} $R0 == 0
          DetailPrint `Waiting for "${PRODUCT_NAME}" to close.`
          Sleep 2000
        ${else}
          Goto plotdocsAppClosed
        ${endIf}
      ${else}
        Goto plotdocsAppClosed
      ${endIf}
      ${if} $R1 > 1
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY plotdocsWaitLoop
        Quit
      ${else}
        Goto plotdocsWaitLoop
      ${endIf}
    plotdocsAppClosed:
  ${endIf}
  ; the stock macro closed every process under $INSTDIR; a killed app can
  ; orphan its helpers, which keep their binaries locked
  !insertmacro SSOfficeKillHelper "xlsx-sidecar.exe"
  !insertmacro SSOfficeKillHelper "win-ocr.exe"
  ${nsProcess::Unload}
!macroend

!define PLOTDOCS_PATH_MAX 7900

; Scope templates to our ProgIDs (electron-builder uses fileAssociations.name).
; A shared .ext\ShellNew would overwrite Office/WPS templates. OOXML files
; must be copied from valid packages, never created with NullFile.
!macro SSOfficeRegisterShellNew EXT PROGID
  WriteRegStr SHELL_CONTEXT "Software\Classes\.${EXT}\${PROGID}\ShellNew" "FileName" "$INSTDIR\resources\shell-new\blank.${EXT}"
!macroend

!macro SSOfficeUnregisterShellNew EXT PROGID
  ; Only remove our own registration, including when uninstalling for an update.
  ReadRegStr $0 SHELL_CONTEXT "Software\Classes\.${EXT}\${PROGID}\ShellNew" "FileName"
  ${If} $0 == "$INSTDIR\resources\shell-new\blank.${EXT}"
    DeleteRegKey SHELL_CONTEXT "Software\Classes\.${EXT}\${PROGID}\ShellNew"
    DeleteRegKey /ifempty SHELL_CONTEXT "Software\Classes\.${EXT}\${PROGID}"
  ${EndIf}
!macroend

!macro customInstall
  Push "$INSTDIR\resources\cli"
  Call SSOfficeAddToUserPath
  !insertmacro SSOfficeRegisterShellNew "docx" "Word Document"
  !insertmacro SSOfficeRegisterShellNew "xlsx" "Excel Workbook"
  !insertmacro SSOfficeRegisterShellNew "pptx" "PowerPoint Presentation"
  !insertmacro UPDATEFILEASSOC
!macroend

!macro customUnInstall
  Push "$INSTDIR\resources\cli"
  Call un.SSOfficeRemoveFromUserPath
  Push $0
  !insertmacro SSOfficeUnregisterShellNew "docx" "Word Document"
  !insertmacro SSOfficeUnregisterShellNew "xlsx" "Excel Workbook"
  !insertmacro SSOfficeUnregisterShellNew "pptx" "PowerPoint Presentation"
  Pop $0
  !insertmacro UPDATEFILEASSOC
!macroend

!ifndef BUILD_UNINSTALLER
${StrStr}

Function SSOfficeAddToUserPath
  Exch $0 ; directory
  Push $1
  Push $2
  Push $3
  ReadRegStr $1 HKCU "Environment" "Path"
  StrLen $2 $1
  ; leave an already oversized PATH alone rather than truncate it
  IntCmp $2 ${PLOTDOCS_PATH_MAX} done 0 done
  ${StrStr} $3 ";$1;" ";$0;"
  StrCmp $3 "" 0 done
  StrCmp $1 "" 0 +3
    StrCpy $1 "$0"
    Goto write
  StrCpy $1 "$1;$0"
write:
  WriteRegExpandStr HKCU "Environment" "Path" $1
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
done:
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd
!endif

!ifdef BUILD_UNINSTALLER
${UnStrStr}
${UnStrRep}

Function un.SSOfficeRemoveFromUserPath
  Exch $0 ; directory
  Push $1
  Push $2
  ReadRegStr $1 HKCU "Environment" "Path"
  StrCmp $1 "" done
  ${UnStrStr} $2 ";$1;" ";$0;"
  StrCmp $2 "" done
  StrCpy $1 ";$1;"
  ${UnStrRep} $1 $1 ";$0;" ";"
  ; strip the sentinels added above
  StrCpy $1 $1 -1
  StrCpy $1 $1 "" 1
  WriteRegExpandStr HKCU "Environment" "Path" $1
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
done:
  Pop $2
  Pop $1
  Pop $0
FunctionEnd
!endif
