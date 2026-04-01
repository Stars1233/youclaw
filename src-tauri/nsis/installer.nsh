; Kill app and sidecar processes before install/uninstall
!macro KillAppProcesses
  ; Kill main app
  nsExec::ExecToLog 'taskkill /F /IM "You Claw.exe"'
  ; Kill sidecar (compiled bun binary)
  nsExec::ExecToLog 'taskkill /F /IM "youclaw-server.exe"'
  ; Wait for processes to exit
  Sleep 1000
!macroend

; Register youclaw:// deep-link protocol in Windows registry
!macro RegisterDeepLink
  WriteRegStr HKCU "Software\Classes\youclaw" "" "URL:YouClaw Protocol"
  WriteRegStr HKCU "Software\Classes\youclaw" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\youclaw\DefaultIcon" "" "$INSTDIR\You Claw.exe,0"
  WriteRegStr HKCU "Software\Classes\youclaw\shell\open\command" "" '"$INSTDIR\You Claw.exe" "%1"'
!macroend

; Called before install — silently remove old version + kill processes
!macro NSIS_HOOK_PREINSTALL
  !insertmacro KillAppProcesses
!macroend

; Called after install — ensure deep-link protocol is registered with current exe path
!macro NSIS_HOOK_POSTINSTALL
  !insertmacro RegisterDeepLink
!macroend

; Called before uninstall — kill processes so files can be deleted
!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro KillAppProcesses
!macroend

; Called after uninstall — clean up deep-link protocol registry
!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegKey HKCU "Software\Classes\youclaw"
!macroend
