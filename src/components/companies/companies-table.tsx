import { useState } from 'react';
import { Company } from '../../types';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { MoreHorizontal, Edit, Trash2, Building2, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CompaniesTableProps {
  companies: Company[];
  loading: boolean;
  onEdit: (company: Company) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (company: Company) => void;
  onConfigureFocusNfe?: (company: Company) => void;
}

export function CompaniesTable({ companies, loading, onEdit, onDelete, onToggleStatus, onConfigureFocusNfe }: CompaniesTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando empresas...</p>
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Nenhuma empresa encontrada
          </h3>
          <p className="text-sm text-muted-foreground">
            Comece criando sua primeira empresa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  {company.name || 'Nome não informado'}
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {company.cnpj || '-'}
              </TableCell>
              <TableCell>{company.email || '-'}</TableCell>
              <TableCell>{company.phone || '-'}</TableCell>
              <TableCell>
                <button
                  onClick={() => onToggleStatus(company)}
                  className="transition-colors hover:opacity-80"
                >
                  <Badge 
                    variant={company.isActive ? 'default' : 'secondary'}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    {company.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </button>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {company.createdAt ? format(new Date(company.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedId(company.id)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(company)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {onConfigureFocusNfe && (
                      <DropdownMenuItem onClick={() => onConfigureFocusNfe(company)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar Focus NFe
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onDelete(company.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

