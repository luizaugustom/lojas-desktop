# Unimake Config Modal na lista de Empresas — Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin configura tokens Unimake por empresa via modal na página Empresas (como FocusNFE), e remove a seção Unimake de Configurações.

**Architecture:** Novo `UnimakeConfigModal` espelhando `FocusNfeConfigModal`, wired na tabela de Empresas; Settings admin perde card/dialog Unimake. Reusa `adminApi.getCompanyUnimake` / `updateCompanyUnimake`.

**Tech Stack:** React, Dialog/Select UI, adminApi, front-lojas + lojas-desktop.

---

### Task 1: Modal Unimake (web)

**Files:**
- Create: `front-lojas/src/components/companies/unimake-config-modal.tsx`

- [ ] Criar modal com App ID, Configuration ID, App Key, ambiente sandbox/produção; carregar/salvar via `adminApi`; aviso A1 via fiscal config.

### Task 2: Wire Empresas (web)

**Files:**
- Modify: `front-lojas/src/components/companies/companies-table.tsx`
- Modify: `front-lojas/src/app/(dashboard)/companies/page.tsx`

- [ ] Prop `onConfigureCompanyBoleto` + item de menu; estado + `UnimakeConfigModal` na page.

### Task 3: Remover Unimake de Settings (web)

**Files:**
- Modify: `front-lojas/src/app/(dashboard)/settings/page.tsx`

- [ ] Remover estados, handlers, `loadUnimakeOverview` do useEffect, card `#admin-boletos` e dialog embutido. Manter switch empresa `boletoEnabled`.

### Task 4: Espelho desktop

**Files:**
- Create: `lojas-desktop/src/components/companies/unimake-config-modal.tsx`
- Modify: `lojas-desktop/src/components/companies/companies-table.tsx`
- Modify: `lojas-desktop/src/components/pages/CompaniesPage.tsx`
- Modify: `lojas-desktop/src/components/pages/SettingsPage.tsx`

- [ ] Mesmo comportamento do web.

### Task 5: Verificar

- [ ] Tipagem/build; checar que Settings admin não referencia Unimake overview; menu Empresas tem ação de boletos.
