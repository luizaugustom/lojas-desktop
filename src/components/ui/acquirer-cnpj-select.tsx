import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Input } from './input';
import { Button } from './button';
import { Label } from './label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import {
  getAcquirerList,
  addCustomAcquirer,
  getLastSelectedAcquirer,
  setLastSelectedAcquirer,
  type AcquirerInfo,
} from '../../lib/acquirer-cnpj-list';

interface AcquirerCnpjSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

export function AcquirerCnpjSelect({
  value,
  onChange,
  disabled = false,
  id,
}: AcquirerCnpjSelectProps) {
  const [acquirers, setAcquirers] = useState<AcquirerInfo[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCnpj, setNewCnpj] = useState('');
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setAcquirers(getAcquirerList());
    
    // Carregar último selecionado se não houver valor
    if (!value) {
      const lastSelected = getLastSelectedAcquirer();
      if (lastSelected) {
        onChange(lastSelected);
      }
    }
  }, [value, onChange]);

  const handleSelectChange = (selectedCnpj: string) => {
    if (selectedCnpj === 'add_new') {
      setShowAddDialog(true);
      return;
    }
    
    onChange(selectedCnpj);
    setLastSelectedAcquirer(selectedCnpj);
  };

  const handleAddNew = () => {
    const cnpjCleaned = newCnpj.replace(/\D/g, '');
    if (cnpjCleaned.length !== 14) {
      return;
    }

    setIsAdding(true);
    addCustomAcquirer(cnpjCleaned, newName || 'Outra');
    
    // Atualizar lista
    const updatedList = getAcquirerList();
    setAcquirers(updatedList);
    
    // Selecionar o novo CNPJ
    onChange(cnpjCleaned);
    setLastSelectedAcquirer(cnpjCleaned);
    
    // Limpar e fechar
    setNewCnpj('');
    setNewName('');
    setShowAddDialog(false);
    setIsAdding(false);
  };

  const formatCnpj = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
  };

  const selectedAcquirer = acquirers.find(a => a.cnpj === value);

  return (
    <>
      <div className="space-y-1">
        <Select
          value={value || ''}
          onValueChange={handleSelectChange}
          disabled={disabled}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="Selecione ou adicione um CNPJ">
              {selectedAcquirer
                ? `${selectedAcquirer.name} - ${formatCnpj(selectedAcquirer.cnpj)}`
                : 'Selecione ou adicione um CNPJ'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {acquirers.map((acquirer) => (
              <SelectItem key={acquirer.cnpj} value={acquirer.cnpj}>
                {acquirer.name} - {formatCnpj(acquirer.cnpj)}
              </SelectItem>
            ))}
            <SelectItem value="add_new" className="text-primary font-medium">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Adicionar novo CNPJ
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {value && (
          <p className="text-xs text-muted-foreground">
            CNPJ: {formatCnpj(value)}
          </p>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Credenciadora</DialogTitle>
            <DialogDescription>
              Informe o CNPJ (14 dígitos) e o nome da credenciadora
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-cnpj">CNPJ * (14 dígitos)</Label>
              <Input
                id="new-cnpj"
                placeholder="00000000000000"
                value={newCnpj}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').substring(0, 14);
                  setNewCnpj(cleaned);
                }}
                maxLength={14}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome da Credenciadora *</Label>
              <Input
                id="new-name"
                placeholder="Ex: Minha Credenciadora"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setNewCnpj('');
                setNewName('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddNew}
              disabled={
                isAdding ||
                newCnpj.replace(/\D/g, '').length !== 14 ||
                !newName.trim()
              }
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

