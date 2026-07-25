# Modal Unimake de boletos na lista de Empresas

## Objetivo

O admin configura tokens Unimake (e-Boleto) de cada empresa em um modal na página **Empresas**, no mesmo padrão do modal FocusNFE. A seção de Unimake em **Configurações** (admin) é removida.

## Escopo

- `front-lojas` (web)
- `lojas-desktop` (Electron)
- Sem mudanças de API (`/admin/companies/:id/unimake` e overview já existem)

## Comportamento

### Entrada

Na tabela de Empresas, menu de ações de cada linha:

- item existente: Configuração fiscal (FocusNFE)
- **novo item:** Configurar Boletos (Unimake)

### Modal `UnimakeConfigModal`

Espelha `FocusNfeConfigModal`:

| Campo | Obrigatório | Notas |
|-------|-------------|--------|
| App ID | sim | |
| Configuration ID | sim | |
| App Key | só na 1ª config / ao trocar | password; vazio mantém a atual |
| Sandbox / Produção | sim | switch ou select |

Extras:

- carregar config via `adminApi.getCompanyUnimake(companyId)` ao abrir
- salvar via `adminApi.updateCompanyUnimake(companyId, payload)`
- aviso se a empresa não tem certificado A1 (flag `hasCertificateA1` do overview/get)
- toast de sucesso/erro; `onSuccess` opcional para refresh da lista

### Remoções

Em Settings (admin), remover:

- card/tabela “Boletos — Unimake (e-Boleto)”
- estado e handlers do dialog Unimake embutido (`unimakeOverview`, `openUnimakeDialog`, etc.)

Manter na Settings da **empresa**:

- switch “Ativar boletos” (`boletoEnabled`)
- indicador somente leitura se Unimake está configurado

### Preservado

- `boletoAllowed` no dialog de edição da empresa
- emissão de boletos, webhooks e upload automático de A1 no backend
- página `/boletos` e gating de menu por `boletoAllowed`

## Arquivos principais

**Web (`front-lojas`):**

- novo: `src/components/companies/unimake-config-modal.tsx`
- `src/components/companies/companies-table.tsx` — novo callback/menu item
- `src/app/(dashboard)/companies/page.tsx` — wire do modal
- `src/app/(dashboard)/settings/page.tsx` — remover seção admin Unimake

**Desktop (`lojas-desktop`):**

- espelho dos mesmos arquivos sob `src/components/companies/` e páginas equivalentes

## Verificação

- admin abre Empresas → Configurar Boletos → salva App ID / Configuration ID / App Key / ambiente
- App Key vazia não sobrescreve a existente
- seção Unimake some de Configurações (admin)
- empresa ainda vê e altera só “Ativar boletos”
- testes manuais web + desktop; tipagem/build ok
