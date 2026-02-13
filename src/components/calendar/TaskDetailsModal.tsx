'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Calendar,
  User,
  UserPlus,
  FileText,
  Clock,
  CheckCircle2,
  Circle,
  Lock,
  Pencil,
  Trash2,
} from 'lucide-react';
import { TaskItemType } from './CalendarPanel';
import { cn } from '@/lib/utils';

interface TaskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  task: TaskItemType | null;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

function DetailRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-3 py-2 min-w-0', className)}>
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm mt-0.5 break-words [overflow-wrap:anywhere]">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export function TaskDetailsModal({
  open,
  onClose,
  task,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: TaskDetailsModalProps) {
  if (!task) return null;

  const isOverdue = !task.isCompleted && new Date(task.dueDate) < new Date();
  const isToday =
    new Date(task.dueDate).toDateString() === new Date().toDateString();
  const typeColors = {
    PERSONAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    WORK: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };
  const isCompanyCreated = task.authorType === 'company';
  const assigneeLabels =
    task.assignees && task.assignees.length > 0
      ? task.assignees.map((assignee) =>
          assignee.type === 'company'
            ? 'Empresa'
            : assignee.name
              ? `Vendedor: ${assignee.name}`
              : 'Vendedor'
        )
      : task.assignedToName
        ? [
            task.assignedToType === 'company'
              ? 'Empresa'
              : `Vendedor: ${task.assignedToName}`,
          ]
        : [];

  const handleEdit = () => {
    onClose();
    onEdit();
  };

  const handleDelete = () => {
    onClose();
    onDelete();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-2 pr-8 min-w-0">
            <DialogTitle
              className={cn(
                'flex-1 text-lg break-words min-w-0 [overflow-wrap:anywhere]',
                task.isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </DialogTitle>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge
                className={cn('text-xs', typeColors[task.type])}
                variant="secondary"
              >
                {task.type === 'PERSONAL' ? 'Pessoal' : 'Trabalho'}
              </Badge>
              {task.isCompleted ? (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Concluída
                </Badge>
              ) : isOverdue ? (
                <Badge variant="destructive" className="text-xs">
                  Vencida
                </Badge>
              ) : isToday ? (
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                  Hoje
                </Badge>
              ) : null}
            </div>
          </div>
          <DialogDescription className="sr-only">
            Detalhes completos da tarefa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 min-w-0 overflow-hidden">
          {task.description && (
            <>
              <DetailRow
                icon={FileText}
                label="Descrição"
                value={task.description}
              />
              <div className="border-b my-2" />
            </>
          )}

          <DetailRow
            icon={Calendar}
            label="Data e hora de vencimento"
            value={format(new Date(task.dueDate), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          />
          <div className="border-b my-2" />

          <DetailRow
            icon={User}
            label="Criada por"
            value={
              isCompanyCreated ? (
                <span className="inline-flex items-center gap-1">
                  Empresa
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </span>
              ) : (
                task.authorName || '—'
              )
            }
          />
          <div className="border-b my-2" />

          <DetailRow
            icon={UserPlus}
            label="Atribuída a"
            value={assigneeLabels.length > 0 ? assigneeLabels.join(', ') : '—'}
          />
          <div className="border-b my-2" />

          <DetailRow
            icon={task.isCompleted ? CheckCircle2 : Circle}
            label="Status"
            value={
              task.isCompleted
                ? task.completedAt
                  ? `Concluída em ${format(new Date(task.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                  : 'Concluída'
                : 'Pendente'
            }
          />
          <div className="border-b my-2" />

          <DetailRow
            icon={Clock}
            label="Criada em"
            value={format(new Date(task.createdAt), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          />
          <DetailRow
            icon={Clock}
            label="Atualizada em"
            value={format(new Date(task.updatedAt), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          />
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          {canEdit && (
            <Button variant="outline" onClick={handleEdit} className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          )}
          {!canEdit && !canDelete && (
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
