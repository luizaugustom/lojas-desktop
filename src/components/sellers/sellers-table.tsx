import { useState } from 'react';
import { Edit, Trash2, Users, Eye, DollarSign } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { DeleteSellerModal } from './delete-seller-modal';
import { formatCurrency } from '../../lib/utils';
import type { Seller } from '../../types';

interface SellersTableProps {
  sellers: Seller[];
  isLoading: boolean;
  onEdit: (seller: Seller) => void;
  onView: (seller: Seller) => void;
  onRefetch: () => void;
}

export function SellersTable({ sellers, isLoading, onEdit, onView, onRefetch }: SellersTableProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);

  const handleDeleteClick = (seller: Seller) => {
    setSellerToDelete(seller);
    setDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    onRefetch();
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setSellerToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Carregando vendedores...</div>
      </div>
    );
  }

  if (sellers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <Users className="h-8 w-8 mb-2" />
        <p>Nenhum vendedor encontrado</p>
        <p className="text-sm">Clique em "Novo Vendedor" para adicionar</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-muted/50">
              <TableHead className="text-foreground">Nome</TableHead>
              <TableHead className="text-foreground">Login</TableHead>
              <TableHead className="text-foreground">Email</TableHead>
              <TableHead className="text-foreground">Telefone</TableHead>
              <TableHead className="text-foreground">CPF</TableHead>
              <TableHead className="text-foreground">Comissão</TableHead>
              <TableHead className="text-foreground">Vendas do Mês</TableHead>
              <TableHead className="text-right text-foreground">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellers.map((seller) => (
              <TableRow key={seller.id} className="border-border hover:bg-muted/50">
                <TableCell className="font-medium text-foreground">{seller.name}</TableCell>
                <TableCell className="text-foreground">{seller.login}</TableCell>
                <TableCell>
                  {seller.email ? (
                    <span className="text-primary">{seller.email}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {seller.phone ? (
                    <span className="text-foreground">{seller.phone}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {seller.cpf ? (
                    <span className="text-foreground">{seller.cpf}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {seller.commissionRate && seller.commissionRate > 0 ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {seller.commissionRate}%
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">Sem comissão</span>
                  )}
                </TableCell>
                <TableCell>
                  {(seller as any).monthlySalesValue ? (
                    <div className="flex flex-col">
                      <span className="text-foreground font-medium">
                        {formatCurrency((seller as any).monthlySalesValue)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {(seller as any).monthlySalesCount || 0} venda(s)
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">R$ 0,00</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(seller)}
                      title="Ver detalhes"
                      className="hover:bg-primary/10 text-primary hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(seller)}
                      title="Editar vendedor"
                      className="hover:bg-primary/10 text-primary hover:text-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(seller)}
                      title="Excluir vendedor"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
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

      {/* Modal de Exclusão */}
      <DeleteSellerModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onSuccess={handleDeleteSuccess}
        seller={sellerToDelete}
      />
    </>
  );
}

