'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { contactsApi } from '../../lib/api-endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  Contact,
  Plus,
  Pencil,
  Trash2,
  Building2,
  User,
  Lock,
  Users,
  Phone,
  Mail,
  Link as LinkIcon,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { ConfirmationModal } from '../ui/confirmation-modal';
import { Skeleton } from '../ui/skeleton';
import { getImageUrl } from '../../lib/image-utils';

export interface ContactItem {
  id: string;
  companyId: string;
  authorType: string;
  authorId: string;
  authorName: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  link: string | null;
  photoUrl: string | null;
  visibleToSellers: boolean | null;
  visibleToCompany: boolean | null;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string };
}

const AUTHOR_FILTER_COMPANY = [
  { value: 'all', label: 'Todos' },
  { value: 'company_only', label: 'Só meus (empresa)' },
  { value: 'shared_with_sellers', label: 'Compartilhados com vendedores' },
  { value: 'sellers_only', label: 'Dos vendedores' },
] as const;

const AUTHOR_FILTER_SELLER = [
  { value: 'all', label: 'Todos visíveis' },
  { value: 'mine_only', label: 'Só meus' },
  { value: 'shared_with_company', label: 'Compartilhados com empresa' },
] as const;

interface ContactsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactsPanel({ open, onOpenChange }: ContactsPanelProps) {
  const { user } = useAuth();
  const isCompany = user?.role === 'empresa';
  const isSeller = user?.role === 'vendedor';

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [formMode, setFormMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAuthorType, setEditingAuthorType] = useState<'company' | 'seller' | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formVisibleToSellers, setFormVisibleToSellers] = useState(true);
  const [formVisibleToCompany, setFormVisibleToCompany] = useState(true);
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewingContact, setViewingContact] = useState<ContactItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchContacts = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await contactsApi.list({
        search: searchDebounced || undefined,
        authorFilter: authorFilter === 'all' ? undefined : authorFilter,
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      // Ordenar contatos alfabeticamente por nome
      const sortedData = [...data].sort((a, b) => 
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      );
      setContacts(sortedData);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao carregar contatos');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [open, searchDebounced, authorFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const canEdit = (c: ContactItem) => {
    if (isCompany) return true;
    return isSeller && c.authorType === 'seller' && c.authorId === user?.id;
  };

  const resetForm = () => {
    setFormMode('idle');
    setEditingId(null);
    setEditingAuthorType(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormLink('');
    setFormVisibleToSellers(true);
    setFormVisibleToCompany(true);
    setFormPhoto(null);
    setFormPhotoPreview(null);
    setExistingPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreate = () => {
    resetForm();
    setFormMode('create');
  };

  const handleEdit = (c: ContactItem) => {
    setEditingId(c.id);
    setEditingAuthorType(c.authorType === 'company' ? 'company' : 'seller');
    setFormName(c.name);
    setFormPhone(c.phone || '');
    setFormEmail(c.email || '');
    setFormLink(c.link || '');
    setFormVisibleToSellers(c.visibleToSellers ?? true);
    setFormVisibleToCompany(c.visibleToCompany ?? true);
    setExistingPhotoUrl(c.photoUrl);
    setFormPhotoPreview(c.photoUrl ? getImageUrl(c.photoUrl) || null : null);
    setFormMode('edit');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setFormPhoto(file);
    const preview = URL.createObjectURL(file);
    setFormPhotoPreview(preview);
  };

  const removePhoto = () => {
    setFormPhoto(null);
    setFormPhotoPreview(null);
    setExistingPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (isCompany && formMode === 'create' && formVisibleToSellers === undefined) {
      toast.error('Defina se o contato será visível para vendedores');
      return;
    }

    if (isSeller && formMode === 'create' && formVisibleToCompany === undefined) {
      toast.error('Defina se o contato será compartilhado com a empresa');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', formName.trim());
      if (formPhone.trim()) formData.append('phone', formPhone.trim());
      if (formEmail.trim()) formData.append('email', formEmail.trim());
      if (formLink.trim()) formData.append('link', formLink.trim());
      
      if (isCompany) {
        formData.append('visibleToSellers', String(formVisibleToSellers));
      }
      if (isSeller) {
        formData.append('visibleToCompany', String(formVisibleToCompany));
      }

      if (formPhoto) {
        formData.append('photo', formPhoto);
      }

      if (formMode === 'create') {
        await contactsApi.create(formData);
        toast.success('Contato criado');
      } else if (editingId) {
        await contactsApi.update(editingId, formData);
        toast.success('Contato atualizado');
      }
      resetForm();
      fetchContacts();
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
      await contactsApi.delete(deleteTarget.id);
      toast.success('Contato removido');
      setDeleteTarget(null);
      fetchContacts();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const visibilityLabel = (c: ContactItem) => {
    if (c.authorType === 'seller') {
      return c.visibleToCompany ? 'Compartilhado com empresa' : 'Só meu';
    }
    return c.visibleToSellers ? 'Compartilhado com vendedores' : 'Só empresa';
  };

  const authorLabel = (c: ContactItem) => {
    if (c.authorType === 'company') return 'Empresa';
    return c.authorName ? `Vendedor: ${c.authorName}` : 'Vendedor';
  };

  const formatPhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  const openWhatsApp = (phone: string | null) => {
    if (!phone) return;
    const cleanPhone = formatPhoneForWhatsApp(phone);
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const openEmail = (email: string | null) => {
    if (!email) return;
    window.location.href = `mailto:${email}`;
  };

  const openLink = (link: string | null) => {
    if (!link) return;
    let url = link;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    window.open(url, '_blank');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 pr-10 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Contact className="h-5 w-5" />
              Contatos
            </DialogTitle>
            <DialogDescription>
              Gerencie seus contatos. Adicione informações de contato e escolha se deseja compartilhar.
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 sm:px-6 space-y-3 pb-2 shrink-0">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Buscar por nome, telefone ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-3"
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

            <Button type="button" onClick={handleCreate} className="w-full sm:w-auto" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo contato
            </Button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col border-t overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6">
              <div className="space-y-2 py-4">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-lg border p-3 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Contact className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {search || authorFilter !== 'all'
                        ? 'Nenhum contato encontrado com os filtros atuais.'
                        : 'Nenhum contato ainda. Clique em "Novo contato" para criar o primeiro!'}
                    </p>
                  </div>
                ) : (
                  contacts.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border bg-card p-3 space-y-2 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setViewingContact(c)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0">
                          {c.photoUrl ? (
                            <img
                              src={getImageUrl(c.photoUrl) || ''}
                              alt={c.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-border"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                              <Contact className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{c.name}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                            {c.phone && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWhatsApp(c.phone);
                                }}
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <Phone className="h-3 w-3" />
                                {c.phone}
                              </button>
                            )}
                            {c.email && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEmail(c.email);
                                }}
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <Mail className="h-3 w-3" />
                                {c.email}
                              </button>
                            )}
                            {c.link && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLink(c.link);
                                }}
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <LinkIcon className="h-3 w-3" />
                                Link
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {c.authorType === 'company' ? (
                                <Building2 className="h-3 w-3" />
                              ) : (
                                <User className="h-3 w-3" />
                              )}
                              {authorLabel(c)}
                            </span>
                            <span className="flex items-center gap-1">
                              {c.visibleToSellers === false || c.visibleToCompany === false ? (
                                <Lock className="h-3 w-3" />
                              ) : (
                                <Users className="h-3 w-3" />
                              )}
                              {visibilityLabel(c)}
                            </span>
                            <span>
                              {format(new Date(c.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        {canEdit(c) && (
                          <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(c)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
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

      <Dialog open={formMode !== 'idle'} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Contact className="h-5 w-5" />
              {formMode === 'create' ? 'Novo contato' : 'Editar contato'}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Preencha os dados do novo contato.'
                : 'Altere os dados do contato conforme necessário.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="contact-form-name">Nome *</Label>
              <Input
                id="contact-form-name"
                placeholder="Nome do contato"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contact-form-phone">Telefone</Label>
                <Input
                  id="contact-form-phone"
                  placeholder="(11) 98765-4321"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-form-email">Email</Label>
                <Input
                  id="contact-form-email"
                  type="email"
                  placeholder="contato@exemplo.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-form-link">Link</Label>
              <Input
                id="contact-form-link"
                placeholder="https://..."
                value={formLink}
                onChange={(e) => setFormLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Foto</Label>
              <div className="flex items-center gap-3">
                {formPhotoPreview ? (
                  <div className="relative">
                    <img
                      src={formPhotoPreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={removePhoto}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="contact-form-photo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {formPhotoPreview ? 'Trocar foto' : 'Adicionar foto'}
                  </Button>
                </div>
              </div>
            </div>

            {isCompany && (formMode === 'create' || editingAuthorType === 'company') && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="contact-form-visible-sellers"
                  checked={formVisibleToSellers}
                  onChange={(e) => setFormVisibleToSellers(e.target.checked)}
                  className="rounded border-input h-4 w-4"
                />
                <Label htmlFor="contact-form-visible-sellers" className="text-sm font-normal cursor-pointer">
                  Compartilhar com vendedores
                </Label>
              </div>
            )}

            {isSeller && (formMode === 'create' || editingAuthorType === 'seller') && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="contact-form-visible-company"
                  checked={formVisibleToCompany}
                  onChange={(e) => setFormVisibleToCompany(e.target.checked)}
                  className="rounded border-input h-4 w-4"
                />
                <Label htmlFor="contact-form-visible-company" className="text-sm font-normal cursor-pointer">
                  Compartilhar com empresa
                </Label>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : formMode === 'create' ? 'Criar' : 'Salvar'}
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir contato"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.name}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmText="Excluir"
        variant="destructive"
        loading={deleting}
      />

      <Dialog open={!!viewingContact} onOpenChange={(open) => !open && setViewingContact(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Contact className="h-5 w-5" />
              {viewingContact?.name}
            </DialogTitle>
            <DialogDescription>Detalhes do contato</DialogDescription>
          </DialogHeader>
          {viewingContact && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                {viewingContact.photoUrl ? (
                  <img
                    src={getImageUrl(viewingContact.photoUrl) || ''}
                    alt={viewingContact.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-border"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-border">
                    <Contact className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {viewingContact.phone && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openWhatsApp(viewingContact.phone)}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {viewingContact.phone}
                      </Button>
                    </div>
                  </div>
                )}
                {viewingContact.email && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEmail(viewingContact.email)}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {viewingContact.email}
                      </Button>
                    </div>
                  </div>
                )}
                {viewingContact.link && (
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Link</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLink(viewingContact.link)}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Abrir link
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Autor</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {viewingContact.authorType === 'company' ? (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{authorLabel(viewingContact)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Visibilidade</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {viewingContact.visibleToSellers === false ||
                    viewingContact.visibleToCompany === false ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{visibilityLabel(viewingContact)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Criado em</Label>
                  <p className="mt-1">
                    {format(new Date(viewingContact.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Atualizado em</Label>
                  <p className="mt-1">
                    {format(new Date(viewingContact.updatedAt), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
              {canEdit(viewingContact) && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewingContact(null);
                      handleEdit(viewingContact);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewingContact(null);
                      setDeleteTarget({ id: viewingContact.id, name: viewingContact.name });
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
