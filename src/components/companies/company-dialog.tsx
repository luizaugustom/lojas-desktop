import { useState, useEffect } from 'react';
import { Company, CreateCompanyDto, PlanType } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Building2, Phone, Mail, Hash, MapPin, CreditCard, Palette, Crown, Lock, User, Settings } from 'lucide-react';
import { Switch } from '../ui/switch';
import { useAuth } from '../../hooks/useAuth';
import { uploadApi } from '../../lib/api-endpoints';
import { toast } from 'react-hot-toast';

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
  onSave: (data: CreateCompanyDto) => void;
}

export function CompanyDialog({ open, onOpenChange, company, onSave }: CompanyDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [formData, setFormData] = useState<CreateCompanyDto>({
    name: '',
    fantasyName: '',
    login: '',
    password: '',
    cnpj: '',
    email: '',
    phone: '',
    stateRegistration: '',
    municipalRegistration: '',
    plan: PlanType.PRO,
    logoUrl: '',
    brandColor: '#3B82F6',
    zipCode: '',
    state: '',
    city: '',
    district: '',
    street: '',
    number: '',
    complement: '',
    beneficiaryName: '',
    beneficiaryCpfCnpj: '',
    bankCode: '',
    bankName: '',
    agency: '',
    accountNumber: '',
    accountType: 'corrente',
    maxProducts: null,
    maxCustomers: null,
    maxSellers: null,
    photoUploadEnabled: true,
    maxPhotosPerProduct: null,
    nfceEmissionEnabled: true,
    nfeEmissionEnabled: true,
    catalogPageAllowed: true,
    autoMessageAllowed: true,
  } as CreateCompanyDto);

  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        fantasyName: company.fantasyName || '',
        login: company.login || company.email,
        password: '',
        cnpj: company.cnpj,
        email: company.email,
        phone: company.phone || '',
        stateRegistration: '',
        municipalRegistration: '',
        plan: company.plan || PlanType.PRO,
        logoUrl: company.logoUrl || '',
        brandColor: company.brandColor || '#3B82F6',
        zipCode: '',
        state: '',
        city: '',
        district: '',
        street: '',
        number: '',
        complement: '',
        beneficiaryName: '',
        beneficiaryCpfCnpj: '',
        bankCode: '',
        bankName: '',
        agency: '',
        accountNumber: '',
        accountType: 'corrente',
        maxProducts: company.maxProducts ?? null,
        maxCustomers: company.maxCustomers ?? null,
        maxSellers: company.maxSellers ?? null,
        photoUploadEnabled: company.photoUploadEnabled ?? true,
        maxPhotosPerProduct: company.maxPhotosPerProduct ?? null,
        nfceEmissionEnabled: company.nfceEmissionEnabled ?? true,
        nfeEmissionEnabled: company.nfeEmissionEnabled ?? true,
        catalogPageAllowed: company.catalogPageAllowed ?? true,
        autoMessageAllowed: company.autoMessageAllowed ?? true,
      });
    } else {
      setFormData({
        name: '',
        fantasyName: '',
        login: '',
        password: '',
        cnpj: '',
        email: '',
        phone: '',
        stateRegistration: '',
        municipalRegistration: '',
        plan: PlanType.PRO,
        logoUrl: '',
        brandColor: '#3B82F6',
        zipCode: '',
        state: '',
        city: '',
        district: '',
        street: '',
        number: '',
        complement: '',
        beneficiaryName: '',
        beneficiaryCpfCnpj: '',
        bankCode: '',
        bankName: '',
        agency: '',
        accountNumber: '',
        accountType: 'corrente',
        maxProducts: null,
        maxCustomers: null,
        maxSellers: null,
        photoUploadEnabled: true,
        maxPhotosPerProduct: null,
        nfceEmissionEnabled: true,
        nfeEmissionEnabled: true,
        catalogPageAllowed: true,
        autoMessageAllowed: true,
      });
    }
  }, [company, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
      if (!phoneRegex.test(formData.phone)) {
        toast.error('Telefone deve estar no formato (XX) XXXXX-XXXX');
        return;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.login && formData.login.trim() && !emailRegex.test(formData.login.trim())) {
      toast.error('Login deve ser um email válido');
      return;
    }

    setLoading(true);
    try {
      const dataToSave: CreateCompanyDto = {
        name: formData.name.trim(),
        login: formData.login.trim(),
        cnpj: formData.cnpj,
        email: formData.email.trim(),
        phone: formData.phone || undefined,
        brandColor: formData.brandColor,
        ...(formData.password && formData.password.trim() && { password: formData.password.trim() }),
        ...(formData.stateRegistration && { stateRegistration: formData.stateRegistration.trim() }),
        ...(formData.municipalRegistration && { municipalRegistration: formData.municipalRegistration.trim() }),
        ...(formData.plan && { plan: formData.plan }),
        ...(formData.logoUrl && { logoUrl: formData.logoUrl.trim() }),
        ...(formData.zipCode && formData.zipCode.includes('-') && { zipCode: formData.zipCode }),
        ...(formData.state && { state: formData.state.trim() }),
        ...(formData.city && { city: formData.city.trim() }),
        ...(formData.district && { district: formData.district.trim() }),
        ...(formData.street && { street: formData.street.trim() }),
        ...(formData.number && { number: formData.number.trim() }),
        ...(formData.complement && { complement: formData.complement.trim() }),
        ...(formData.beneficiaryName && { beneficiaryName: formData.beneficiaryName.trim() }),
        ...(formData.beneficiaryCpfCnpj && { beneficiaryCpfCnpj: formData.beneficiaryCpfCnpj }),
        ...(formData.bankCode && { bankCode: formData.bankCode.trim() }),
        ...(formData.bankName && { bankName: formData.bankName.trim() }),
        ...(formData.agency && { agency: formData.agency.trim() }),
        ...(formData.accountNumber && { accountNumber: formData.accountNumber.trim() }),
        ...(formData.accountType && { accountType: formData.accountType }),
        ...(isAdmin && {
          maxProducts: formData.maxProducts ?? null,
          maxCustomers: formData.maxCustomers ?? null,
          maxSellers: formData.maxSellers ?? null,
          photoUploadEnabled: formData.photoUploadEnabled ?? true,
          maxPhotosPerProduct: formData.maxPhotosPerProduct ?? null,
          nfceEmissionEnabled: formData.nfceEmissionEnabled ?? true,
          nfeEmissionEnabled: formData.nfeEmissionEnabled ?? true,
          catalogPageAllowed: formData.catalogPageAllowed ?? true,
          autoMessageAllowed: formData.autoMessageAllowed ?? true,
        }),
      };
      await onSave(dataToSave);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateCompanyDto, value: string | number | null | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 5) {
      return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    } else if (numbers.length <= 8) {
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    } else if (numbers.length <= 12) {
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    }
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    }
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const response = await uploadApi.single(file);
      if (response.data?.fileUrl) {
        setFormData(prev => ({ ...prev, logoUrl: response.data.fileUrl }));
        toast.success('Logo enviada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Building2 className="h-5 w-5" />
            {company ? 'Editar Empresa' : 'Nova Empresa'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="name" className="flex items-center gap-2 text-foreground">
                    <Building2 className="h-4 w-4" />
                    Razão Social *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ex: MINHA LOJA LTDA"
                    required
                    className="text-foreground"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="fantasyName" className="flex items-center gap-2 text-foreground">
                    <Building2 className="h-4 w-4" />
                    Nome Fantasia
                  </Label>
                  <Input
                    id="fantasyName"
                    value={formData.fantasyName}
                    onChange={(e) => handleChange('fantasyName', e.target.value)}
                    placeholder="Ex: Loja do João"
                    className="text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nome usado no catálogo público e comunicações com clientes
                  </p>
                </div>

                {(!company || (company && isAdmin)) && (
                  <>
                    <div className="md:col-span-2">
                      <Label htmlFor="login" className="flex items-center gap-2 text-foreground">
                        <User className="h-4 w-4" />
                        Login (Email) {!company && '*'}
                      </Label>
                      <Input
                        id="login"
                        type="email"
                        value={formData.login}
                        onChange={(e) => handleChange('login', e.target.value)}
                        placeholder="login@empresa.com"
                        required={!company}
                        className="text-foreground"
                      />
                      {company && isAdmin && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Edite o login de acesso da empresa
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="password" className="flex items-center gap-2 text-foreground">
                        <Lock className="h-4 w-4" />
                        Senha {!company && '*'}
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        placeholder={company ? "Deixe em branco para manter a senha atual" : "Mínimo 6 caracteres"}
                        required={!company}
                        className="text-foreground"
                      />
                      {company && isAdmin && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Preencha apenas se desejar alterar a senha
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="cnpj" className="flex items-center gap-2 text-foreground">
                    <Hash className="h-4 w-4" />
                    CNPJ *
                  </Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleChange('cnpj', formatCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    required
                    maxLength={18}
                    className="text-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2 text-foreground">
                    <Mail className="h-4 w-4" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contato@empresa.com"
                    required
                    className="text-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2 text-foreground">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="text-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="plan" className="flex items-center gap-2 text-foreground">
                    <Crown className="h-4 w-4" />
                    Plano
                  </Label>
                  <select
                    id="plan"
                    value={formData.plan}
                    onChange={(e) => handleChange('plan', e.target.value as PlanType)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground"
                  >
                    <option value={PlanType.PRO}>Pro</option>
                    <option value={PlanType.TRIAL_7_DAYS}>Teste Grátis (7 dias)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="stateRegistration" className="text-foreground">
                    Inscrição Estadual
                  </Label>
                  <Input
                    id="stateRegistration"
                    value={formData.stateRegistration}
                    onChange={(e) => handleChange('stateRegistration', e.target.value)}
                    placeholder="000.000.000.000"
                    className="text-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="municipalRegistration" className="text-foreground">
                    Inscrição Municipal
                  </Label>
                  <Input
                    id="municipalRegistration"
                    value={formData.municipalRegistration}
                    onChange={(e) => handleChange('municipalRegistration', e.target.value)}
                    placeholder="000000000"
                    className="text-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="brandColor" className="flex items-center gap-2 text-foreground">
                    <Palette className="h-4 w-4" />
                    Cor da Marca
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="brandColor"
                      type="color"
                      value={formData.brandColor}
                      onChange={(e) => handleChange('brandColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.brandColor}
                      onChange={(e) => handleChange('brandColor', e.target.value)}
                      placeholder="#3B82F6"
                      className="flex-1 text-foreground"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="logo" className="text-foreground">Logomarca</Label>
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                  {uploadingLogo && (
                    <p className="text-xs text-muted-foreground mt-1">Enviando logo...</p>
                  )}
                  {formData.logoUrl && (
                    <div className="mt-2">
                      <img src={formData.logoUrl} alt="Logomarca" className="h-16 rounded" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <MapPin className="h-5 w-5" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zipCode" className="text-foreground">CEP</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleChange('zipCode', formatCEP(e.target.value))}
                    placeholder="00000-000"
                    maxLength={9}
                    className="text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-foreground">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="UF"
                    className="text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-foreground">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Nome da cidade"
                    className="text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="district" className="text-foreground">Bairro</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => handleChange('district', e.target.value)}
                    placeholder="Nome do bairro"
                    className="text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="street" className="text-foreground">Rua</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => handleChange('street', e.target.value)}
                    placeholder="Nome da rua"
                    className="text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="number" className="text-foreground">Número</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => handleChange('number', e.target.value)}
                    placeholder="123"
                    className="text-foreground"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="complement" className="text-foreground">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => handleChange('complement', e.target.value)}
                    placeholder="Apto, sala, etc."
                    className="text-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <CreditCard className="h-5 w-5" />
                Dados Bancários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="beneficiaryName" className="text-foreground">Nome do Beneficiário</Label>
                  <Input
                    id="beneficiaryName"
                    value={formData.beneficiaryName}
                    onChange={(e) => handleChange('beneficiaryName', e.target.value)}
                    placeholder="Nome completo"
                    className="text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="beneficiaryCpfCnpj" className="text-foreground">CPF/CNPJ do Beneficiário</Label>
                  <Input
                    id="beneficiaryCpfCnpj"
                    value={formData.beneficiaryCpfCnpj}
                    onChange={(e) => handleChange('beneficiaryCpfCnpj', e.target.value)}
                    placeholder="000.000.000-00"
                    className="text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="bankCode" className="text-foreground">Código do Banco</Label>
                  <Input
                    id="bankCode"
                    value={formData.bankCode}
                    onChange={(e) => handleChange('bankCode', e.target.value)}
                    placeholder="000"
                    className="text-foreground"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="bankName" className="text-foreground">Nome do Banco</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                    placeholder="Nome do banco"
                    className="text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="agency" className="text-foreground">Agência</Label>
                  <Input
                    id="agency"
                    value={formData.agency}
                    onChange={(e) => handleChange('agency', e.target.value)}
                    placeholder="0000"
                    className="text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber" className="text-foreground">Número da Conta</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => handleChange('accountNumber', e.target.value)}
                    placeholder="00000-0"
                    className="text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="accountType" className="text-foreground">Tipo de Conta</Label>
                  <select
                    id="accountType"
                    value={formData.accountType}
                    onChange={(e) => handleChange('accountType', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground"
                  >
                    <option value="corrente">Corrente</option>
                    <option value="poupança">Poupança</option>
                    <option value="pagamento">Pagamento</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <Settings className="h-5 w-5" />
                  Limites do Plano
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxProducts" className="text-foreground">
                      Limite de Produtos (deixe vazio para ilimitado)
                    </Label>
                    <Input
                      id="maxProducts"
                      type="number"
                      value={formData.maxProducts ?? ''}
                      onChange={(e) => handleChange('maxProducts', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Ilimitado"
                      min="0"
                      className="text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxCustomers" className="text-foreground">
                      Limite de Clientes (deixe vazio para ilimitado)
                    </Label>
                    <Input
                      id="maxCustomers"
                      type="number"
                      value={formData.maxCustomers ?? ''}
                      onChange={(e) => handleChange('maxCustomers', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Ilimitado"
                      min="0"
                      className="text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxSellers" className="text-foreground">
                      Limite de Vendedores (deixe vazio para ilimitado)
                    </Label>
                    <Input
                      id="maxSellers"
                      type="number"
                      value={formData.maxSellers ?? ''}
                      onChange={(e) => handleChange('maxSellers', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Ilimitado"
                      min="0"
                      className="text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxPhotosPerProduct" className="text-foreground">
                      Limite de Fotos por Produto (deixe vazio para ilimitado)
                    </Label>
                    <Input
                      id="maxPhotosPerProduct"
                      type="number"
                      value={formData.maxPhotosPerProduct ?? ''}
                      onChange={(e) => handleChange('maxPhotosPerProduct', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Ilimitado"
                      min="0"
                      className="text-foreground"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                      <Label htmlFor="photoUploadEnabled" className="text-foreground font-medium">
                        Upload de Fotos Habilitado
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Permite que a empresa faça upload de fotos de produtos
                      </p>
                    </div>
                    <Switch
                      id="photoUploadEnabled"
                      checked={formData.photoUploadEnabled ?? true}
                      onCheckedChange={(checked) => handleChange('photoUploadEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                      <Label htmlFor="nfceEmissionEnabled" className="text-foreground font-medium">
                        Emissão de NFCe Habilitada
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Permite que a empresa emita NFCe
                      </p>
                    </div>
                    <Switch
                      id="nfceEmissionEnabled"
                      checked={formData.nfceEmissionEnabled ?? true}
                      onCheckedChange={(checked) => handleChange('nfceEmissionEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                      <Label htmlFor="nfeEmissionEnabled" className="text-foreground font-medium">
                        Emissão de NFe Habilitada
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Permite que a empresa emita NFe
                      </p>
                    </div>
                    <Switch
                      id="nfeEmissionEnabled"
                      checked={formData.nfeEmissionEnabled ?? true}
                      onCheckedChange={(checked) => handleChange('nfeEmissionEnabled', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-foreground"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : company ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

