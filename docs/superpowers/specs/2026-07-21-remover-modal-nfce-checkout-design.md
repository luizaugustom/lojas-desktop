# Remover modal de NFC-e autorizada do checkout

## Objetivo

Ao concluir uma venda com emissão de NFC-e pela página **Finalizar Venda**, não abrir o modal **NFC-e Autorizada**. Após a emissão, o fluxo deve seguir diretamente para a confirmação de impressão já existente.

## Alteração

Remover de `src/components/sales/checkout-dialog.tsx` somente a integração com `NfceDetailsModal`:

- importação do componente;
- estados usados exclusivamente pelo modal;
- montagem dos dados da NFC-e autorizada;
- agendamento de abertura do modal;
- renderização do modal.

O componente `NfceDetailsModal` será mantido, pois esta alteração é restrita ao fluxo de finalização de venda.

## Comportamento preservado

- emissão fiscal da NFC-e;
- mensagens de sucesso e avisos;
- confirmação e execução da impressão;
- emissão de NF-e, boleto e cupom não fiscal;
- seleção de PDV e série;
- fluxo de NFC-e mock.

## Verificação

Adicionar uma verificação automatizada que garanta que o checkout não integra nem abre `NfceDetailsModal`. Executar os testes aplicáveis e a validação de tipos/build do projeto.
