import { useEffect, useState } from 'react';
import { Image, Lock, Save, Upload, User, X } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Skeleton } from '../../ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/store/ui-store';
import { companyApi } from '@/lib/api-endpoints';
import { getImageUrl } from '@/lib/image-utils';
import { handleApiError } from '@/lib/handleApiError';
import { logger } from '@/lib/logger';
import { toast } from 'react-hot-toast';

export interface EmpresaSettingsProps {
  locked?: boolean;
  lockReason?: string;
  onNavigate?: (route: string) => void;
}

export function EmpresaSettings({ locked, lockReason }: EmpresaSettingsProps) {
  const { user, api, logout } = useAuth();
  const setCompanyColor = useUIStore((s) => s.setCompanyColor);
  const queryClient = useQueryClient();

  const isEmpresa = user?.role === 'empresa';

  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    login: '',
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Company-only state
  const [brandColor, setBrandColor] = useState<string>('#3B82F6');
  const [savingBrandColor, setSavingBrandColor] = useState(false);
  const [companyNickname, setCompanyNickname] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Lock early-return
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

  // Manage blob URL lifecycle to avoid leaks
  useEffect(() => {
    if (!logoFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [logoFile]);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      let data;
      try {
        const response = await api.get('/auth/profile');
        data = response.data;
        logger.log('Perfil carregado da API:', data);
      } catch (error) {
        logger.log('Erro ao carregar da API, usando dados do contexto:', error);
        data = user;
      }
      setProfile(data);
      setProfileForm({
        name: data?.name || '',
        email: data?.email || '',
        phone: data?.phone || '',
        login: data?.login || '',
      });
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
      if (user) {
        setProfile(user);
        setProfileForm({
          name: user.name || '',
          email: (user as any).email || '',
          phone: (user as any).phone || '',
          login: user.login || '',
        });
      }
      handleApiError(error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadCompanyData = async () => {
    try {
      const response = await companyApi.myCompany();
      const data = response.data;
      if (data?.brandColor) {
        setBrandColor(data.brandColor);
        setCompanyColor(data.brandColor);
      }
      if (data?.fantasyName) {
        setCompanyNickname(data.fantasyName);
      }
      if (data?.logoUrl) {
        setCompanyLogo(data.logoUrl);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
      if (isEmpresa) {
        loadCompanyData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUpdateProfile = async () => {
    try {
      setUpdatingProfile(true);
      if (!profileForm.login || profileForm.login.length < 3) {
        toast.error('Login deve ter no mínimo 3 caracteres');
        return;
      }
      if (profileForm.email && !profileForm.email.includes('@')) {
        toast.error('Email inválido');
        return;
      }

      const updates: any = {};
      if (profileForm.name && profileForm.name !== profile?.name) updates.name = profileForm.name;
      if (profileForm.email && profileForm.email !== profile?.email) updates.email = profileForm.email;
      if (profileForm.phone !== (profile?.phone || '')) updates.phone = profileForm.phone;
      if (profileForm.login && profileForm.login !== profile?.login) updates.login = profileForm.login;

      if (Object.keys(updates).length === 0) {
        toast.error('Nenhuma alteração detectada');
        return;
      }

      await api.put('/auth/profile', updates);
      toast.success('Perfil atualizado com sucesso!');
      await loadProfile();
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      handleApiError(error);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      if (!passwordForm.currentPassword) {
        toast.error('Digite sua senha atual');
        return;
      }
      const pwd = passwordForm.newPassword;
      if (!pwd || pwd.length < 8) {
        toast.error('Nova senha deve ter no mínimo 8 caracteres');
        return;
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd)) {
        toast.error('Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número');
        return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('As senhas não coincidem');
        return;
      }
      if (passwordForm.currentPassword === passwordForm.newPassword) {
        toast.error('A nova senha deve ser diferente da atual');
        return;
      }

      await api.patch('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success('Senha alterada com sucesso! Você será desconectado para fazer login novamente.', {
        duration: 3000,
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

      setTimeout(() => {
        if (logout) {
          logout();
        } else if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      handleApiError(error);
    }
  };

  const handleSaveBrandColor = async () => {
    try {
      setSavingBrandColor(true);
      await companyApi.updateMyCompany({ brandColor });
      await queryClient.invalidateQueries({ queryKey: ['my-company', user?.companyId] });
      setCompanyColor(brandColor);
      toast.success('Cor da empresa atualizada!');
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setSavingBrandColor(false);
    }
  };

  const handleSaveCompanyNickname = async () => {
    try {
      setSavingNickname(true);
      await companyApi.updateMyCompany({ fantasyName: companyNickname });
      toast.success('Apelido da empresa atualizado!');
      await loadCompanyData();
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setSavingNickname(false);
    }
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Apenas imagens são aceitas.');
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Tamanho máximo permitido: 5MB');
      return;
    }
    setLogoFile(file);
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    try {
      setUploadingLogo(true);
      await companyApi.uploadLogo(logoFile);
      toast.success('Logo enviado com sucesso!');
      setLogoFile(null);
      await loadCompanyData();
    } catch (error: any) {
      console.error('Erro ao enviar logo:', error);
      handleApiError(error);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setRemovingLogo(true);
      await companyApi.removeLogo();
      toast.success('Logo removido com sucesso!');
      await loadCompanyData();
    } catch (error: any) {
      console.error('Erro ao remover logo:', error);
      handleApiError(error);
    } finally {
      setRemovingLogo(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil
          </CardTitle>
          <CardDescription>Informações da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="login">Login *</Label>
              <Input
                id="login"
                value={profileForm.login}
                onChange={(e) => setProfileForm({ ...profileForm, login: e.target.value })}
                placeholder="Digite seu login"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Digite seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                placeholder="Digite seu email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="Digite seu telefone"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Usuário</Label>
            <Input value={user?.role || ''} disabled className="capitalize bg-muted" />
          </div>

          {profile?.cpf && (
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input value={profile.cpf} disabled className="bg-muted" />
            </div>
          )}
          {profile?.cnpj && (
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={profile.cnpj} disabled className="bg-muted" />
            </div>
          )}

          <Button
            onClick={handleUpdateProfile}
            disabled={updatingProfile}
            className="w-full sm:w-auto"
          >
            {updatingProfile ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Segurança
          </CardTitle>
          <CardDescription>Altere sua senha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Senha Atual *</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha *</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="••••••••"
            />
            <p className="text-xs text-muted-foreground">Mín. 8 caracteres, com uma maiúscula, uma minúscula e um número</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <Button onClick={handleChangePassword} className="w-full sm:w-auto">
            <Lock className="mr-2 h-4 w-4" />
            Alterar Senha
          </Button>
        </CardContent>
      </Card>

      {/* Empresa-only: Logo, cor, apelido */}
      {isEmpresa && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logo e Cor da Empresa
            </CardTitle>
            <CardDescription>
              Configure o logo e a cor principal que será usada no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {companyLogo && (
              <div className="space-y-4">
                <div>
                  <Label>Logo Atual</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                    <img
                      src={getImageUrl(companyLogo) || ''}
                      alt="Logo atual da empresa"
                      className="h-16 mx-auto object-contain"
                      onError={() => setCompanyLogo(null)}
                    />
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleRemoveLogo}
                  disabled={removingLogo}
                  className="w-full sm:w-auto"
                >
                  {removingLogo ? (
                    <>
                      <Save className="mr-2 h-4 w-4 animate-spin" />
                      Removendo...
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Remover Logo
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="logo-upload">
                  {companyLogo ? 'Substituir Logo' : 'Adicionar Logo'}
                </Label>
                <div className="mt-2">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceitos: JPG, PNG, GIF, WebP. Tamanho máximo: 5MB
                </p>
              </div>

              {logoFile && previewUrl && (
                <div className="space-y-4">
                  <div>
                    <Label>Pré-visualização</Label>
                    <div className="mt-2 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                      <img
                        src={previewUrl}
                        alt="Pré-visualização do logo"
                        className="h-16 mx-auto object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUploadLogo}
                      disabled={uploadingLogo}
                      className="flex-1 sm:flex-none"
                    >
                      {uploadingLogo ? (
                        <>
                          <Save className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {companyLogo ? 'Substituir Logo' : 'Adicionar Logo'}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLogoFile(null)}
                      disabled={uploadingLogo}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Cor da empresa</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-14 rounded border"
                  aria-label="Selecionar cor da empresa"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-36"
                  placeholder="#3B82F6"
                />
                <Button onClick={handleSaveBrandColor} disabled={savingBrandColor}>
                  {savingBrandColor ? (
                    <>
                      <Save className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar cor
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Essa cor será aplicada como primária (botões, destaques e gráficos).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-nickname">Apelido da Empresa</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Input
                  id="company-nickname"
                  value={companyNickname}
                  onChange={(e) => setCompanyNickname(e.target.value)}
                  placeholder="Digite um apelido para a empresa"
                  className="flex-1"
                />
                <Button onClick={handleSaveCompanyNickname} disabled={savingNickname}>
                  {savingNickname ? (
                    <>
                      <Save className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar apelido
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Define um nome amigável para identificar a empresa no sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default EmpresaSettings;
