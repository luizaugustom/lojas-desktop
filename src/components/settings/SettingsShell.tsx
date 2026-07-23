import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Home, Lock, Settings as SettingsIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { companyApi } from '@/lib/api-endpoints';
import type { UserRole } from '@/types';
import {
  getSettingsCategories,
  getAllSettingsCategories,
  isUserRole,
  toCompanySnapshot,
  type SettingsCategory,
  type SettingsCategoryId,
  type VisibleSettingsCategory,
} from './settings-categories';

const isSettingsCategoryId = (value: string): value is SettingsCategoryId =>
  getAllSettingsCategories().some((category) => category.id === value);

const findCategoryBySlug = (
  slug: string,
): SettingsCategory | undefined =>
  getAllSettingsCategories().find((category) => category.slug === slug);

const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
};

export interface SettingsShellProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
}

export function SettingsShell({ currentRoute, onNavigate, children }: SettingsShellProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const role: UserRole | null = isUserRole(user?.role) ? user.role : null;
  const isEmpresa = role === 'empresa';

  const companyQuery = useQuery({
    queryKey: ['my-company', user?.companyId],
    queryFn: async () => {
      const response = await companyApi.myCompany();
      return response.data;
    },
    enabled: isEmpresa,
    staleTime: 60_000,
  });

  const segments = useMemo(() => currentRoute.split('/').filter(Boolean), [currentRoute]);

  const isHub = segments.length === 1 && segments[0] === 'settings';

  const subSlug = !isHub && segments.length >= 2 ? segments[1] : null;
  const knownSlug = subSlug !== null && isSettingsCategoryId(subSlug) ? subSlug : null;

  useEffect(() => {
    if (isHub) return;
    if (subSlug === null) {
      onNavigate('settings');
    } else if (knownSlug === null) {
      onNavigate('settings');
    }
  }, [isHub, knownSlug, subSlug, onNavigate]);

  const categories: VisibleSettingsCategory[] =
    role === null
      ? []
      : getSettingsCategories(role, toCompanySnapshot(companyQuery.data));

  const activeCategory: SettingsCategory | null =
    knownSlug !== null ? (findCategoryBySlug(knownSlug) ?? null) : null;

  const visibleActive: VisibleSettingsCategory | null = (() => {
    if (!activeCategory) return null;
    return categories.find((category) => category.id === activeCategory.id) ?? null;
  })();

  if (isHub) {
    return <>{children}</>;
  }

  if (subSlug === null || knownSlug === null) {
    return null;
  }

  if (!visibleActive) {
    return (
      <Alert className="border-muted bg-muted/40">
        <Lock className="h-4 w-4" aria-hidden />
        <AlertTitle>Categoria indisponível</AlertTitle>
        <AlertDescription>
          Esta categoria não está disponível para o seu perfil.
        </AlertDescription>
        <Button
          type="button"
          className="mt-3 w-fit"
          onClick={() => onNavigate('settings')}
        >
          Voltar para Configurações
        </Button>
      </Alert>
    );
  }

  if (visibleActive.locked) {
    return (
      <Alert className="border-destructive/40 bg-destructive/5">
        <Lock className="h-4 w-4 text-destructive" aria-hidden />
        <AlertTitle>{visibleActive.title} bloqueado</AlertTitle>
        <AlertDescription>
          {visibleActive.lockReason ?? 'Esta categoria está bloqueada para a sua empresa.'}
        </AlertDescription>
        <Button
          type="button"
          className="mt-3 w-fit"
          onClick={() => onNavigate('settings')}
        >
          Voltar para Configurações
        </Button>
      </Alert>
    );
  }

  if (isEmpresa && companyQuery.isLoading && !companyQuery.data) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Carregando configurações"
        className="space-y-4"
      >
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const baseNavClasses =
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

  return (
    <section aria-labelledby="settings-shell-title" className="space-y-4">
      <nav aria-label="Trilha de navegação" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
          <li className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:text-foreground"
            >
              <Home className="h-3.5 w-3.5" aria-hidden />
              <span>Configurações</span>
            </button>
          </li>
          <li aria-hidden className="flex items-center">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li className="font-medium text-foreground" aria-current="page">
            <span className="inline-flex items-center gap-1">
              <SettingsIcon className="h-3.5 w-3.5" aria-hidden />
              <span>{visibleActive.title}</span>
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <aside aria-label="Navegação local de configurações">
          <nav
            aria-label="Submenu de configurações"
            className={cn('hidden lg:block')}
          >
            <ul role="list" className="space-y-1">
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = visibleActive.slug === category.slug;

                if (category.locked) {
                  return (
                    <li key={category.id}>
                      <span
                        aria-disabled="true"
                        aria-current={isActive ? 'page' : undefined}
                        data-settings-nav-locked="true"
                        className={cn(
                          baseNavClasses,
                          'cursor-not-allowed text-muted-foreground opacity-70',
                          isActive && 'bg-muted font-medium',
                        )}
                        title={category.lockReason}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        <span className="flex-1">{category.title}</span>
                        <Lock className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={category.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(category.route)}
                      aria-current={isActive ? 'page' : undefined}
                      data-settings-nav-target={category.route}
                      className={cn(
                        baseNavClasses,
                        'w-full text-left text-foreground hover:bg-muted',
                        isActive && 'bg-muted font-medium',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      <span className="flex-1">{category.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {isMobile ? (
            <div className="lg:hidden">
              <label htmlFor="settings-mobile-nav" className="sr-only">
                Navegar para uma categoria de configuração
              </label>
              <Select
                value={visibleActive.slug}
                onValueChange={(value) => {
                  if (!value) return;
                  const target = categories.find((category) => category.slug === value);
                  if (target && !target.locked) {
                    onNavigate(target.route);
                  }
                }}
              >
                <SelectTrigger id="settings-mobile-nav" className="w-full">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.slug}
                      disabled={category.locked}
                    >
                      {category.locked ? `${category.title} (bloqueado)` : category.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </aside>

        <div>
          <header className="mb-4 space-y-1">
            <h1
              id="settings-shell-title"
              className="text-2xl font-semibold tracking-tight"
            >
              {visibleActive.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {visibleActive.description}
            </p>
          </header>
          {children}
        </div>
      </div>
    </section>
  );
}

export default SettingsShell;
