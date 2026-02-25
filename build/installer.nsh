; Script NSIS customizado para o instalador do Montshop Desktop
; Personalização completa da interface do instalador com branding do sistema
; Cores: Azul primário #3b82f6 (RGB: 59, 130, 246)

; Variáveis para personalização (apenas se não estiverem definidas pelo electron-builder)
!ifndef PRODUCT_NAME
  !define PRODUCT_NAME "Montshop Desktop"
!endif
!ifndef PRODUCT_PUBLISHER
  !define PRODUCT_PUBLISHER "Montshop"
!endif
!ifndef PRODUCT_WEB_SITE
  !define PRODUCT_WEB_SITE "https://montshop.com"
!endif

; Cores do tema Montshop (Azul primário)
!define COLOR_PRIMARY "0x3b82f6"      ; Azul primário
!define COLOR_PRIMARY_DARK "0x2563eb" ; Azul escuro para hover
!define COLOR_BACKGROUND "0xffffff"   ; Branco
!define COLOR_TEXT "0x0a0a0a"         ; Texto escuro
!define COLOR_TEXT_MUTED "0x737373"   ; Texto cinza
!define COLOR_BORDER "0xe5e5e5"       ; Borda cinza claro

; Macro para cabeçalho customizado (executado antes da instalação)
!macro customHeader
  ; Incluir MUI2 se ainda não estiver incluído
  !include "MUI2.nsh"
  
  ; Configurações do MUI2 com cores personalizadas
  ; NOTA: MUI_ICON e MUI_UNICON são definidos automaticamente pelo electron-builder
  ; Não definir aqui para evitar conflitos
  !ifndef MUI_ICON
    !define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
  !endif
  !ifndef MUI_UNICON
    !define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"
  !endif
  
  ; Cores personalizadas (proteger contra redefinições)
  !ifndef MUI_HEADERIMAGE
    !define MUI_HEADERIMAGE
  !endif
  !ifndef MUI_HEADERIMAGE_RIGHT
    !define MUI_HEADERIMAGE_RIGHT
  !endif
  !ifndef MUI_HEADERIMAGE_BITMAP
    !define MUI_HEADERIMAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Header\nsis3-header.bmp"
  !endif
  !ifndef MUI_HEADERIMAGE_UNBITMAP
    !define MUI_HEADERIMAGE_UNBITMAP "${NSISDIR}\Contrib\Graphics\Header\nsis3-header.bmp"
  !endif
  
  ; Banner de boas-vindas customizado
  !ifndef MUI_WELCOMEPAGE_TITLE
    !define MUI_WELCOMEPAGE_TITLE "Bem-vindo ao Instalador do Montshop Desktop"
  !endif
  !ifndef MUI_WELCOMEPAGE_TEXT
    !define MUI_WELCOMEPAGE_TEXT "Este assistente irá guiá-lo através da instalação do Montshop Desktop em seu computador.$\r$\n$\r$\nRecomendamos fechar todas as outras aplicações antes de continuar."
  !endif
  
  ; Texto da página de finalização
  !ifndef MUI_FINISHPAGE_TITLE
    !define MUI_FINISHPAGE_TITLE "Instalação Concluída"
  !endif
  !ifndef MUI_FINISHPAGE_TEXT
    !define MUI_FINISHPAGE_TEXT "O Montshop Desktop foi instalado com sucesso em seu computador."
  !endif
  ; Permitir que o usuário execute o aplicativo após instalação
  ; O NSIS executa automaticamente o executável principal quando MUI_FINISHPAGE_RUN está definido
  !ifndef MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN
  !endif
  !ifndef MUI_FINISHPAGE_RUN_TEXT
    !define MUI_FINISHPAGE_RUN_TEXT "Abrir Montshop Desktop"
  !endif
  ; Não definir MUI_FINISHPAGE_RUN_FUNCTION - usar comportamento padrão do NSIS
  ; O NSIS executará automaticamente "$INSTDIR\${PRODUCT_NAME}.exe"
  
  ; Personalizar cores dos componentes
  ; Usar cores do tema Montshop
  !ifndef MUI_INSTFILESPAGE_PROGRESSBAR
    !define MUI_INSTFILESPAGE_PROGRESSBAR "smooth"
  !endif
  
  ; Texto e cores personalizadas
  !ifndef MUI_TEXT_WELCOME_INFO_TITLE
    !define MUI_TEXT_WELCOME_INFO_TITLE "Bem-vindo ao Instalador do Montshop Desktop"
  !endif
  !ifndef MUI_TEXT_WELCOME_INFO_TEXT
    !define MUI_TEXT_WELCOME_INFO_TEXT "Este assistente irá instalar o Montshop Desktop versão ${VERSION} em seu computador.$\r$\n$\r$\nClique em Avançar para continuar."
  !endif
  !ifndef MUI_TEXT_LICENSE_TITLE
    !define MUI_TEXT_LICENSE_TITLE "Contrato de Licença"
  !endif
  !ifndef MUI_TEXT_LICENSE_SUBTITLE
    !define MUI_TEXT_LICENSE_SUBTITLE "Por favor, leia os termos do contrato de licença antes de instalar o Montshop Desktop."
  !endif
  !ifndef MUI_TEXT_COMPONENTS_TITLE
    !define MUI_TEXT_COMPONENTS_TITLE "Escolher Componentes"
  !endif
  !ifndef MUI_TEXT_COMPONENTS_SUBTITLE
    !define MUI_TEXT_COMPONENTS_SUBTITLE "Escolha quais componentes do Montshop Desktop você deseja instalar."
  !endif
  !ifndef MUI_TEXT_INSTALLING_TITLE
    !define MUI_TEXT_INSTALLING_TITLE "Instalando"
  !endif
  !ifndef MUI_TEXT_INSTALLING_SUBTITLE
    !define MUI_TEXT_INSTALLING_SUBTITLE "Por favor, aguarde enquanto o Montshop Desktop está sendo instalado..."
  !endif
  !ifndef MUI_TEXT_FINISH_TITLE
    !define MUI_TEXT_FINISH_TITLE "Instalação Concluída"
  !endif
  !ifndef MUI_TEXT_FINISH_SUBTITLE
    !define MUI_TEXT_FINISH_SUBTITLE "O Montshop Desktop foi instalado com sucesso."
  !endif
  !ifndef MUI_TEXT_FINISH_INFO_TITLE
    !define MUI_TEXT_FINISH_INFO_TITLE "Finalizando a instalação do Montshop Desktop"
  !endif
  !ifndef MUI_TEXT_FINISH_INFO_TEXT
    !define MUI_TEXT_FINISH_INFO_TEXT "O Montshop Desktop foi instalado em seu computador.$\r$\n$\r$\nClique em Finalizar para fechar este assistente."
  !endif
  !ifndef MUI_TEXT_ABORT_TITLE
    !define MUI_TEXT_ABORT_TITLE "Instalação Cancelada"
  !endif
  !ifndef MUI_TEXT_ABORT_SUBTITLE
    !define MUI_TEXT_ABORT_SUBTITLE "A instalação do Montshop Desktop não foi concluída."
  !endif
!macroend

; Função LaunchApp removida - não é necessária
; Quando MUI_FINISHPAGE_RUN está definido sem MUI_FINISHPAGE_RUN_FUNCTION,
; o NSIS executa automaticamente o executável principal do aplicativo instalado.
; Isso preserva a funcionalidade original sem causar warnings do NSIS.

; Macro para instalação customizada (executado após instalação dos arquivos)
!macro customInstall
  ; Garantir que o logo.png seja incluído nos recursos do instalador
  ; O electron-builder já copia arquivos do diretório dist
  
  ; IMPORTANTE: Garantir que os atalhos sejam sempre criados, mesmo durante atualizações
  ; O electron-builder cria atalhos automaticamente na primeira instalação,
  ; mas durante atualizações automáticas, os atalhos podem não ser recriados.
  ; Por isso, vamos criar/atualizar os atalhos manualmente aqui.
  
  ; Criar/atualizar atalho no desktop
  ; Primeiro, remover o atalho antigo se existir (para garantir atualização)
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  ; Criar novo atalho no desktop
  CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_NAME}.exe" "" "$INSTDIR\resources\icon.ico" 0 "" "" "${PRODUCT_NAME}"
  
  ; Criar/atualizar atalho no menu Iniciar
  ; Criar diretório do menu Iniciar se não existir
  CreateDirectory "$SMPROGRAMS\${PRODUCT_PUBLISHER}"
  ; Remover atalho antigo se existir (para garantir atualização)
  Delete "$SMPROGRAMS\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}.lnk"
  ; Criar novo atalho no menu Iniciar
  CreateShortcut "$SMPROGRAMS\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_NAME}.exe" "" "$INSTDIR\resources\icon.ico" 0 "" "" "${PRODUCT_NAME}"
  
  ; Registrar informações no registro para controle de versão e atualizações
  WriteRegStr HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}" "Version" "${VERSION}"
  WriteRegStr HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}" "InstallDate" "$(^GetDate)"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayIcon" "$INSTDIR\resources\icon.ico"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "HelpLink" "${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "${PRODUCT_PUBLISHER}"
  
  ; Criar entradas de registro para melhor integração com Windows
  WriteRegStr HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}" "InstallDate" "$(^GetDate)"
  WriteRegStr HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}" "Publisher" "${PRODUCT_PUBLISHER}"
  
  ; Limpar cache de atualizações anteriores se existir
  ; Isso ajuda a evitar problemas com atualizações futuras
  RMDir /r /REBOOTOK "$LOCALAPPDATA\${PRODUCT_NAME}-updater"
!macroend

; Macro para desinstalação customizada
!macro customUnInstall
  ; Remover atalhos do desktop (o electron-builder já remove automaticamente, mas garantir remoção)
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  
  ; Remover atalhos do menu iniciar (o electron-builder já remove automaticamente, mas garantir remoção)
  Delete "$SMPROGRAMS\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_PUBLISHER}"
  
  ; Remover chave de registro personalizada
  DeleteRegKey HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}"
  
  ; Limpar cache de atualizações
  RMDir /r /REBOOTOK "$LOCALAPPDATA\${PRODUCT_NAME}-updater"
  
  ; Limpar logs do electron-log se existirem
  RMDir /r /REBOOTOK "$LOCALAPPDATA\${PRODUCT_NAME}\logs"
!macroend

; Funções customInstallPage e customFinishPage removidas
; Não eram referenciadas e causavam warnings do NSIS
; As páginas são personalizadas através das definições MUI no macro customHeader

