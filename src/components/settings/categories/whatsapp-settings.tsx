import { Lock } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { WhatsAppConnectionCard } from '../../whatsapp/whatsapp-connection-card';
import { WhatsAppGlobalStatus } from '../../whatsapp/whatsapp-global-status';

export interface WhatsAppSettingsProps {
  locked?: boolean;
  lockReason?: string;
  onNavigate?: (route: string) => void;
}

export function WhatsAppSettings({ locked, lockReason, onNavigate }: WhatsAppSettingsProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (locked) {
    return (
      <Alert className="border-destructive/40 bg-destructive/5">
        <Lock className="h-4 w-4 text-destructive" aria-hidden />
        <AlertDescription>
          {lockReason ?? 'Esta categoria está bloqueada para a sua empresa.'}
        </AlertDescription>
      </Alert>
    );
  }

  // Admin: gerencia a conexão (QR / conectar / desconectar).
  // Empresa (e vendedor): apenas visualiza o status global read-only.
  return (
    <div className="space-y-6">
      {isAdmin ? (
        <WhatsAppConnectionCard onConnectionChange={onNavigate ? () => undefined : undefined} />
      ) : (
        <WhatsAppGlobalStatus />
      )}
    </div>
  );
}

export default WhatsAppSettings;
