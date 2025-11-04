# 🚀 Sistema de Atualização Automática - Guia Rápido

## Como Funciona

Agora você tem um sistema totalmente automatizado! Quando você faz commit e push na branch `main`, o GitHub Actions automaticamente:

1. ✅ Faz o build da aplicação
2. ✅ Cria uma release no GitHub (ou usa uma existente se a versão já foi publicada)
3. ✅ Faz upload dos arquivos necessários para atualização automática
4. ✅ Todos os computadores que têm o aplicativo instalado receberão a atualização automaticamente!

## 📝 Como Usar

### Passo 1: Atualizar a Versão

Antes de fazer commit, atualize a versão no `package.json`:

```json
{
  "version": "1.0.1"  // Incremente aqui: 1.0.0 → 1.0.1 → 1.0.2, etc.
}
```

### Passo 2: Fazer Commit e Push

```bash
git add .
git commit -m "Sua mensagem de commit"
git push origin main
```

**Pronto!** O GitHub Actions vai fazer tudo automaticamente.

### Passo 3: Verificar o Progresso

1. Vá para: `https://github.com/luizaugustom/montshop-desktop/actions`
2. Veja o workflow rodando em tempo real
3. Quando terminar, a release estará disponível em: `https://github.com/luizaugustom/montshop-desktop/releases`

## 🔄 Como os Usuários Recebem a Atualização

Os usuários que já têm o aplicativo instalado **não precisam fazer nada**:

1. ✅ O aplicativo verifica atualizações automaticamente ao iniciar
2. ✅ Verifica a cada 4 horas enquanto está em execução
3. ✅ Quando detecta uma nova versão, baixa automaticamente em segundo plano
4. ✅ Quando o download termina, notifica o usuário
5. ✅ Ao fechar o aplicativo, instala a atualização automaticamente

## 🎯 Regras de Versão

### Versão Semântica (Recomendado)

Use o formato `MAJOR.MINOR.PATCH`:

- **MAJOR** (1.0.0 → 2.0.0): Mudanças grandes que quebram compatibilidade
- **MINOR** (1.0.0 → 1.1.0): Novas funcionalidades sem quebrar compatibilidade
- **PATCH** (1.0.0 → 1.0.1): Correções de bugs

### Exemplos:

```json
"version": "1.0.0"  // Versão inicial
"version": "1.0.1"  // Correção de bug
"version": "1.1.0"  // Nova funcionalidade
"version": "2.0.0"  // Mudança grande
```

## ⚙️ Configuração do Workflow

O workflow está configurado em `.github/workflows/build-and-release.yml` e:

- ✅ Dispara automaticamente em push para `main`
- ✅ Dispara quando você cria uma tag `v*` (ex: `v1.0.1`)
- ✅ Pode ser executado manualmente pela interface do GitHub (Actions → Build and Release → Run workflow)

## 🔧 Troubleshooting

### Workflow não está rodando?

1. Verifique se você está fazendo push para a branch `main`
2. Verifique se o arquivo `.github/workflows/build-and-release.yml` existe
3. Verifique as Actions do GitHub: `https://github.com/luizaugustom/montshop-desktop/actions`

### Build falha?

1. Verifique os logs do workflow no GitHub Actions
2. Verifique se todas as dependências estão corretas no `package.json`
3. Verifique se a versão foi atualizada antes do commit

### Usuários não estão recebendo atualizações?

1. Verifique se a release foi criada corretamente no GitHub
2. Verifique se a tag está no formato `v{versão}` (ex: `v1.0.1`)
3. Verifique se o arquivo `latest.yml` está presente no release
4. Verifique os logs do aplicativo: `%USERPROFILE%\AppData\Roaming\montshop-desktop\logs`

## 📋 Checklist Antes de Cada Release

- [ ] Versão atualizada no `package.json`
- [ ] Testes realizados localmente
- [ ] Commit feito com mensagem descritiva
- [ ] Push para `main` realizado
- [ ] Workflow executado com sucesso (verificar Actions)
- [ ] Release criada corretamente (verificar Releases)

## 🎉 Pronto!

Agora você só precisa:
1. Atualizar a versão
2. Fazer commit e push
3. Aguardar o GitHub Actions fazer o trabalho pesado!

Todos os computadores receberão a atualização automaticamente! 🚀

