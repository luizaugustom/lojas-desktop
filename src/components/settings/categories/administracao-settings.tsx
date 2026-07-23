import { useEffect, useState } from 'react';
import { Key, Lock, Save, Settings as SettingsIcon, Store } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, authApi, managerApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import { Company } from '../../../types';
import { FocusNfeConfigModal } from '../../companies/focus-nfe-config-modal';
import { toast } from 'react-hot-toast';

export interface AdministracaoSettingsProps {
  locked?: boolean;
  lockReason?: string;
  onNavigate?: (route: string) => void;
}

export function AdministracaoSettings({ locked, lockReason }: AdministracaoSettingsProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isGestor = user?.role === 'gestor';

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

  return (
    <div className="space-y-6">
      {isAdmin ? <AdminIbptTokenCard /> : null}
      {isGestor ? <GestorCompanyListCard /> : null}
    </div>
  );
}

function AdminIbptTokenCard() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({ ibptToken: '' });

  const load = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getFocusNfeConfig();
      setConfig(response.data);
      setForm({ ibptToken: response.data?.ibptToken || '' });
    } catch (error) {
      console.error('Erro ao carregar token IBPT global:', error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminApi.updateFocusNfeConfig({ ibptToken: form.ibptToken });
      toast.success('Token IBPT global salvo com sucesso!');
      await load();
    } catch (error: any) {
      console.error('Erro ao salvar token IBPT global:', error);
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  // Lazy: load on mount
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Token IBPT global (opcional)
        </CardTitle>
        <CardDescription>
          Token opcional da API IBPT (Lei 12.741) associado ao administrador. Cada empresa também pode
          ter seu próprio token em dados fiscais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-1">
                ℹ️ Sobre o IBPT
              </p>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Usado para exibir tributos aproximados nos documentos fiscais</li>
                <li>
                  • Opcional; a emissão na SEFAZ depende do certificado A1 e dos dados fiscais da empresa
                </li>
                <li>• Obtenha o token em ibpt.org.br</li>
              </ul>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-ibptToken">Token IBPT</Label>
                <Input
                  id="admin-ibptToken"
                  type="password"
                  value={form.ibptToken}
                  onChange={(e) => setForm({ ibptToken: e.target.value })}
                  placeholder="Cole o token IBPT (opcional)"
                />
                <p className="text-xs text-muted-foreground">
                  <a
                    href="https://deolhonoimposto.ibpt.org.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    deolhonoimposto.ibpt.org.br
                  </a>
                </p>
                {config?.hasIbptToken && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✅ Token IBPT global configurado
                  </p>
                )}
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar token IBPT global
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GestorCompanyListCard() {
  const { user } = useAuth();
  const [passwordModal, setPasswordModal] = useState<{ companyId: string; companyName: string } | null>(null);
  const [focusModal, setFocusModal] = useState<Company | null>(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const { data: companiesData } = useQuery({
    queryKey: ['manager', 'my-companies'],
    queryFn: () => managerApi.myCompanies().then((r) => r.data),
    enabled: user?.role === 'gestor',
  });
  const companies = Array.isArray(companiesData) ? companiesData : [];

  const handleChangePassword = async () => {
    if (!passwordModal) return;
    try {
      const newPwd = passwordForm.newPassword;
      if (!newPwd || newPwd.length < 8) {
        toast.error('Nova senha deve ter no mínimo 8 caracteres');
        return;
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPwd)) {
        toast.error('Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número');
        return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('As senhas não coincidem');
        return;
      }
      setSavingPassword(true);
      await authApi.changeCompanyPassword(passwordModal.companyId, passwordForm.newPassword);
      toast.success('Senha de login da empresa alterada com sucesso.');
      setPasswordModal(null);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Senha de login das empresas
          </CardTitle>
          <CardDescription>
            Altere a senha de login das empresas que você gerencia. A empresa precisará usar a nova
            senha no próximo acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma empresa vinculada ao seu perfil.</p>
          ) : (
            <ul className="space-y-2">
              {companies.map((c: { id: string; name?: string; fantasyName?: string }) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-4 py-2 border-b last:border-0"
                >
                  <span className="font-medium">{c.name || c.fantasyName || c.id}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFocusModal({
                          id: c.id,
                          name: (c.name || c.fantasyName || c.id) as string,
                        } as Company)
                      }
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Focus
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPasswordModal({
                          companyId: c.id,
                          companyName: (c.name || c.fantasyName || c.id) as string,
                        });
                        setPasswordForm({ newPassword: '', confirmPassword: '' });
                      }}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Alterar senha
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!passwordModal}
        onOpenChange={(open) => !open && setPasswordModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar senha de login</DialogTitle>
            <DialogDescription>
              Definir nova senha de login para {passwordModal?.companyName}. A empresa precisará
              usar esta senha no próximo acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="companyNewPassword">Nova senha *</Label>
              <Input
                id="companyNewPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                }
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Mín. 8 caracteres, com uma maiúscula, uma minúscula e um número
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyConfirmPassword">Confirmar nova senha *</Label>
              <Input
                id="companyConfirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar senha'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FocusNfeConfigModal
        open={!!focusModal}
        onOpenChange={(open) => !open && setFocusModal(null)}
        company={focusModal}
        onSuccess={() => setFocusModal(null)}
      />
    </>
  );
}

export default AdministracaoSettings;
