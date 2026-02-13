'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { DatePicker } from '../ui/date-picker';
import { taskApi } from '@/lib/api-endpoints';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { TaskItemType } from './CalendarPanel';

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  task?: TaskItemType | null;
  sellers?: Array<{ id: string; name: string }>;
}

export function TaskDialog({ open, onClose, onSave, task, sellers = [] }: TaskDialogProps) {
  const { user } = useAuth();
  const isCompany = user?.role === 'empresa';
  const isSeller = user?.role === 'vendedor';

  const formatTime = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [dueTime, setDueTime] = useState<string>('09:00');
  const [hasExplicitTime, setHasExplicitTime] = useState<boolean>(true);
  const [type, setType] = useState<'PERSONAL' | 'WORK'>('WORK');
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (task) {
        const d = new Date(task.dueDate);
        setTitle(task.title);
        setDescription(task.description || '');
        setDueDate(d);
        setDueTime(formatTime(d));
        setHasExplicitTime(task.hasExplicitTime ?? true);
        setType(task.type);
        const fromAssignees = Array.isArray(task.assignees)
          ? task.assignees.map((assignee) => assignee.id)
          : [];
        if (fromAssignees.length > 0) {
          setAssignedToIds(fromAssignees);
        } else if (task.assignedToId) {
          setAssignedToIds([task.assignedToId]);
        } else {
          setAssignedToIds([]);
        }
      } else {
        setTitle('');
        setDescription('');
        setDueDate(new Date());
        setDueTime('09:00');
        setHasExplicitTime(true);
        setType('WORK');
        setAssignedToIds([]);
      }
    }
  }, [open, task]);

  const companyAssigneeId = isCompany ? user?.id : undefined;

  const toggleAssignee = (id: string) => {
    setAssignedToIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    if (!dueDate) {
      toast.error('Data de vencimento é obrigatória');
      return;
    }

    const [hours, minutes] = dueTime.split(':').map(Number);
    const finalDueDate = new Date(dueDate);
    if (hasExplicitTime) {
      finalDueDate.setHours(isNaN(hours) ? 9 : hours, isNaN(minutes) ? 0 : minutes, 0, 0);
    } else {
      finalDueDate.setHours(9, 0, 0, 0);
    }

    setSaving(true);
    try {
      const data: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: finalDueDate.toISOString(),
        type,
        hasExplicitTime,
      };

      if (isCompany) {
        const selected = assignedToIds.length > 0
          ? assignedToIds
          : companyAssigneeId
            ? [companyAssigneeId]
            : [];
        if (selected.length > 0) {
          data.assignedToIds = selected;
        }
      } else if (isSeller) {
        // Vendedor sempre cria para si mesmo
        data.assignedToIds = user?.id ? [user.id] : [];
      }

      if (task) {
        await taskApi.update(task.id, data);
        toast.success('Tarefa atualizada');
      } else {
        await taskApi.create(data);
        toast.success('Tarefa criada');
      }
      onSave();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao salvar tarefa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          <DialogDescription>
            {task
              ? 'Atualize os dados da tarefa'
              : 'Preencha os dados da nova tarefa'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Título *</Label>
            <Input
              id="task-title"
              placeholder="Título da tarefa"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Descrição</Label>
            <Textarea
              id="task-description"
              placeholder="Descrição da tarefa (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due-date">Data de Vencimento *</Label>
            <div className="flex justify-center">
              <DatePicker
                date={dueDate}
                onSelect={setDueDate}
                placeholder="Selecione a data"
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due-time">Hora de Vencimento</Label>
            <Input
              id="task-due-time"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              disabled={saving || !hasExplicitTime}
              className="max-w-[140px]"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="task-no-time"
                checked={!hasExplicitTime}
                onCheckedChange={(checked) => {
                  const next = !(checked === true);
                  setHasExplicitTime(next);
                  if (!next) {
                    setDueTime('09:00');
                  }
                }}
                disabled={saving}
              />
              <Label htmlFor="task-no-time" className="text-sm font-normal">
                Sem horario (enviar as 09:00)
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-type">Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'PERSONAL' | 'WORK')} disabled={saving}>
              <SelectTrigger id="task-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERSONAL">Pessoal</SelectItem>
                <SelectItem value="WORK">Trabalho</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCompany && (
            <div className="space-y-2">
              <Label>Atribuir para</Label>
              <div className="rounded-md border p-3 space-y-3">
                {companyAssigneeId && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="assignee-company"
                      checked={assignedToIds.includes(companyAssigneeId)}
                      onCheckedChange={() => toggleAssignee(companyAssigneeId)}
                      disabled={saving}
                    />
                    <Label htmlFor="assignee-company" className="text-sm font-normal">
                      Empresa
                    </Label>
                  </div>
                )}
                <div className="border-t" />
                <div className="space-y-2 max-h-[180px] overflow-auto">
                  {sellers.map((seller) => (
                    <div key={seller.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`assignee-${seller.id}`}
                        checked={assignedToIds.includes(seller.id)}
                        onCheckedChange={() => toggleAssignee(seller.id)}
                        disabled={saving}
                      />
                      <Label htmlFor={`assignee-${seller.id}`} className="text-sm font-normal">
                        {seller.name}
                      </Label>
                    </div>
                  ))}
                  {sellers.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum vendedor encontrado.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : task ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
