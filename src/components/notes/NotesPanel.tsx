'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { notesApi } from '../../lib/api-endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  Building2,
  User,
  Lock,
  Users,
} from 'lucide-react';
import { ConfirmationModal } from '../ui/confirmation-modal';
import { Skeleton } from '../ui/skeleton';

export interface NoteItem {
  id: string;
  companyId: string;
  authorType: string;
  authorId: string;
  authorName: string | null;
  title: string | null;
  content: string;
  visibleToSellers: boolean | null;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string };
}

const AUTHOR_FILTER_COMPANY = [
  { value: 'all', label: 'Todas' },
  { value: 'company_only', label: 'Só minhas (empresa)' },
  { value: 'shared_with_sellers', label: 'Compartilhadas com vendedores' },
  { value: 'sellers_only', label: 'Dos vendedores' },
] as const;

const AUTHOR_FILTER_SELLER = [
  { value: 'all', label: 'Todas visíveis' },
  { value: 'mine_only', label: 'Só minhas' },
] as const;

interface NotesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotesPanel({ open, onOpenChange }: NotesPanelProps) {
  const { user } = useAuth();
  const isCompany = user?.role === 'empresa';
  const isSeller = user?.role === 'vendedor';

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [formMode, setFormMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAuthorType, setEditingAuthorType] = useState<'company' | 'seller' | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formVisibleToSellers, setFormVisibleToSellers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewingNote, setViewingNote] = useState<NoteItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchNotes = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await notesApi.list({
        search: searchDebounced || undefined,
        authorFilter: authorFilter === 'all' ? undefined : authorFilter,
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setNotes(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao carregar anotações');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [open, searchDebounced, authorFilter]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const canEdit = (n: NoteItem) => {
    if (isCompany) return true;
    return isSeller && n.authorType === 'seller' && n.authorId === user?.id;
  };

  const resetForm = () => {
    setFormMode('idle');
    setEditingId(null);
    setEditingAuthorType(null);
    setFormTitle('');
    setFormContent('');
    setFormVisibleToSellers(true);
  };

  const handleCreate = () => {
    resetForm();
    setFormMode('create');
  };

  const handleEdit = (n: NoteItem) => {
    setEditingId(n.id);
    setEditingAuthorType(n.authorType === 'company' ? 'company' : 'seller');
    setFormTitle(n.title ?? '');
    setFormContent(n.content);
    setFormVisibleToSellers(n.visibleToSellers ?? true);
    setFormMode('edit');
  };

  const handleSave = async () => {
    if (!formContent.trim()) {
      toast.error('Conteúdo é obrigatório');
      return;
    }
    setSaving(true);
    try {
      if (formMode === 'create') {
        await notesApi.create({
          title: formTitle.trim() || undefined,
          content: formContent.trim(),
          ...(isCompany && { visibleToSellers: formVisibleToSellers }),
        });
        toast.success('Anotação criada');
      } else if (editingId) {
        await notesApi.update(editingId, {
          title: formTitle.trim() || undefined,
          content: formContent.trim(),
          ...(isCompany && editingAuthorType === 'company' && { visibleToSellers: formVisibleToSellers }),
        });
        toast.success('Anotação atualizada');
      }
      resetForm();
      fetchNotes();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await notesApi.delete(deleteTarget.id);
      toast.success('Anotação removida');
      setDeleteTarget(null);
      fetchNotes();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const visibilityLabel = (n: NoteItem) => {
    if (n.authorType === 'seller') return 'Minha nota';
    return n.visibleToSellers ? 'Compartilhada com vendedores' : 'Só empresa';
  };

  const authorLabel = (n: NoteItem) => {
    if (n.authorType === 'company') return 'Empresa';
    return n.authorName ? `Vendedor: ${n.authorName}` : 'Vendedor';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-2 pr-10">
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Anotações
            </DialogTitle>
            <DialogDescription>
              Bloco de notas da empresa. Crie e organize anotações e escolha se vendedores podem vê-las.
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 px-4 sm:px-6 space-y-3 pb-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por título ou conteúdo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={authorFilter} onValueChange={setAuthorFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(isCompany ? AUTHOR_FILTER_COMPANY : AUTHOR_FILTER_SELLER).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formMode !== 'idle' ? (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="note-title">Título (opcional)</Label>
                  <Input
                    id="note-title"
                    placeholder="Título da anotação"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note-content">Conteúdo *</Label>
                  <Textarea
                    id="note-content"
                    placeholder="Escreva sua anotação..."
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
                {isCompany && (formMode === 'create' || editingAuthorType === 'company') && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="note-visible"
                      checked={formVisibleToSellers}
                      onChange={(e) => setFormVisibleToSellers(e.target.checked)}
                      className="rounded border-input h-4 w-4"
                    />
                    <Label htmlFor="note-visible" className="text-sm font-normal cursor-pointer">
                      Mostrar para vendedores
                    </Label>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Salvando...' : formMode === 'create' ? 'Criar' : 'Salvar'}
                  </Button>
                  <Button variant="outline" onClick={resetForm} disabled={saving}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" onClick={handleCreate} className="w-full sm:w-auto" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova anotação
              </Button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="h-full min-h-[200px] max-h-[50vh] px-4 sm:px-6 overflow-y-auto pr-2">
              <div className="space-y-2 pb-4 w-full max-w-full min-w-0 box-border">
              {loading ? (
                <div className="space-y-2 w-full max-w-full min-w-0">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2 w-full max-w-full min-w-0">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8 px-4 w-full max-w-full min-w-0">
                  <StickyNote className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {search || authorFilter !== 'all'
                      ? 'Nenhuma anotação encontrada com os filtros atuais.'
                      : 'Nenhuma anotação ainda. Clique em "Nova anotação" para criar a primeira!'}
                  </p>
                </div>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg border bg-card p-3 space-y-1.5 hover:bg-accent/50 transition-colors cursor-pointer w-full max-w-full min-w-0 overflow-hidden"
                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                    onClick={() => setViewingNote(n)}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="font-medium text-sm truncate w-full">
                          {n.title || '(sem título)'}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 break-words overflow-hidden w-full" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                          {n.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground min-w-0 w-full">
                          <span className="flex items-center gap-1 min-w-0 max-w-full">
                            {n.authorType === 'company' ? (
                              <Building2 className="h-3 w-3 shrink-0" />
                            ) : (
                              <User className="h-3 w-3 shrink-0" />
                            )}
                            <span className="truncate block">{authorLabel(n)}</span>
                          </span>
                          <span className="flex items-center gap-1 min-w-0 max-w-full">
                            {n.visibleToSellers === false ? (
                              <Lock className="h-3 w-3 shrink-0" />
                            ) : (
                              <Users className="h-3 w-3 shrink-0" />
                            )}
                            <span className="truncate block">{visibilityLabel(n)}</span>
                          </span>
                          <span className="truncate block">
                            {format(new Date(n.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      {canEdit(n) && (
                        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleEdit(n)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget({ id: n.id, title: n.title })}
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir anotação"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.title || '(sem título)'}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmText="Excluir"
        variant="destructive"
        loading={deleting}
      />

      <Dialog open={!!viewingNote} onOpenChange={(open) => !open && setViewingNote(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              {viewingNote?.title || '(sem título)'}
            </DialogTitle>
            <DialogDescription>
              Detalhes da anotação
            </DialogDescription>
          </DialogHeader>
          {viewingNote && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Conteúdo</Label>
                <div className="rounded-lg border bg-muted/30 p-4 min-h-[100px] overflow-hidden">
                  <p className="text-sm whitespace-pre-wrap break-words max-w-full">{viewingNote.content}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Autor</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {viewingNote.authorType === 'company' ? (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{authorLabel(viewingNote)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Visibilidade</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {viewingNote.visibleToSellers === false ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{visibilityLabel(viewingNote)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Criada em</Label>
                  <p className="mt-1">
                    {format(new Date(viewingNote.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Atualizada em</Label>
                  <p className="mt-1">
                    {format(new Date(viewingNote.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              {canEdit(viewingNote) && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewingNote(null);
                      handleEdit(viewingNote);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewingNote(null);
                      setDeleteTarget({ id: viewingNote.id, title: viewingNote.title });
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
