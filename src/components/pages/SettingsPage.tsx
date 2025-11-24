import { useState, useEffect } from 'react';
import { User, Bell, Lock, Save, FileText, Shield, Upload, X, Image, MessageSquare, Store, ExternalLink, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { handleApiError } from '@/lib/handleApiError';
import { companyApi, notificationApi } from '@/lib/api-endpoints';
import { getImageUrl } from '@/lib/image-utils';
import { useUIStore } from '@/store/ui-store';
import { useQueryClient } from '@tanstack/react-query';
import type { DataPeriodFilter } from '@/types';

const COMPANY_PERIOD_OPTIONS: Array<{ value: DataPeriodFilter; label: string }> = [
  { value: 'ALL', label: 'Todos os dados' },
  { value: 'THIS_YEAR', label: 'Este ano' },
  { value: 'LAST_6_MONTHS', label: 'Últimos 6 meses' },
  { value: 'LAST_3_MONTHS', label: 'Últimos 3 meses' },
  { value: 'LAST_1_MONTH', label: 'Último mês' },
  { value: 'LAST_15_DAYS', label: 'Últimos 15 dias' },
  { value: 'THIS_WEEK', label: 'Esta semana' },
];

const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || 'https://montshop.vercel.app').replace(/\/+$/, '');

const withPublicSiteUrl = (path?: string | null) => {
  if (!path) {
    return null;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${PUBLIC_SITE_URL}${normalizedPath}`;
};

export default function SettingsPage() {
  const { user, api, logout } = useAuth();
  const setCompanyColor = useUIStore((s) => s.setCompanyColor);
  const queryClient = useQueryClient();
  
  // Estado do perfil
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  
  // Estado dos formulários
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    login: '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Estado das preferências de notificação
  const [notificationPreferences, setNotificationPreferences] = useState<any>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [updatingPreferences, setUpdatingPreferences] = useState(false);

  // Estado das configurações fiscais
  const [fiscalConfig, setFiscalConfig] = useState<any>(null);
  const [loadingFiscal, setLoadingFiscal] = useState(false);
  const [updatingFiscal, setUpdatingFiscal] = useState(false);
  const [fiscalForm, setFiscalForm] = useState({
    taxRegime: 'SIMPLES_NACIONAL',
    cnae: '',
    certificatePassword: '',
    nfceSerie: '1',
    municipioIbge: '',
    csc: '',
    idTokenCsc: '000001',
  });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);

  // Estado do logo da empresa
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);

  // Cor da marca
  const [brandColor, setBrandColor] = useState<string>('#3B82F6');
  const [savingBrandColor, setSavingBrandColor] = useState(false);

  // Período padrão dos dados
  const [dataPeriod, setDataPeriod] = useState<DataPeriodFilter>((user?.dataPeriod as DataPeriodFilter | null) ?? 'THIS_YEAR');
  const [savingDataPeriod, setSavingDataPeriod] = useState(false);

  // Estado da empresa (incluindo plano)
  const [companyData, setCompanyData] = useState<any>(null);
  const [loadingCompanyData, setLoadingCompanyData] = useState(false);

  // Estado das mensagens automáticas
  const [autoMessageStatus, setAutoMessageStatus] = useState<any>(null);
  const [loadingAutoMessage, setLoadingAutoMessage] = useState(false);
  const [togglingAutoMessage, setTogglingAutoMessage] = useState(false);

  // Estado da página de catálogo
  const [catalogPageConfig, setCatalogPageConfig] = useState<any>(null);
  const [loadingCatalogPage, setLoadingCatalogPage] = useState(false);
  const [updatingCatalogPage, setUpdatingCatalogPage] = useState(false);
  const [catalogPageForm, setCatalogPageForm] = useState({
    url: '',
    enabled: false,
  });


  const catalogPublicUrl = withPublicSiteUrl(catalogPageConfig?.pageUrl);
  const catalogPreviewUrl = catalogPageForm.url ? withPublicSiteUrl(`/catalog/${catalogPageForm.url}`) : null;

  // Carregar dados da empresa (incluindo plano)
  const loadCompanyData = async () => {
    try {
      setLoadingCompanyData(true);
      const response = await companyApi.myCompany();
      // companyApi.myCompany() retorna AxiosResponse, precisa acessar .data
      const data = response.data;
      setCompanyData(data);
      if (data?.brandColor) {
        setBrandColor(data.brandColor);
        setCompanyColor(data.brandColor);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
      setCompanyData(null);
    } finally {
      setLoadingCompanyData(false);
    }
  };

  const handleSaveBrandColor = async () => {
    try {
      setSavingBrandColor(true);
      await companyApi.updateMyCompany({ brandColor });
      
      // Invalidar o cache da query para forçar atualização
      await queryClient.invalidateQueries({ queryKey: ['my-company', user?.companyId] });
      
      // Aplicar a cor imediatamente
      setCompanyColor(brandColor);
      
      toast.success('Cor da empresa atualizada!');
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setSavingBrandColor(false);
    }
  };

  const handleSaveDataPeriod = async () => {
    if (user?.role !== 'empresa') return;

    try {
      setSavingDataPeriod(true);
      await companyApi.updateDataPeriod(dataPeriod);
      toast.success('Período atualizado! Você será desconectado para aplicar as mudanças.');
      await logout();
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setSavingDataPeriod(false);
    }
  };

  // Carregar perfil do usuário quando o user mudar
  useEffect(() => {
    if (user) {
      loadProfile();
      if (user.role === 'empresa') {
        loadCompanyData();
        loadFiscalConfig();
        loadCompanyLogo();
        loadAutoMessageStatus();
        loadCatalogPageConfig();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Carregar preferências na montagem
  useEffect(() => {
    if (user) {
      loadNotificationPreferences();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user?.role === 'empresa') {
      setDataPeriod((user.dataPeriod as DataPeriodFilter | null) ?? 'THIS_YEAR');
    }
  }, [user?.dataPeriod, user?.role]);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      
      // Tentar carregar perfil completo da API
      let data;
      try {
        const response = await api.get('/auth/profile');
        data = response.data;
        console.log('Perfil carregado da API:', data);
      } catch (error) {
        console.log('Erro ao carregar da API, usando dados do contexto:', error);
        // Se falhar, usa os dados do contexto
        data = user;
      }
      
      setProfile(data);
      
      // Preencher formulário com dados do perfil
      setProfileForm({
        name: data?.name || '',
        email: data?.email || '',
        phone: data?.phone || '',
        login: data?.login || '',
      });
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
      // Em caso de erro, tenta usar os dados do contexto
      if (user) {
        setProfile(user);
        setProfileForm({
          name: user.name || '',
          email: (user as any).email || '',
          phone: (user as any).phone || '',
          login: user.login || '',
        });
      }
      toast.error(error.response?.data?.message || 'Erro ao carregar perfil');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setUpdatingProfile(true);
      
      // Validações básicas
      if (!profileForm.login || profileForm.login.length < 3) {
        toast.error('Login deve ter no mínimo 3 caracteres');
        return;
      }
      
      if (profileForm.email && !profileForm.email.includes('@')) {
        toast.error('Email inválido');
        return;
      }

      // Montar objeto com apenas os campos alterados
      const updates: any = {};
      if (profileForm.name && profileForm.name !== profile?.name) updates.name = profileForm.name;
      if (profileForm.email && profileForm.email !== profile?.email) updates.email = profileForm.email;
      if (profileForm.phone && profileForm.phone !== (profile?.phone || '')) updates.phone = profileForm.phone;
      if (profileForm.login && profileForm.login !== profile?.login) updates.login = profileForm.login;

      // Se nada foi alterado
      if (Object.keys(updates).length === 0) {
        toast.error('Nenhuma alteração detectada');
        return;
      }

      await api.put('/auth/profile', updates);
      toast.success('Perfil atualizado com sucesso!');
      
      // Recarregar perfil
      await loadProfile();
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error(error.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      // Validações
      if (!passwordForm.currentPassword) {
        toast.error('Digite sua senha atual');
        return;
      }

      if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
        toast.error('Nova senha deve ter no mínimo 6 caracteres');
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
      
      // Limpar formulário
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Desconectar após 2 segundos
      setTimeout(() => {
        if (logout) {
          logout();
        } else if (window.location) {
          window.location.reload();
        }
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast.error(error.response?.data?.message || 'Erro ao alterar senha');
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      setLoadingPreferences(true);
      const data = await notificationApi.getPreferences();
      console.log('Preferências carregadas:', data);
      setNotificationPreferences(data);
    } catch (error: any) {
      console.error('Erro ao carregar preferências:', error);
      
      // Se o erro for 401 (não autorizado), não mostra erro
      if (error.response?.status === 401) {
        console.log('Usuário não autenticado, ignorando erro de preferências');
        return;
      }
      
      // Se o erro for 404, cria preferências padrão localmente
      if (error.response?.status === 404) {
        console.log('Preferências não encontradas, criando padrões localmente');
        setNotificationPreferences({
          stockAlerts: false,
          billReminders: false,
          weeklyReports: false,
          salesAlerts: false,
          systemUpdates: false,
          emailEnabled: false,
          inAppEnabled: false,
        });
        return;
      }
      
      toast.error(error.response?.data?.message || 'Erro ao carregar preferências de notificação');
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleToggleNotification = async (field: string, value: boolean) => {
    try {
      setUpdatingPreferences(true);
      
      const updates = { [field]: value };
      console.log('Atualizando preferência:', { field, value, updates });
      
      const data = await notificationApi.updatePreferences(updates);
      console.log('Preferência atualizada:', data);
      
      // Atualizar estado local
      setNotificationPreferences({
        ...notificationPreferences,
        [field]: value,
      });
      
      toast.success('Preferência atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar preferência:', error);
      console.error('Detalhes do erro:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Erro ao atualizar preferência';
      
      toast.error(errorMessage);
      
      // Reverter estado local em caso de erro
      await loadNotificationPreferences();
    } finally {
      setUpdatingPreferences(false);
    }
  };

  const loadFiscalConfig = async () => {
    try {
      setLoadingFiscal(true);
      const response = await api.get('/company/my-company/fiscal-config');
      const data = response.data;
      
      setFiscalConfig(data);
      setFiscalForm({
        taxRegime: data.taxRegime || 'SIMPLES_NACIONAL',
        cnae: data.cnae || '',
        certificatePassword: '', // Não preencher por segurança
        nfceSerie: data.nfceSerie || '1',
        municipioIbge: data.municipioIbge || '',
        csc: '', // Não preencher por segurança
        idTokenCsc: data.idTokenCsc || '000001',
      });
    } catch (error) {
      console.error('Erro ao carregar configurações fiscais:', error);
      handleApiError(error);
    } finally {
      setLoadingFiscal(false);
    }
  };

  const handleUploadCertificate = async () => {
    if (!certificateFile) {
      toast.error('Selecione um arquivo de certificado (.pfx ou .p12)');
      return;
    }

    // Verificar se o administrador configurou a API Key do Focus NFe
    if (!fiscalConfig?.hasFocusNfeApiKey) {
      toast.error('API Key do Focus NFe não configurada. Solicite ao administrador que configure na página de empresas.');
      return;
    }

    // A senha DEVE estar salva no banco antes do upload
    if (!fiscalConfig?.hasCertificatePassword) {
      toast.error('Configure e SALVE a senha do certificado antes de fazer upload do arquivo. Clique em "Salvar Configurações Fiscais" primeiro.');
      return;
    }

    try {
      setUploadingCertificate(true);

      const formData = new FormData();
      formData.append('certificate', certificateFile);

      await api.post('/company/my-company/upload-certificate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Certificado enviado ao Focus NFe com sucesso!');
      setCertificateFile(null);
      
      // Recarregar configurações
      await loadFiscalConfig();
    } catch (error: any) {
      console.error('Erro ao enviar certificado:', error);
      handleApiError(error);
    } finally {
      setUploadingCertificate(false);
    }
  };

  const handleUpdateFiscalConfig = async () => {
    try {
      setUpdatingFiscal(true);

      // Validar campos obrigatórios se estiver configurando pela primeira vez
      if (!fiscalConfig?.municipioIbge && !fiscalForm.municipioIbge) {
        toast.error('Informe o código IBGE do município');
        return;
      }

      // Montar objeto com apenas os campos preenchidos
      const updates: any = {};
      
      if (fiscalForm.taxRegime) updates.taxRegime = fiscalForm.taxRegime;
      if (fiscalForm.cnae) updates.cnae = fiscalForm.cnae;
      if (fiscalForm.certificatePassword) updates.certificatePassword = fiscalForm.certificatePassword;
      if (fiscalForm.nfceSerie) updates.nfceSerie = fiscalForm.nfceSerie;
      if (fiscalForm.municipioIbge) updates.municipioIbge = fiscalForm.municipioIbge;
      if (fiscalForm.csc) updates.csc = fiscalForm.csc;
      if (fiscalForm.idTokenCsc) updates.idTokenCsc = fiscalForm.idTokenCsc;

      await api.patch('/company/my-company/fiscal-config', updates);
      toast.success('Configurações fiscais atualizadas com sucesso!');
      
      // Limpar campos sensíveis
      setFiscalForm({
        ...fiscalForm,
        certificatePassword: '',
        csc: '',
      });
      
      // Recarregar configurações
      await loadFiscalConfig();
    } catch (error: any) {
      console.error('Erro ao atualizar configurações fiscais:', error);
      handleApiError(error);
    } finally {
      setUpdatingFiscal(false);
    }
  };


  // Funções para gerenciar logo da empresa
  const loadCompanyLogo = async () => {
    try {
      const response = await companyApi.myCompany();
      // companyApi.myCompany() retorna AxiosResponse, precisa acessar .data
      const logoUrl = response.data?.logoUrl;
      setCompanyLogo(logoUrl);
    } catch (error) {
      console.error('Erro ao carregar logo da empresa:', error);
      setCompanyLogo(null);
    }
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não permitido. Apenas imagens são aceitas.');
        return;
      }

      // Validar tamanho (máximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Tamanho máximo permitido: 5MB');
        return;
      }

      setLogoFile(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }

    try {
      setUploadingLogo(true);
      const response = await companyApi.uploadLogo(logoFile);
      
      toast.success('Logo enviado com sucesso!');
      setLogoFile(null);
      
      // Recarregar logo
      await loadCompanyLogo();
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
      
      // Recarregar logo
      await loadCompanyLogo();
    } catch (error: any) {
      console.error('Erro ao remover logo:', error);
      handleApiError(error);
    } finally {
      setRemovingLogo(false);
    }
  };

  // Funções para gerenciar mensagens automáticas
  const loadAutoMessageStatus = async () => {
    try {
      setLoadingAutoMessage(true);
      const response = await api.get('/company/my-company/auto-message/status');
      setAutoMessageStatus(response.data);
    } catch (error) {
      console.error('Erro ao carregar status de mensagens automáticas:', error);
      setAutoMessageStatus(null);
    } finally {
      setLoadingAutoMessage(false);
    }
  };

  const handleToggleAutoMessage = async (enable: boolean) => {
    try {
      // Verificar plano antes de habilitar
      if (enable && companyData?.plan) {
        const plan = companyData.plan.toUpperCase();
        if (plan !== 'PLUS' && plan !== 'PRO') {
          toast.error('O envio automático de mensagens de cobrança está disponível apenas para planos Plus e Pro. Faça upgrade para utilizar esta funcionalidade.');
          return;
        }
      }

      setTogglingAutoMessage(true);
      const endpoint = enable 
        ? '/company/my-company/auto-message/enable' 
        : '/company/my-company/auto-message/disable';
      
      const response = await api.patch(endpoint);
      
      toast.success(response.data.message || `Mensagens automáticas ${enable ? 'ativadas' : 'desativadas'} com sucesso!`);
      
      // Recarregar status
      await loadAutoMessageStatus();
    } catch (error: any) {
      console.error('Erro ao alterar status de mensagens automáticas:', error);
      // Verificar se erro é relacionado ao plano
      if (error.response?.data?.message?.includes('plano')) {
        toast.error('Esta funcionalidade está disponível apenas para planos Plus e Pro.');
      } else {
        handleApiError(error);
      }
    } finally {
      setTogglingAutoMessage(false);
    }
  };

  // Funções para gerenciar página de catálogo
  const loadCatalogPageConfig = async () => {
    try {
      setLoadingCatalogPage(true);
      const response = await api.get('/company/my-company/catalog-page');
      setCatalogPageConfig(response.data);
      setCatalogPageForm({
        url: response.data.catalogPageUrl || '',
        enabled: response.data.catalogPageEnabled || false,
      });
    } catch (error) {
      console.error('Erro ao carregar configurações da página de catálogo:', error);
      setCatalogPageConfig(null);
    } finally {
      setLoadingCatalogPage(false);
    }
  };

  const handleUpdateCatalogPage = async () => {
    try {
      setUpdatingCatalogPage(true);

      // Verificar plano antes de habilitar
      if (catalogPageForm.enabled && companyData?.plan) {
        const plan = companyData.plan.toUpperCase();
        if (plan !== 'PRO') {
          toast.error('O catálogo público está disponível apenas para empresas com plano Pro. Faça upgrade para utilizar esta funcionalidade.');
          setUpdatingCatalogPage(false);
          // Reverter estado do formulário
          setCatalogPageForm({
            ...catalogPageForm,
            enabled: false,
          });
          return;
        }
      }

      // Validar URL se estiver sendo habilitada
      if (catalogPageForm.enabled && !catalogPageForm.url) {
        toast.error('Informe uma URL para a página de catálogo');
        return;
      }

      const updates: any = {};
      if (catalogPageForm.url) updates.catalogPageUrl = catalogPageForm.url;
      if (catalogPageForm.enabled !== catalogPageConfig?.catalogPageEnabled) {
        updates.catalogPageEnabled = catalogPageForm.enabled;
      }

      await api.patch('/company/my-company/catalog-page', updates);
      
      toast.success('Configurações da página de catálogo atualizadas com sucesso!');
      
      // Recarregar configurações
      await loadCatalogPageConfig();
    } catch (error: any) {
      console.error('Erro ao atualizar página de catálogo:', error);
      // Verificar se erro é relacionado ao plano
      if (error.response?.data?.message?.includes('plano PRO') || error.response?.data?.message?.includes('plano Pro')) {
        toast.error('O catálogo público está disponível apenas para empresas com plano Pro.');
        // Reverter estado do formulário
        setCatalogPageForm({
          ...catalogPageForm,
          enabled: false,
        });
      } else {
        handleApiError(error);
      }
    } finally {
      setUpdatingCatalogPage(false);
    }
  };

  // Desativar/ativar catálogo ao clicar no toggle
  const handleToggleCatalogEnabled = async (nextEnabled: boolean) => {
    setCatalogPageForm({ ...catalogPageForm, enabled: nextEnabled });

    // Desativar imediatamente sem exigir salvar
    if (!nextEnabled) {
      try {
        setUpdatingCatalogPage(true);
        await api.patch('/company/my-company/catalog-page', { catalogPageEnabled: false });
        toast.success('Página de catálogo desativada.');
        await loadCatalogPageConfig();
      } catch (error) {
        handleApiError(error as any);
      } finally {
        setUpdatingCatalogPage(false);
      }
      return;
    }

    // Ao ativar, manter fluxo existente (requer salvar) para validar URL e plano
    toast('Defina a URL e clique em Salvar para ativar o catálogo.');
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      {user?.role === 'empresa' && (
        <nav className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b rounded-md">
          <div className="flex flex-wrap gap-2 p-2">
            <a href="#empresa-logo-cor"><Button variant="outline" size="sm">Empresa</Button></a>
            <a href="#periodo-dados"><Button variant="outline" size="sm">Período</Button></a>
            <a href="#catalogo-titulo"><Button variant="outline" size="sm">Catálogo</Button></a>
            <a href="#notificacoes-fim"><Button variant="outline" size="sm">Notificações</Button></a>
          </div>
        </nav>
      )}

      <div className="grid gap-6">
        {user?.role === 'empresa' && (
          <Card id="periodo-dados" className="scroll-mt-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Período padrão dos dados
              </CardTitle>
              <CardDescription>
                Defina o intervalo padrão utilizado em vendas, orçamentos e fechamento de caixa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="data-period-select">Período padrão</Label>
                  <Select
                    value={dataPeriod}
                    onValueChange={(value) => setDataPeriod(value as DataPeriodFilter)}
                  >
                    <SelectTrigger id="data-period-select" className="w-full sm:w-64">
                      <SelectValue placeholder="Selecione um período" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_PERIOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSaveDataPeriod}
                  disabled={savingDataPeriod}
                  className="w-full sm:w-auto"
                >
                  {savingDataPeriod ? 'Salvando...' : 'Salvar período'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Após salvar, você será direcionado para o login. Na próxima autenticação os dados serão carregados automaticamente com o período escolhido.
              </p>
            </CardContent>
          </Card>
        )}

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

            {profile?.plan && (
              <div className="space-y-2">
                <Label>Plano</Label>
                <Input value={profile.plan} disabled className="capitalize bg-muted" />
              </div>
            )}

            <Button 
              onClick={handleUpdateProfile} 
              disabled={updatingProfile}
              className="w-full sm:w-auto"
            >
              {updatingProfile ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
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

        {/* Segurança - Alterar Senha */}
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
              <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
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

        {/* Configurações Fiscais - Apenas para Empresas */}
        {user?.role === 'empresa' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Configurações Fiscais
              </CardTitle>
              <CardDescription>
                Configure as credenciais para emissão automática de NFC-e
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingFiscal ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Segurança dos Dados
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Todos os dados sensíveis (API Key, senha do certificado e CSC) são criptografados antes de serem armazenados.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Alerta se a API Key do Focus NFe não estiver configurada */}
                  {!fiscalConfig?.hasFocusNfeApiKey && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                            ⚠️ API Key do Focus NFe não configurada
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            Solicite ao administrador que configure a API Key do Focus NFe na página de empresas antes de fazer upload do certificado digital.
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                            <strong>Ambiente atual:</strong> {fiscalConfig?.focusNfeEnvironment === 'production' ? 'Produção' : 'Homologação (Testes)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Alerta se a API Key estiver configurada */}
                  {fiscalConfig?.hasFocusNfeApiKey && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <Shield className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">
                            ✓ API Key do Focus NFe configurada
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            O sistema está pronto para emitir notas fiscais. Configure os dados abaixo e faça upload do certificado digital.
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                            <strong>Ambiente atual:</strong> {fiscalConfig?.focusNfeEnvironment === 'production' ? 'Produção' : 'Homologação (Testes)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="taxRegime">Regime Tributário *</Label>
                      <Select
                        value={fiscalForm.taxRegime}
                        onValueChange={(value) => setFiscalForm({ ...fiscalForm, taxRegime: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                          <SelectItem value="LUCRO_PRESUMIDO">Lucro Presumido</SelectItem>
                          <SelectItem value="LUCRO_REAL">Lucro Real</SelectItem>
                          <SelectItem value="MEI">MEI - Microempreendedor Individual</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Regime de tributação da sua empresa
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnae">CNAE (Opcional)</Label>
                      <Input
                        id="cnae"
                        value={fiscalForm.cnae}
                        onChange={(e) => setFiscalForm({ ...fiscalForm, cnae: e.target.value })}
                        placeholder="Ex: 4761001"
                        maxLength={7}
                      />
                      <p className="text-xs text-muted-foreground">
                        7 dígitos - Classificação da atividade econômica
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="municipioIbge">
                        Código IBGE Município *
                        {fiscalConfig?.municipioIbge && (
                          <span className="text-xs text-green-600 ml-2">✓ {fiscalConfig.municipioIbge}</span>
                        )}
                      </Label>
                      <Input
                        id="municipioIbge"
                        value={fiscalForm.municipioIbge}
                        onChange={(e) => setFiscalForm({ ...fiscalForm, municipioIbge: e.target.value })}
                        placeholder="Ex: 4205407 (Florianópolis)"
                        maxLength={7}
                      />
                      <p className="text-xs text-muted-foreground">
                        7 dígitos - <a href="https://www.ibge.gov.br/explica/codigos-dos-municipios.php" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Consultar código</a>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nfceSerie">Série NFC-e</Label>
                      <Input
                        id="nfceSerie"
                        value={fiscalForm.nfceSerie}
                        onChange={(e) => setFiscalForm({ ...fiscalForm, nfceSerie: e.target.value })}
                        placeholder="1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Geralmente "1" (configurado na SEFAZ)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="certificatePassword">
                        Senha do Certificado Digital
                        {fiscalConfig?.hasCertificatePassword && (
                          <span className="text-xs text-green-600 ml-2">✓ Configurado</span>
                        )}
                      </Label>
                      <Input
                        id="certificatePassword"
                        type="password"
                        value={fiscalForm.certificatePassword}
                        onChange={(e) => setFiscalForm({ ...fiscalForm, certificatePassword: e.target.value })}
                        placeholder="Deixe vazio para não alterar"
                      />
                      <p className="text-xs text-muted-foreground">
                        Senha do arquivo .pfx do certificado e-CNPJ
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="idTokenCsc">ID Token CSC</Label>
                      <Input
                        id="idTokenCsc"
                        value={fiscalForm.idTokenCsc}
                        onChange={(e) => setFiscalForm({ ...fiscalForm, idTokenCsc: e.target.value })}
                        placeholder="000001"
                      />
                      <p className="text-xs text-muted-foreground">
                        Geralmente "000001" (obtido na SEFAZ)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="csc">
                      CSC - Código de Segurança do Contribuinte
                      {fiscalConfig?.hasCsc && (
                        <span className="text-xs text-green-600 ml-2">✓ Configurado</span>
                      )}
                    </Label>
                    <Input
                      id="csc"
                      type="password"
                      value={fiscalForm.csc}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, csc: e.target.value })}
                      placeholder="Deixe vazio para não alterar"
                    />
                    <p className="text-xs text-muted-foreground">
                      Código obtido no portal da SEFAZ-SC após credenciamento
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                      📄 Upload do Certificado Digital
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-200 mt-2 mb-3">
                      Configure a senha do certificado abaixo e faça upload do arquivo .pfx aqui. O sistema enviará automaticamente para o Focus NFe.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="certificateFile" className="text-sm">
                          Arquivo do Certificado (.pfx ou .p12)
                        </Label>
                        <Input
                          id="certificateFile"
                          type="file"
                          accept=".pfx,.p12"
                          onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                          disabled={uploadingCertificate}
                          className="cursor-pointer"
                        />
                        {certificateFile && (
                          <p className="text-xs text-green-600">
                            ✓ Arquivo selecionado: {certificateFile.name}
                          </p>
                        )}
                      </div>
                      
                      <Button
                        onClick={handleUploadCertificate}
                        disabled={!certificateFile || uploadingCertificate}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        {uploadingCertificate ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Enviando para Focus NFe...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Enviar Certificado ao Focus NFe
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
                      <strong>⚠️ Importante:</strong> Configure a senha do certificado abaixo ANTES de fazer upload. O sistema usa a senha configurada para enviar ao Focus NFe.
                    </p>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>📋 Pré-requisitos:</strong>
                    </p>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 ml-4 space-y-1">
                      <li>• Credenciar sua empresa na SEFAZ-SC: <a href="https://nfce.svrs.rs.gov.br" target="_blank" rel="noopener noreferrer" className="underline">Portal SEFAZ</a></li>
                      <li>• Obter certificado digital e-CNPJ (arquivo .pfx)</li>
                      <li>• Fazer upload do certificado no painel Focus NFe (veja aviso acima 👆)</li>
                      <li>• Configurar CSC no portal da SEFAZ e anotar o código</li>
                      <li>• Consultar código IBGE do seu município</li>
                      <li>• Definir regime tributário da empresa</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={handleUpdateFiscalConfig} 
                    disabled={updatingFiscal}
                    className="w-full sm:w-auto"
                  >
                    {updatingFiscal ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Configurações Fiscais
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mensagens Automáticas - Apenas para Empresas */}
        {user?.role === 'empresa' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Mensagens Automáticas de Cobrança
              </CardTitle>
              <CardDescription>
                Configure o envio automático de mensagens para clientes com parcelas a vencer ou vencidas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingAutoMessage ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : (
                <>
                  {/* Aviso de plano */}
                  {companyData?.plan && companyData.plan.toUpperCase() !== 'PLUS' && companyData.plan.toUpperCase() !== 'PRO' && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                            Funcionalidade disponível apenas para planos Plus e Pro
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            Seu plano atual: <strong>{companyData.plan}</strong>. Faça upgrade para utilizar o envio automático de mensagens de cobrança.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Status atual */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${autoMessageStatus?.autoMessageEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <p className="font-medium">
                          Status: {autoMessageStatus?.autoMessageEnabled ? 'Ativado' : 'Desativado'}
                        </p>
                      </div>
                      {autoMessageStatus && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>• Parcelas não pagas: {autoMessageStatus.totalUnpaidInstallments || 0}</p>
                          <p>• Total de mensagens enviadas: {autoMessageStatus.totalMessagesSent || 0}</p>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleToggleAutoMessage(!autoMessageStatus?.autoMessageEnabled)}
                      disabled={togglingAutoMessage || (companyData?.plan && companyData.plan.toUpperCase() !== 'PLUS' && companyData.plan.toUpperCase() !== 'PRO' && !autoMessageStatus?.autoMessageEnabled)}
                      variant={autoMessageStatus?.autoMessageEnabled ? "destructive" : "default"}
                    >
                      {togglingAutoMessage ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Processando...
                        </>
                      ) : (
                        <>
                          {autoMessageStatus?.autoMessageEnabled ? 'Desativar' : 'Ativar'}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Informações sobre o funcionamento */}
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
                      📱 Como funciona o envio automático:
                    </p>
                    <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-2">
                      <li>• <strong>No dia do vencimento:</strong> O sistema envia uma mensagem lembrando o cliente sobre o pagamento</li>
                      <li>• <strong>Parcelas atrasadas:</strong> Mensagens são enviadas a cada 3 dias após o vencimento</li>
                      <li>• <strong>Horário:</strong> As mensagens são enviadas automaticamente às 9h da manhã</li>
                      <li>• <strong>Requisito:</strong> O cliente deve ter um telefone válido cadastrado</li>
                    </ul>
                  </div>

                  {/* Exemplo de mensagem */}
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                      💬 Exemplo de mensagem enviada:
                    </p>
                    <div className="bg-white dark:bg-gray-950 rounded-lg p-3 text-xs border">
                      <p className="font-medium mb-2">🔔 LEMBRETE DE PAGAMENTO</p>
                      <p className="mb-1">Olá, [Nome do Cliente]!</p>
                      <p className="mb-1">📅 <strong>HOJE É O VENCIMENTO</strong> da sua parcela 1/3 na loja <strong>[Nome da Empresa]</strong>.</p>
                      <p className="mb-1">💰 <strong>Valor:</strong> R$ 150,00</p>
                      <p>Por favor, dirija-se à loja para efetuar o pagamento e manter seu crédito em dia.</p>
                      <p className="mt-2 opacity-75">Agradecemos a sua preferência! 🙏</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Logo da Empresa - Apenas para Empresas */}
        {user?.role === 'empresa' && (
          <Card id="empresa-logo-cor" className="scroll-mt-24">
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
              {/* Logo atual */}
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

              {/* Upload de novo logo */}
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

                {logoFile && (
                  <div className="space-y-4">
                    <div>
                      <Label>Pré-visualização</Label>
                      <div className="mt-2 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                        <img
                          src={URL.createObjectURL(logoFile)}
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

              {/* Cor da empresa */}
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
                <p className="text-xs text-muted-foreground">Essa cor será aplicada como primária (botões, destaques e gráficos).</p>
              </div>

              {/* Informações */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>ℹ️ Informação:</strong> O logo será exibido no header e a cor será aplicada em todo o sistema.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Página de Catálogo Pública - Apenas para Empresas */}
        {user?.role === 'empresa' && (
          <Card className="scroll-mt-24" id="catalogo">
            <CardHeader>
              <CardTitle id="catalogo-titulo" className="flex items-center gap-2 scroll-mt-24">
                <Store className="h-5 w-5" />
                Página de Catálogo Pública
              </CardTitle>
              <CardDescription>
                Crie uma página pública de catálogo para exibir seus produtos na web
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingCatalogPage ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : (
                <>
                  {/* Aviso de plano */}
                  {companyData?.plan && companyData.plan.toUpperCase() !== 'PRO' && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                            Funcionalidade disponível apenas para plano Pro
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            Seu plano atual: <strong>{companyData.plan}</strong>. Faça upgrade para plano Pro para utilizar o catálogo público.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Status da página */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${catalogPageForm.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <div>
                        <p className="font-medium">
                          {catalogPageForm.enabled ? 'Página Ativa' : 'Página Desativada'}
                        </p>
                        {catalogPageForm.enabled && catalogPreviewUrl && (
                          <a
                            href={catalogPreviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {catalogPreviewUrl}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Formulário */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="catalog-url">
                        URL da Página (apenas letras minúsculas, números, hífen e underscore)
                      </Label>
                      <Input
                        id="catalog-url"
                        value={catalogPageForm.url}
                        onChange={(e) => setCatalogPageForm({ ...catalogPageForm, url: e.target.value.toLowerCase() })}
                        placeholder="exemplo: masolucoes"
                        disabled={updatingCatalogPage}
                      />
                      <p className="text-xs text-muted-foreground">
                        Exemplo: se você digitar "masolucoes", sua página será acessível em {`${PUBLIC_SITE_URL}/catalog/masolucoes`}
                      </p>
                    </div>

                    {catalogPublicUrl && (
                      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                          ✅ Sua página está disponível
                        </p>
                        <a
                          href={catalogPublicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 text-green-700 dark:text-green-300 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="flex flex-col">
                            <span className="font-medium">Abrir página pública</span>
                            <span className="text-xs break-all">{catalogPublicUrl}</span>
                          </span>
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Ativar Página</p>
                        <p className="text-sm text-muted-foreground">
                          Torna sua página de catálogo acessível publicamente
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={catalogPageForm.enabled}
                          onChange={(e) => handleToggleCatalogEnabled(e.target.checked)}
                          className="sr-only peer"
                          disabled={updatingCatalogPage || (companyData?.plan && companyData.plan.toUpperCase() !== 'PRO')}
                        />
                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary ${companyData?.plan && companyData.plan.toUpperCase() !== 'PRO' ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                      </label>
                    </div>

                    <Button
                      onClick={handleUpdateCatalogPage}
                      disabled={updatingCatalogPage}
                      className="w-full"
                    >
                      {updatingCatalogPage ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Configurações
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Informações */}
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      ℹ️ Sobre a Página de Catálogo
                    </p>
                    <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• Lista todos os seus produtos com estoque disponível</li>
                      <li>• Exibe fotos, preços e informações dos produtos</li>
                      <li>• Mostra suas informações de contato (telefone, email, endereço)</li>
                      <li>• Acesso público - não requer login</li>
                      <li>• Compartilhe o link com seus clientes!</li>
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notificações */}
        <Card id="notificacoes" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>Configure suas preferências de notificação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingPreferences ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Carregando preferências...</p>
              </div>
            ) : notificationPreferences ? (
              <>
                {/* Alertas de Estoque */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Alertas de Estoque</p>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações quando o estoque estiver baixo
                    </p>
                  </div>
                  <Button
                    variant={notificationPreferences.stockAlerts ? "default" : "outline"}
                    onClick={() => handleToggleNotification('stockAlerts', !notificationPreferences.stockAlerts)}
                    disabled={updatingPreferences}
                  >
                    {notificationPreferences.stockAlerts ? 'Ativado' : 'Desativado'}
                  </Button>
                </div>
                
                {/* Contas a Vencer */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Contas a Vencer</p>
                    <p className="text-sm text-muted-foreground">
                      Receba lembretes de contas próximas do vencimento
                    </p>
                  </div>
                  <Button
                    variant={notificationPreferences.billReminders ? "default" : "outline"}
                    onClick={() => handleToggleNotification('billReminders', !notificationPreferences.billReminders)}
                    disabled={updatingPreferences}
                  >
                    {notificationPreferences.billReminders ? 'Ativado' : 'Desativado'}
                  </Button>
                </div>

                {/* Relatórios Semanais */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Relatórios Semanais</p>
                    <p className="text-sm text-muted-foreground">
                      Receba resumo semanal das vendas por email
                    </p>
                  </div>
                  <Button
                    variant={notificationPreferences.weeklyReports ? "default" : "outline"}
                    onClick={() => handleToggleNotification('weeklyReports', !notificationPreferences.weeklyReports)}
                    disabled={updatingPreferences}
                  >
                    {notificationPreferences.weeklyReports ? 'Ativado' : 'Desativado'}
                  </Button>
                </div>

                {/* Alertas de Vendas */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Alertas de Vendas</p>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações de novas vendas realizadas
                    </p>
                  </div>
                  <Button
                    variant={notificationPreferences.salesAlerts ? "default" : "outline"}
                    onClick={() => handleToggleNotification('salesAlerts', !notificationPreferences.salesAlerts)}
                    disabled={updatingPreferences}
                  >
                    {notificationPreferences.salesAlerts ? 'Ativado' : 'Desativado'}
                  </Button>
                </div>

                {/* Atualizações do Sistema */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Atualizações do Sistema</p>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações sobre atualizações e novidades
                    </p>
                  </div>
                  <Button
                    variant={notificationPreferences.systemUpdates ? "default" : "outline"}
                    onClick={() => handleToggleNotification('systemUpdates', !notificationPreferences.systemUpdates)}
                    disabled={updatingPreferences}
                  >
                    {notificationPreferences.systemUpdates ? 'Ativado' : 'Desativado'}
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-4">Canais de Notificação</h4>
                  
                  {/* Email */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">Notificações por Email</p>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações no email cadastrado
                      </p>
                    </div>
                    <Button
                      variant={notificationPreferences.emailEnabled ? "default" : "outline"}
                      onClick={() => handleToggleNotification('emailEnabled', !notificationPreferences.emailEnabled)}
                      disabled={updatingPreferences}
                    >
                      {notificationPreferences.emailEnabled ? 'Ativado' : 'Desativado'}
                    </Button>
                  </div>

                  {/* In-App */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notificações In-App</p>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações dentro do sistema
                      </p>
                    </div>
                    <Button
                      variant={notificationPreferences.inAppEnabled ? "default" : "outline"}
                      onClick={() => handleToggleNotification('inAppEnabled', !notificationPreferences.inAppEnabled)}
                      disabled={updatingPreferences}
                    >
                      {notificationPreferences.inAppEnabled ? 'Ativado' : 'Desativado'}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground">Erro ao carregar preferências</p>
            )}
          </CardContent>
        </Card>
        {/* Sentinel para rolar até o fim de Notificações */}
        <div id="notificacoes-fim" className="h-1" />
      </div>
    </div>
  );
}

