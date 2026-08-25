; ════════════════════════════════════════════════════════════════
; ChillPass Web — NSIS Installer Script
; Requires: NSIS 3.x with MUI2
; ════════════════════════════════════════════════════════════════

; ── Includes ────────────────────────────────────────────────────
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "nsDialogs.nsh"
!include "WinVer.nsh"

; ── App Info ────────────────────────────────────────────────────
!define APP_NAME         "ChillPass"
!define APP_NAME_FULL    "ChillPass 期末冲刺助手"
!define APP_VERSION      "0.0.7"
!define APP_PUBLISHER    "ChillPass"
!define APP_URL          "https://github.com/Koipoppy/ChillPass-Web"
!define APP_EXE          "chillpass.exe"
!define APP_REGKEY       "Software\ChillPass"
!define APP_UNINST_KEY   "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChillPass"
!define GITHUB_REPO      "Koipoppy/ChillPass-Web"

; ── Installer Config ────────────────────────────────────────────
Name "${APP_NAME} ${APP_VERSION}"
OutFile "ChillPass-Setup-${APP_VERSION}.exe"
Unicode True
ShowInstDetails show
ShowUnInstDetails show
SetCompressor /SOLID lzma
RequestExecutionLevel user

; Per-user install (no admin needed)
InstallDir "$LOCALAPPDATA\Programs\ChillPass"
InstallDirRegKey HKCU "${APP_REGKEY}" "InstallDir"

; ── Version Info (shown in file properties) ─────────────────────
VIAddVersionKey "ProductName"      "${APP_NAME}"
VIAddVersionKey "FileDescription"  "${APP_NAME} 安装程序"
VIAddVersionKey "CompanyName"      "${APP_PUBLISHER}"
VIAddVersionKey "LegalCopyright"   "MIT License"
VIAddVersionKey "FileVersion"      "${APP_VERSION}"
VIAddVersionKey "ProductVersion"   "${APP_VERSION}"
VIProductVersion "0.0.7.0"
VIFileVersion    "0.0.7.0"

; ── Modern UI 2 Settings ────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON                   "icon.ico"
!define MUI_UNICON                  "icon.ico"
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_UNFINISHPAGE_NOAUTOCLOSE

; ── Pages: Install ──────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
Page custom OptionsPageCreate OptionsPageLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; ── Pages: Uninstall ────────────────────────────────────────────
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; ── Languages ───────────────────────────────────────────────────
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

; ── Variables ───────────────────────────────────────────────────
Var CheckboxAutostart
Var CheckboxLaunch
Var OptAutostart
Var OptLaunch

; ════════════════════════════════════════════════════════════════
; Custom Options Page
; ════════════════════════════════════════════════════════════════
Function OptionsPageCreate
  ; Skip this page in silent mode
  IfSilent +2 0
    Abort

  !insertmacro MUI_HEADER_TEXT "安装选项" "选择您想要的附加选项"

  nsDialogs::Create 1018
  Pop $0

  ${If} $0 == error
    Abort
  ${EndIf}

  ; Auto-start with Windows
  ${NSD_CreateCheckbox} 0 10u 100% 12u "开机自动启动 ChillPass"
  Pop $CheckboxAutostart

  ; Launch after install
  ${NSD_CreateCheckbox} 0 30u 100% 12u "安装完成后启动 ChillPass"
  Pop $CheckboxLaunch
  ${NSD_SetState} $CheckboxLaunch ${BST_CHECKED}

  nsDialogs::Show
FunctionEnd

Function OptionsPageLeave
  ${NSD_GetState} $CheckboxAutostart $OptAutostart
  ${NSD_GetState} $CheckboxLaunch    $OptLaunch
FunctionEnd

; ════════════════════════════════════════════════════════════════
; Launch App (called from Finish page or manually)
; ════════════════════════════════════════════════════════════════
Function LaunchApp
  Exec '"$INSTDIR\${APP_EXE}"'
FunctionEnd

; ════════════════════════════════════════════════════════════════
; Install Section
; ════════════════════════════════════════════════════════════════
Section "Install" SecInstall
  SectionIn RO

  ; ── Kill running instance ──────────────────────────────────
  DetailPrint "正在关闭运行中的 ChillPass..."
  nsExec::ExecToLog 'taskkill /f /im "${APP_EXE}" /t'
  Pop $0
  Sleep 1000

  ; ── Set output path ────────────────────────────────────────
  SetOutPath "$INSTDIR"

  ; ── Install files ──────────────────────────────────────────
  DetailPrint "正在安装文件..."
  File "chillpass.exe"
  File "tray.ps1"
  File "icon.ico"
  File "updater.ps1"

  ; ── Install dist/ as a subdirectory (preserve structure) ───
  SetOutPath "$INSTDIR\dist"
  File /r "dist\*.*"
  SetOutPath "$INSTDIR"

  ; ── Start Menu shortcuts ───────────────────────────────────
  DetailPrint "正在创建快捷方式..."
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" \
    "$INSTDIR\${APP_EXE}" "" "$INSTDIR\icon.ico" 0
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\检查更新.lnk" \
    "powershell.exe" '-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File "$INSTDIR\updater.ps1"' \
    "$INSTDIR\icon.ico" 0
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\卸载 ${APP_NAME}.lnk" \
    "$INSTDIR\uninstall.exe" "" "$INSTDIR\icon.ico" 0

  ; ── Desktop shortcut (always created on install) ───────────
  DetailPrint "正在创建桌面快捷方式..."
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" \
    "$INSTDIR\${APP_EXE}" "" "$INSTDIR\icon.ico" 0

  ; ── Auto-start (optional) ──────────────────────────────────
  ${If} $OptAutostart == ${BST_CHECKED}
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" \
      "${APP_NAME}" '"$INSTDIR\${APP_EXE}"'
  ${Else}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}"
  ${EndIf}

  ; ── Uninstaller ────────────────────────────────────────────
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; ── Registry: app info ─────────────────────────────────────
  WriteRegStr   HKCU "${APP_REGKEY}" "InstallDir" "$INSTDIR"
  WriteRegStr   HKCU "${APP_REGKEY}" "Version"    "${APP_VERSION}"
  WriteRegStr   HKCU "${APP_REGKEY}" "ExePath"    "$INSTDIR\${APP_EXE}"

  ; ── Registry: Add/Remove Programs ──────────────────────────
  WriteRegStr   HKCU "${APP_UNINST_KEY}" "DisplayName"     "${APP_NAME}"
  WriteRegStr   HKCU "${APP_UNINST_KEY}" "DisplayVersion"  "${APP_VERSION}"
  WriteRegStr   HKCU "${APP_UNINST_KEY}" "Publisher"       "${APP_PUBLISHER}"
  WriteRegStr   HKCU "${APP_UNINST_KEY}" "DisplayIcon"     "$INSTDIR\icon.ico"
  WriteRegStr   HKCU "${APP_UNINST_KEY}" "URLInfoAbout"    "${APP_URL}"
  WriteRegStr   HKCU "${APP_UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr   HKCU "${APP_UNINST_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr   HKCU "${APP_UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\uninstall.exe" /S'
  WriteRegDWORD HKCU "${APP_UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${APP_UNINST_KEY}" "NoRepair" 1

  ; ── Calculate install size ─────────────────────────────────
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${APP_UNINST_KEY}" "EstimatedSize" "$0"

  ; ── Launch app (non-silent only) ───────────────────────────
  ${IfNot} ${Silent}
    ${If} $OptLaunch == ${BST_CHECKED}
      Call LaunchApp
    ${EndIf}
  ${EndIf}

  DetailPrint "安装完成！"
SectionEnd

; ════════════════════════════════════════════════════════════════
; Uninstall Section
; ════════════════════════════════════════════════════════════════
Section "Uninstall"
  ; ── Kill running instance ──────────────────────────────────
  DetailPrint "正在关闭 ChillPass..."
  nsExec::ExecToLog 'taskkill /f /im "${APP_EXE}" /t'
  Pop $0
  Sleep 1000

  ; ── Delete app files ───────────────────────────────────────
  Delete "$INSTDIR\${APP_EXE}"
  Delete "$INSTDIR\tray.ps1"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\updater.ps1"
  Delete "$INSTDIR\uninstall.exe"

  ; ── Delete dist directory ──────────────────────────────────
  RMDir /r "$INSTDIR\dist"

  ; ── Delete install directory (if empty) ────────────────────
  RMDir "$INSTDIR"

  ; ── Delete shortcuts ───────────────────────────────────────
  Delete "$DESKTOP\${APP_NAME}.lnk"
  RMDir /r "$SMPROGRAMS\${APP_NAME}"

  ; ── Delete registry entries ────────────────────────────────
  DeleteRegKey HKCU "${APP_UNINST_KEY}"
  DeleteRegKey HKCU "${APP_REGKEY}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}"

  DetailPrint "卸载完成。"
SectionEnd
