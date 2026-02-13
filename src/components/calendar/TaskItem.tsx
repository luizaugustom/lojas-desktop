'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Pencil, Trash2, Lock } from 'lucide-react';
import { TaskItemType } from './CalendarPanel';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: TaskItemType;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
  onViewDetails: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function TaskItem({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  onViewDetails,
  canEdit,
  canDelete,
}: TaskItemProps) {
  const isOverdue = !task.isCompleted && new Date(task.dueDate) < new Date();
  const isToday = new Date(task.dueDate).toDateString() === new Date().toDateString();

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
  const assigneePreview =
    assigneeLabels.length > 2
      ? `${assigneeLabels.slice(0, 2).join(', ')} +${assigneeLabels.length - 2}`
      : assigneeLabels.join(', ');

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 space-y-2 transition-colors w-full min-w-0 max-w-full overflow-hidden',
        task.isCompleted && 'opacity-60',
        isOverdue && !task.isCompleted && 'border-destructive',
        isToday && !task.isCompleted && 'border-primary',
      )}
    >
      <div className="flex items-start justify-between gap-2 w-full min-w-0">
        <div className="flex items-start gap-2 flex-1 min-w-0 overflow-hidden">
          <Checkbox
            checked={task.isCompleted}
            onCheckedChange={onToggleComplete}
            className="mt-1 shrink-0"
            disabled={!canEdit}
          />
          <div
            className="min-w-0 flex-1 overflow-hidden cursor-pointer"
            onClick={onViewDetails}
            onKeyDown={(e) => e.key === 'Enter' && onViewDetails()}
            role="button"
            tabIndex={0}
            aria-label={`Ver detalhes da tarefa ${task.title}`}
          >
            <div className="flex items-center gap-2 min-w-0 w-full overflow-hidden">
              <p
                className={cn(
                  'font-medium text-sm truncate flex-1 min-w-0',
                  task.isCompleted && 'line-through',
                )}
                title={task.title}
              >
                {task.title.length > 20 ? `${task.title.slice(0, 20)}...` : task.title}
              </p>
              <Badge
                className={cn('text-xs shrink-0', typeColors[task.type])}
                variant="secondary"
              >
                {task.type === 'PERSONAL' ? 'Pessoal' : 'Trabalho'}
              </Badge>
              {isCompanyCreated && (
                <span title="Criada pela empresa" className="shrink-0">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </span>
              )}
            </div>
            {task.description && (
              <p
                className="text-xs text-muted-foreground mt-1 line-clamp-2 overflow-hidden text-ellipsis"
                title={task.description}
              >
                {task.description.length > 15 ? `${task.description.slice(0, 15)}...` : task.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground min-w-0 w-full overflow-hidden">
              <span className="truncate min-w-0">
                {format(new Date(task.dueDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
              {isOverdue && !task.isCompleted && (
                <span className="text-destructive font-medium shrink-0">Vencida</span>
              )}
              {isToday && !task.isCompleted && (
                <span className="text-primary font-medium shrink-0">Hoje</span>
              )}
              {assigneePreview && (
                <span className="text-xs truncate min-w-0 flex-1 overflow-hidden">
                  {assigneePreview}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              aria-label="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
