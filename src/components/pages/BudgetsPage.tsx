import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Search, Download, Eye, Trash2, CheckCircle, XCircle, Clock, Edit, Printer } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input, InputWithIcon } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { handleApiError } from '@/lib/handleApiError';
import { formatCurrency } from '@/lib/utils-clean';
import { useAuth } from '@/contexts/AuthContext';
import { useDateRange } from '../../hooks/useDateRange';
import { printContent } from '@/lib/print-service';
interface Budget {
  id: string;
  budgetNumber: number;
  total: number;
  clientName?: string;
  clientPhone?: string;
  clientCpfCnpj?: string;
  notes?: string;
  validUntil: string;
  status: string;
  budgetDate: string;
  seller?: {
    id: string;
    name: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: {
      id: string;
      name: string;
      barcode: string;
    };
  }>;
}

export default function BudgetsPage() {
  const { api, user } = useAuth();
  const { queryKeyPart } = useDateRange();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editStatusDialogOpen, setEditStatusDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [printingBudgetId, setPrintingBudgetId] = useState<string | null>(null);
  
  const isCompany = user?.role === 'empresa';

  const { queryParams, queryKeyPart } = useDateRange();
  const { data: budgets, isLoading, refetch } = useQuery({
    queryKey: ['budgets', queryKeyPart, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (queryParams.startDate) params.startDate = queryParams.startDate;
      if (queryParams.endDate) params.endDate = queryParams.endDate;
      const response = await api.get('/budget', { params });
      return Array.isArray(response.data) ? response.data : response.data?.budgets || [];
    },
  });

  const filteredBudgets = budgets?.filter((budget: Budget) => {
    const matchesSearch =
      budget.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      budget.budgetNumber.toString().includes(search) ||
      budget.clientCpfCnpj?.includes(search);

    return matchesSearch;
  }) || [];

  const handlePrint = async (budget: Budget) => {
    if (!budget) return;
    if (printingBudgetId && printingBudgetId === budget.id) {
      return;
    }

    setPrintingBudgetId(budget.id);

    try {
      let content: string | null = null;

      try {
        const response = await api.get(`/budget/${budget.id}/print-content`);
        const data = response.data?.data || response.data;
        content = data?.content || data?.printContent || null;
      } catch (error) {
        console.warn(`[Budgets] Falha ao obter conteúdo de impressão do orçamento ${budget.id}`, error);
      }

      if (content) {
        const printResult = await printContent(content);

        if (printResult.success) {
          toast.success('Orçamento enviado para impressão!');
          return;
        }

        toast(`Impressão local falhou: ${printResult.error || 'Erro desconhecido'}. Tentando impressão no servidor...`, {
          icon: '⚠️',
          duration: 5000,
        });
      }

      const serverResponse = await api.post(`/budget/${budget.id}/print`);
      const serverData = serverResponse.data?.data || serverResponse.data;
      const success = serverData?.success ?? true;
      const message = serverData?.message || 'Orçamento enviado para impressão!';

      if (success) {
        toast.success(message);
      } else {
        const errorMessage = serverData?.error || message || 'Não foi possível imprimir o orçamento.';
        toast.error(errorMessage);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setPrintingBudgetId(null);
    }
  };

  const handleDownloadPdf = async (budget: Budget) => {
    try {
      const response = await api.get(`/budget/${budget.id}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orcamento-${budget.budgetNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      await api.delete(`/budget/${deletingId}`);
      toast.success('Orçamento excluído com sucesso!');
      setDeleteDialogOpen(false);
      setDeletingId(null);
      refetch();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleOpenEditStatus = (budget: Budget) => {
    setEditingBudget(budget);
    setNewStatus(budget.status);
    setStatusNotes(budget.notes || '');
    setEditStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!editingBudget || !newStatus) return;

    setUpdatingStatus(true);
    try {
      await api.patch(`/budget/${editingBudget.id}`, {
        status: newStatus,
        notes: statusNotes || undefined,
      });
      
      toast.success('Status do orçamento atualizado com sucesso!');
      
      // Se o status foi alterado para aprovado, informar sobre a venda criada
      if (newStatus === 'approved' && editingBudget.status !== 'approved') {
        toast.success('Venda criada automaticamente com base no orçamento!');
      }
      
      setEditStatusDialogOpen(false);
      setEditingBudget(null);
      setNewStatus('');
      setStatusNotes('');
      
      // Invalidar cache e recarregar
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      refetch();
    } catch (error) {
      handleApiError(error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'default', icon: Clock, label: 'Pendente' },
      approved: { variant: 'success', icon: CheckCircle, label: 'Aprovado' },
      rejected: { variant: 'destructive', icon: XCircle, label: 'Rejeitado' },
      expired: { variant: 'secondary', icon: XCircle, label: 'Expirado' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">Gerencie seus orçamentos</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <InputWithIcon
                placeholder="Buscar por cliente, número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
                iconPosition="left"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredBudgets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4" />
              <p>Nenhum orçamento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgets.map((budget: Budget) => (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">
                        #{budget.budgetNumber.toString().padStart(6, '0')}
                      </TableCell>
                      <TableCell>
                        {new Date(budget.budgetDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{budget.clientName || 'Sem nome'}</div>
                          {budget.clientPhone && (
                            <div className="text-sm text-muted-foreground">{budget.clientPhone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={isExpired(budget.validUntil) ? 'text-destructive' : ''}>
                          {new Date(budget.validUntil).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(budget.total)}
                      </TableCell>
                      <TableCell>{getStatusBadge(budget.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedBudget(budget);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isCompany && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenEditStatus(budget)}
                              title="Alterar status"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handlePrint(budget)}
                            disabled={printingBudgetId === budget.id}
                            title="Imprimir orçamento"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDownloadPdf(budget)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setDeletingId(budget.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Orçamento #{selectedBudget?.budgetNumber.toString().padStart(6, '0')}
            </DialogTitle>
            <DialogDescription>
              Detalhes do orçamento
            </DialogDescription>
          </DialogHeader>

          {selectedBudget && (
            <div className="space-y-4">
              {/* Client Info */}
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3">Dados do Cliente</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium">{selectedBudget.clientName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>
                    <p className="font-medium">{selectedBudget.clientPhone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CPF/CNPJ:</span>
                    <p className="font-medium">{selectedBudget.clientCpfCnpj || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Validade:</span>
                    <p className="font-medium">
                      {new Date(selectedBudget.validUntil).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3">Produtos</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Preço Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBudget.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.totalPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 pt-4 border-t flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedBudget.total)}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedBudget.notes && (
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Observações</h3>
                  <p className="text-sm text-muted-foreground">{selectedBudget.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
            {selectedBudget && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => handlePrint(selectedBudget)}
                  disabled={printingBudgetId === selectedBudget.id}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
                <Button onClick={() => handleDownloadPdf(selectedBudget)}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar PDF
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={editStatusDialogOpen} onOpenChange={setEditStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status do Orçamento</DialogTitle>
            <DialogDescription>
              Altere o status do orçamento #{editingBudget?.budgetNumber.toString().padStart(6, '0')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={newStatus} onValueChange={setNewStatus} disabled={updatingStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                </SelectContent>
              </Select>
              {newStatus === 'approved' && editingBudget?.status !== 'approved' && (
                <p className="text-sm text-muted-foreground">
                  ⚠️ Ao aprovar este orçamento, uma venda será criada automaticamente.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Adicione observações sobre a mudança de status..."
                rows={3}
                disabled={updatingStatus}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditStatusDialogOpen(false);
                setEditingBudget(null);
                setNewStatus('');
                setStatusNotes('');
              }}
              disabled={updatingStatus}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updatingStatus || !newStatus}>
              {updatingStatus ? 'Atualizando...' : 'Atualizar Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
