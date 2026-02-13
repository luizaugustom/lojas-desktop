'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Calendar } from '../ui/calendar';
import { taskApi, sellerApi } from '@/lib/api-endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, isSameDay, isToday, isPast, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Calendar as CalendarIcon, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { TaskItem } from './TaskItem';
import { TaskDialog } from './TaskDialog';
import { TaskDetailsModal } from './TaskDetailsModal';
import { ConfirmationModal } from '../ui/confirmation-modal';

export interface TaskItemType {
  id: string;
  companyId: string;
  authorType: string;
  authorId: string;
  authorName: string | null;
  assignedToType: string;
  assignedToId: string;
  assignedToName: string | null;
  assignees?: Array<{ id: string; type: 'company' | 'seller'; name: string | null }>;
  title: string;
  description: string | null;
  dueDate: string;
  hasExplicitTime?: boolean;
  type: 'PERSONAL' | 'WORK';
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CalendarPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_FILTER = [
  { value: 'all', label: 'Todos' },
  { value: 'PERSONAL', label: 'Pessoal' },
  { value: 'WORK', label: 'Trabalho' },
] as const;

const STATUS_FILTER = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'completed', label: 'Concluídas' },
] as const;

export function CalendarPanel({ open, onOpenChange }: CalendarPanelProps) {
  const { user } = useAuth();
  const isCompany = user?.role === 'empresa';
  const isSeller = user?.role === 'vendedor';

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<TaskItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItemType | null>(null);
  const [detailsTask, setDetailsTask] = useState<TaskItemType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sellers, setSellers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Buscar vendedores se for empresa
  useEffect(() => {
    if (open && isCompany) {
      sellerApi.list().then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setSellers(data.map((s: any) => ({ id: s.id, name: s.name })));
      }).catch(() => {
        setSellers([]);
      });
    }
  }, [open, isCompany]);

  const fetchTasks = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();
      
      const params: any = {
        startDate: start,
        endDate: end,
        search: searchDebounced || undefined,
      };

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      if (statusFilter === 'completed') {
        params.isCompleted = true;
      } else if (statusFilter === 'pending') {
        params.isCompleted = false;
      }

      const res = await taskApi.list(params);
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setTasks(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao carregar tarefas');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [open, currentMonth, searchDebounced, typeFilter, statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Tarefas do dia selecionado
  const dayTasks = useMemo(() => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.dueDate);
      return isSameDay(taskDate, selectedDate);
    });
  }, [tasks, selectedDate]);

  // Dias com tarefas para destacar no calendário
  const daysWithTasks = useMemo(() => {
    const days = new Set<string>();
    tasks.forEach((task) => {
      const date = new Date(task.dueDate);
      days.add(format(date, 'yyyy-MM-dd'));
    });
    return days;
  }, [tasks]);

  const handleCreate = () => {
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  const handleEdit = (task: TaskItemType) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await taskApi.delete(deleteTarget.id);
      toast.success('Tarefa removida');
      setDeleteTarget(null);
      fetchTasks();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao excluir tarefa');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleComplete = async (task: TaskItemType) => {
    try {
      if (task.isCompleted) {
        await taskApi.markIncomplete(task.id);
      } else {
        await taskApi.markComplete(task.id);
      }
      fetchTasks();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao atualizar tarefa');
    }
  };

  const handleTaskSaved = () => {
    setTaskDialogOpen(false);
    setEditingTask(null);
    fetchTasks();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 pr-10">
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Agenda
            </DialogTitle>
            <DialogDescription>
              Gerencie suas tarefas e compromissos. Empresa pode criar tarefas para vendedores.
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 sm:px-6 space-y-3 pb-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-[1]" />
                <Input
                  placeholder="Buscar por título ou descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 relative z-[2] bg-background"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_FILTER.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="button" onClick={handleCreate} className="w-full sm:w-auto" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova tarefa
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 px-4 sm:px-6 pb-4 flex-1 min-h-0">
            {/* Calendário */}
            <div className="lg:w-[40%] w-full h-[92%]">
              <div className="flex items-center justify-between mb-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth('prev')}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth('next')}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="w-full flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  locale={ptBR}
                  className="rounded-md border"
                  classNames={{
                    nav_button_previous: 'hidden',
                    nav_button_next: 'hidden',
                    caption_label: 'hidden',
                  }}
                  modifiersClassNames={{
                    selected: 'bg-primary text-primary-foreground',
                    today: 'bg-accent text-accent-foreground',
                  }}
                  modifiers={{
                    hasTasks: (date) => daysWithTasks.has(format(date, 'yyyy-MM-dd')),
                  }}
                />
              </div>
            </div>

            {/* Lista de tarefas do dia */}
            <div className="lg:w-1/2 flex flex-col min-h-0 min-w-0">
              <div className="mb-2 min-w-0">
                <h3 className="font-medium text-sm truncate">
                  Tarefas de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
              </div>
              <ScrollArea className="flex-1 min-h-[200px] min-w-0">
                <div className="space-y-2 w-full min-w-0">
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-lg border p-3 space-y-2">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : dayTasks.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma tarefa para este dia.
                      </p>
                    </div>
                  ) : (
                    dayTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onEdit={() => handleEdit(task)}
                        onDelete={() => setDeleteTarget({ id: task.id, title: task.title })}
                        onToggleComplete={() => handleToggleComplete(task)}
                        onViewDetails={() => setDetailsTask(task)}
                        canEdit={isCompany || (isSeller && task.authorType === 'seller' && task.authorId === user?.id)}
                        canDelete={
                          isCompany || (isSeller && task.authorType === 'seller' && task.authorId === user?.id)
                        }
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TaskDialog
        open={taskDialogOpen}
        onClose={() => {
          setTaskDialogOpen(false);
          setEditingTask(null);
        }}
        onSave={handleTaskSaved}
        task={editingTask}
        sellers={sellers}
      />

      <TaskDetailsModal
        open={!!detailsTask}
        onClose={() => setDetailsTask(null)}
        task={detailsTask}
        onEdit={() => detailsTask && handleEdit(detailsTask)}
        onDelete={() => detailsTask && setDeleteTarget({ id: detailsTask.id, title: detailsTask.title })}
        canEdit={
          !!detailsTask &&
          (isCompany || (isSeller && detailsTask.authorType === 'seller' && detailsTask.authorId === user?.id))
        }
        canDelete={
          !!detailsTask &&
          (isCompany || (isSeller && detailsTask.authorType === 'seller' && detailsTask.authorId === user?.id))
        }
      />

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir tarefa"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.title}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmText="Excluir"
        variant="destructive"
        loading={deleting}
      />
    </>
  );
}
