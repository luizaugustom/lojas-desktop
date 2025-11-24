import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Plus, Building2, Search, Filter } from 'lucide-react';
import { InputWithIcon } from '../ui/input';
import { useAuth } from '../../hooks/useAuth';
import { CompaniesTable } from '../companies/companies-table';
import { CompanyDialog } from '../companies/company-dialog';
import { CompanyStatusModal } from '../companies/company-status-modal';
import { FocusNfeConfigModal } from '../companies/focus-nfe-config-modal';
import { Company, CreateCompanyDto } from '../../types';
import { companyApi } from '../../lib/api-endpoints';
import { toast } from 'react-hot-toast';
import { convertPrismaIdToUUID, isValidId } from '../../lib/utils';

export default function CompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [companyToToggle, setCompanyToToggle] = useState<Company | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isFocusNfeModalOpen, setIsFocusNfeModalOpen] = useState(false);
  const [companyForFocusNfe, setCompanyForFocusNfe] = useState<Company | null>(null);

  // Verificar se o usuário é admin
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            Acesso negado
          </h3>
          <p className="text-sm text-muted-foreground">
            Apenas administradores podem gerenciar empresas.
          </p>
        </div>
      </div>
    );
  }

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await companyApi.list();
      const companiesData = response.data || response || [];
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      toast.error('Erro ao carregar empresas');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateCompany = async (data: CreateCompanyDto) => {
    try {
      console.log('Dados sendo enviados para criação de empresa:', data);
      await companyApi.create(data);
      toast.success('Empresa criada com sucesso!');
      setIsDialogOpen(false);
      fetchCompanies();
    } catch (error: any) {
      console.error('Erro ao criar empresa:', error);
      console.error('Resposta do erro:', error.response?.data);
      toast.error('Erro ao criar empresa');
    }
  };

  const handleUpdateCompany = async (id: string, data: Partial<CreateCompanyDto>) => {
    try {
      await companyApi.update(id, data);
      toast.success('Empresa atualizada com sucesso!');
      setIsDialogOpen(false);
      setEditingCompany(null);
      fetchCompanies();
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      toast.error('Erro ao atualizar empresa');
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;
    
    try {
      // Debug: verificar se o ID é válido
      console.log('[handleDeleteCompany] Tentando excluir empresa:', {
        id,
        isValidId: isValidId(id),
        idLength: id?.length
      });
      
      // Primeiro, verificar se a empresa existe fazendo uma busca
      console.log('[handleDeleteCompany] Verificando se empresa existe...');
      try {
        const companyExists = await companyApi.get(id);
        console.log('[handleDeleteCompany] Empresa encontrada:', companyExists);
      } catch (getError: any) {
        console.log('[handleDeleteCompany] Erro ao buscar empresa:', {
          status: getError.response?.status,
          message: getError.message
        });
      }
      
      // Tentar diferentes abordagens baseadas no formato do ID
      if (/^[a-z0-9]{21}$/i.test(id)) {
        // ID do Prisma - tentar conversão para UUID
        console.log('[handleDeleteCompany] ID é do Prisma, convertendo para UUID');
        const uuidId = convertPrismaIdToUUID(id);
        console.log('[handleDeleteCompany] UUID convertido:', uuidId);
        await companyApi.delete(uuidId);
      } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        // UUID válido - usar diretamente
        console.log('[handleDeleteCompany] ID é UUID válido, usando diretamente');
        await companyApi.delete(id);
      } else {
        console.log('[handleDeleteCompany] ID em formato desconhecido, tentando como está');
        await companyApi.delete(id);
      }
      toast.success('Empresa excluída com sucesso!');
      fetchCompanies();
    } catch (error: any) {
      console.error('Erro ao excluir empresa:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        id
      });
      toast.error('Erro ao excluir empresa');
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = (company: Company) => {
    setCompanyToToggle(company);
    setIsStatusModalOpen(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (!companyToToggle) return;

    setIsTogglingStatus(true);
    try {
      if (companyToToggle.isActive) {
        await companyApi.deactivate(companyToToggle.id);
        toast.success('Empresa desativada com sucesso!');
      } else {
        await companyApi.activate(companyToToggle.id);
        toast.success('Empresa ativada com sucesso!');
      }
      
      setIsStatusModalOpen(false);
      setCompanyToToggle(null);
      fetchCompanies(); // Recarregar a lista
    } catch (error: any) {
      console.error('Erro ao alterar status da empresa:', error);
      toast.error('Erro ao alterar status da empresa');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.cnpj?.includes(searchTerm) ||
    company.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">
            Gerencie todas as empresas cadastradas no sistema
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 max-w-sm">
            <InputWithIcon
              placeholder="Buscar empresas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              iconPosition="left"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        <CompaniesTable
          companies={filteredCompanies}
          loading={loading}
          onEdit={handleEditCompany}
          onDelete={handleDeleteCompany}
          onToggleStatus={handleToggleStatus}
          onConfigureFocusNfe={(company) => {
            setCompanyForFocusNfe(company);
            setIsFocusNfeModalOpen(true);
          }}
        />
      </Card>

      <CompanyDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCompany(null);
          }
        }}
        company={editingCompany}
        onSave={editingCompany ? 
          (data) => handleUpdateCompany(editingCompany.id, data) :
          handleCreateCompany
        }
      />

      <CompanyStatusModal
        open={isStatusModalOpen}
        onOpenChange={(open) => {
          setIsStatusModalOpen(open);
          if (!open) {
            setCompanyToToggle(null);
          }
        }}
        company={companyToToggle}
        onConfirm={handleConfirmToggleStatus}
        loading={isTogglingStatus}
      />

      <FocusNfeConfigModal
        open={isFocusNfeModalOpen}
        onOpenChange={(open) => {
          setIsFocusNfeModalOpen(open);
          if (!open) {
            setCompanyForFocusNfe(null);
          }
        }}
        company={companyForFocusNfe}
        onSuccess={() => {
          fetchCompanies();
        }}
      />
    </div>
  );
}
