import { useState } from 'react';
import { HelpCircle, Lock, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { PageHelpModal } from '../help/page-help-modal';
import {
  settingsHelpTitle,
  settingsHelpDescription,
  settingsHelpIcon,
  getSettingsHelpTabs,
} from '../help/contents/settings-help';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { companyApi } from '@/lib/api-endpoints';
import type { UserRole } from '@/types';
import {
  getSettingsCategories,
  isUserRole,
  toCompanySnapshot,
  type VisibleSettingsCategory,
} from './settings-categories';

export interface SettingsHubProps {
  onNavigate: (route: string) => void;
}

export function SettingsHub({ onNavigate }: SettingsHubProps) {
  const { user } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);

  const role: UserRole | null = isUserRole(user?.role) ? user.role : null;
  const isEmpresa = role === 'empresa';

  // Empresa: buscamos os dados da empresa para resolver locks de plano.
  // Demais papéis podem mostrar imediatamente — eles não recebem lock de empresa.
  const companyQuery = useQuery({
    queryKey: ['my-company', user?.companyId],
    queryFn: async () => {
      const response = await companyApi.myCompany();
      return response.data;
    },
    enabled: isEmpresa,
    staleTime: 60_000,
  });

  const companyLoading = isEmpresa && companyQuery.isLoading;

  const categories: VisibleSettingsCategory[] =
    role === null
      ? []
      : getSettingsCategories(role, toCompanySnapshot(companyQuery.data));

  return (
    <section aria-labelledby="settings-hub-title" className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SettingsIcon
              className="h-6 w-6 text-muted-foreground"
              aria-hidden
            />
            <h1
              id="settings-hub-title"
              className="text-2xl font-semibold tracking-tight"
            >
              Configurações
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie perfil, empresa, fiscal, catálogo e demais recursos da sua conta.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setHelpOpen(true)}
          aria-label="Ajuda das configurações"
          className="self-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <HelpCircle className="mr-2 h-4 w-4" aria-hidden />
          Ajuda
        </Button>
      </header>

      {companyLoading ? (
        <div
          role="status"
          aria-live="polite"
          aria-label="Carregando configurações"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={`skeleton-${index}`} aria-hidden>
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma categoria de configuração disponível para o seu perfil.
        </p>
      ) : (
        <ul
          role="list"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {categories.map((category) => {
            const Icon = category.icon;
            const { locked, lockReason, route, title, description, id } = category;

            const cardInner = (
              <>
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div
                    className="rounded-md bg-muted p-2"
                    aria-hidden
                  >
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span>{title}</span>
                      {locked ? (
                        <Lock
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden
                        />
                      ) : null}
                    </CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </div>
                </CardHeader>
                {locked && lockReason ? (
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{lockReason}</p>
                  </CardContent>
                ) : null}
              </>
            );

            return (
              <li
                key={id}
                data-settings-card
                data-locked={locked ? 'true' : 'false'}
                className="list-none"
              >
                {locked ? (
                  <Card
                    tabIndex={0}
                    aria-disabled="true"
                    className="h-full cursor-not-allowed opacity-80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`${title} bloqueado: ${lockReason ?? ''}`}
                  >
                    {cardInner}
                  </Card>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate(route)}
                    data-settings-hub-target={route}
                    className="block w-full rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Card className="h-full transition hover:border-primary hover:shadow-md">
                      {cardInner}
                    </Card>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <PageHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={settingsHelpTitle}
        description={settingsHelpDescription}
        icon={settingsHelpIcon}
        tabs={getSettingsHelpTabs()}
      />
    </section>
  );
}

export default SettingsHub;
