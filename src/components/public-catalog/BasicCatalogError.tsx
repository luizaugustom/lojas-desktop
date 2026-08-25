import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Props = {
  onRetry?: () => void;
};

export function BasicCatalogError({ onRetry }: Props) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <Alert variant="destructive" className="mb-4 text-left">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Catálogo não encontrado</AlertTitle>
        <AlertDescription>
          A página de catálogo solicitada não existe ou está desabilitada. Verifique
          o endereço e tente novamente.
        </AlertDescription>
      </Alert>
      {onRetry ? (
        <Button type="button" onClick={onRetry} variant="outline">
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}