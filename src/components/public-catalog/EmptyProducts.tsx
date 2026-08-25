import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onClear?: () => void;
};

export function EmptyProducts({ onClear }: Props) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <Inbox className="h-12 w-12 text-slate-300" aria-hidden />
      <h3 className="text-base font-medium text-[color:var(--catalog-text)]">
        Nenhum produto encontrado
      </h3>
      <p className="text-sm text-slate-500">
        Tente ajustar a busca ou os filtros para ver mais resultados.
      </p>
      {onClear ? (
        <Button type="button" variant="outline" onClick={onClear}>
          Limpar filtros
        </Button>
      ) : null}
    </div>
  );
}