; Script NSIS customizado para o instalador do MontShop Desktop
; Personalização da interface do instalador com branding do sistema

; Variáveis para personalização (apenas se não estiverem definidas pelo electron-builder)
!ifndef PRODUCT_NAME
  !define PRODUCT_NAME "MontShop Desktop"
!endif
!ifndef PRODUCT_PUBLISHER
  !define PRODUCT_PUBLISHER "MontShop"
!endif
!ifndef PRODUCT_WEB_SITE
  !define PRODUCT_WEB_SITE "https://montshop.com"
!endif

; Macro para cabeçalho customizado (executado antes da instalação)
!macro customHeader
  ; Personalização adicional do cabeçalho pode ser feita aqui
  ; O electron-builder já inclui o MUI2 por padrão
!macroend

; Macro para instalação customizada (executado após instalação dos arquivos)
!macro customInstall
  ; Garantir que o logo.png seja incluído nos recursos do instalador
  ; O electron-builder já copia arquivos do diretório dist
  
  ; Criar atalho no desktop com ícone personalizado (usando logo.png)
  CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_NAME}.exe" "" "$INSTDIR\resources\logo.png" 0
  
  ; Criar diretório no menu iniciar
  CreateDirectory "$SMPROGRAMS\${PRODUCT_PUBLISHER}"
  CreateShortcut "$SMPROGRAMS\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_NAME}.exe" "" "$INSTDIR\resources\logo.png" 0
  
  ; Registrar informações no registro para controle de versão e atualizações
  WriteRegStr HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}" "Version" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayIcon" "$INSTDIR\resources\logo.png"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
!macroend

; Macro para desinstalação customizada
!macro customUnInstall
  ; Remover atalhos do desktop
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  
  ; Remover atalhos do menu iniciar
  Delete "$SMPROGRAMS\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_PUBLISHER}"
  
  ; Remover chave de registro personalizada
  DeleteRegKey HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}"
!macroend

