import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Lock, MapPin, QrCode, Search, UserCheck } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Skeleton } from '../../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { TimeClockConfigForm } from '../../time-clock/TimeClockConfigForm';
import { QrCodeDisplay } from '../../time-clock/QrCodeDisplay';
import { SellerScheduleDialog } from '../../sellers/seller-schedule-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { sellerApi } from '@/lib/api-endpoints';
import type { Seller } from '@/types';

export interface PontoSettingsProps {
  locked?: boolean;
  lockReason?: string;
  onNavigate?: (route: string) => void;
}

type SectionKey = 'localizacao' | 'qr' | 'jornadas';

const SECTIONS: { key: SectionKey; label: string; icon: typeof MapPin }[] = [
  { key: 'localizacao', label: 'Localização e regras', icon: MapPin },
  { key: 'qr', label: 'QR da loja', icon: QrCode },
  { key: 'jornadas', label: 'Jornadas', icon: Clock },
];

const SECTION_STORAGE_KEY = 'settings-ponto-section';

function peekInitialSection(): SectionKey {
  try {
    const stored = sessionStorage.getItem(SECTION_STORAGE_KEY);
    if (stored && SECTIONS.some((s) => s.key === stored)) {
      return stored as SectionKey;
    }
  } catch {
    // ignore
  }
  return 'localizacao';
}

function consumeInitialSection() {
  try {
    sessionStorage.removeItem(SECTION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function parseSellers(response: unknown): Seller[] {
  if (Array.isArray(response)) return response as Seller[];
  if (!response || typeof response !== 'object') return [];
  const data = (response as { data?: unknown }).data ?? response;
  if (Array.isArray(data)) return data as Seller[];
  if (data && typeof data === 'object' && Array.isArray((data as { sellers?: unknown }).sellers)) {
    return (data as { sellers: Seller[] }).sellers;
  }
  return [];
}

export function PontoSettings({ locked, lockReason }: PontoSettingsProps) {
  const { user } = useAuth();
  const [section, setSection] = useState<SectionKey>(peekInitialSection);
  const [search, setSearch] = useState('');
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);

  useEffect(() => {
    consumeInitialSection();
  }, []);

  const { data: sellersResponse, isLoading: loadingSellers } = useQuery({
    queryKey: ['sellers', 'ponto-settings', search, user?.companyId],
    queryFn: async () =>
      (
        await sellerApi.list({
          search: search || undefined,
          companyId: user?.companyId || undefined,
        })
      ).data,
    enabled: section === 'jornadas' && !!user?.companyId,
  });

  const sellers = useMemo(() => parseSellers(sellersResponse), [sellersResponse]);

  if (locked) {
    return (
      <Alert className="border-destructive/40 bg-destructive/5">
        <Lock className="h-4 w-4 text-destructive" aria-hidden />
        <AlertDescription>
          {lockReason ?? 'Esta categoria está bloqueada para a sua empresa.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Tabs value={section} onValueChange={(v) => setSection(v as SectionKey)}>
        <div className="overflow-x-auto mb-4">
          <TabsList>
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <TabsTrigger key={s.key} value={s.key} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4" />
                  <span>{s.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="localizacao">
          <TimeClockConfigForm companyId={user?.companyId || undefined} />
        </TabsContent>

        <TabsContent value="qr">
          <QrCodeDisplay />
        </TabsContent>

        <TabsContent value="jornadas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Jornadas dos vendedores
              </CardTitle>
              <CardDescription>
                Defina dias e horários individuais. Sem jornada própria, o vendedor usa a da
                empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar vendedor..."
                  className="pl-9"
                />
              </div>

              {loadingSellers ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : sellers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhum vendedor encontrado.
                </p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {sellers.map((seller) => (
                    <li
                      key={seller.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{seller.name}</p>
                        {seller.email ? (
                          <p className="text-xs text-muted-foreground truncate">{seller.email}</p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingSeller(seller)}
                      >
                        Editar jornada
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editingSeller ? (
        <SellerScheduleDialog
          open={!!editingSeller}
          onClose={() => setEditingSeller(null)}
          sellerId={editingSeller.id}
          sellerName={editingSeller.name}
        />
      ) : null}
    </>
  );
}

export default PontoSettings;
