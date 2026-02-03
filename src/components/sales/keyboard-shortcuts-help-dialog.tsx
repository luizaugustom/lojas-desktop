import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Info } from 'lucide-react';

interface KeyboardShortcutsHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelpDialog({
  open,
  onClose,
}: KeyboardShortcutsHelpDialogProps) {
  const shortcuts = [
    {
      category: 'Foco',
      items: [
        { keys: ['←'], description: 'Mover foco para a lista de produtos' },
        { keys: ['→'], description: 'Mover foco para o carrinho' },
      ],
    },
    {
      category: 'Navegação (lista de produtos)',
      items: [
        { keys: ['↑', '↓'], description: 'Navegar entre produtos (quando foco está nos produtos)' },
        { keys: ['Enter'], description: 'Adicionar produto selecionado ao carrinho' },
        { keys: ['Tab'], description: 'Navegar para o próximo campo' },
        { keys: ['Shift', '+', 'Tab'], description: 'Voltar para o campo anterior' },
      ],
    },
    {
      category: 'Gerenciamento do Carrinho (quando foco está no carrinho)',
      items: [
        { keys: ['↑', '↓'], description: 'Navegar entre itens do carrinho' },
        { keys: ['+'], description: 'Aumentar quantidade do item selecionado' },
        { keys: ['-'], description: 'Diminuir quantidade do item selecionado' },
        { keys: ['Delete'], description: 'Remover item selecionado do carrinho' },
        { keys: ['Ctrl', '+', 'D'], description: 'Focar campo de desconto' },
      ],
    },
    {
      category: 'Ações gerais',
      items: [
        { keys: ['F6'], description: 'Abrir checkout / Finalizar venda' },
        { keys: ['Ctrl', '+', 'Enter'], description: 'Abrir checkout (alternativa)' },
        { keys: ['Ctrl', '+', 'L'], description: 'Limpar carrinho' },
        { keys: ['Ctrl', '+', 'B'], description: 'Focar campo de busca de produtos' },
      ],
    },
    {
      category: 'Checkout',
      items: [
        { keys: ['Enter'], description: 'Confirmar venda (quando formulário válido)' },
        { keys: ['Esc'], description: 'Cancelar checkout' },
        { keys: ['Ctrl', '+', 'A'], description: 'Adicionar método de pagamento' },
        { keys: ['1'], description: 'Selecionar Dinheiro' },
        { keys: ['2'], description: 'Selecionar Cartão de Crédito' },
        { keys: ['3'], description: 'Selecionar Cartão de Débito' },
        { keys: ['4'], description: 'Selecionar PIX' },
        { keys: ['5'], description: 'Selecionar A prazo' },
      ],
    },
    {
      category: 'Impressão',
      items: [
        { keys: ['Enter'], description: 'Confirmar impressão' },
        { keys: ['Esc'], description: 'Cancelar impressão' },
        { keys: ['Ctrl', '+', 'P'], description: 'Imprimir documento' },
      ],
    },
    {
      category: 'Outras Funções',
      items: [
        { keys: ['Esc'], description: 'Fechar modais e cancelar ações' },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Atalhos de Teclado
          </DialogTitle>
          <DialogDescription>
            Use estes atalhos para gerenciar vendas sem precisar do mouse
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcuts.map((category) => (
            <div key={category.category}>
              <h3 className="font-semibold text-sm mb-3 text-foreground">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-4 py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-1 flex-wrap">
                      {item.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          {keyIndex > 0 && <span className="text-muted-foreground mx-1">+</span>}
                          <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded shadow-sm">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground text-right flex-1">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Dica:</strong> Use as setas ← e → para alternar o foco entre a lista de produtos e o carrinho.
            Apenas a área com foco (destacada) responde às setas ↑↓ e às teclas de ação. Os atalhos são desabilitados
            quando você está digitando em campos de texto. O leitor de código de barras continua funcionando normalmente.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
