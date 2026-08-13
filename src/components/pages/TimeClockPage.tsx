import { useRef, useState } from 'react';
import {
  Clock,
  ListChecks,
  AlertCircle,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeClockTab, type TimeClockTab } from '../../contexts/TimeClockTabContext';
import { PunchClockCard } from '../time-clock/PunchClockCard';
import { QrScanner } from '../time-clock/QrScanner';
import { LocationPrompt } from '../time-clock/LocationPrompt';
import { PunchHistoryList } from '../time-clock/PunchHistoryList';
import { NextExpectedPunch, TIME_CLOCK_ORDER } from '../time-clock/NextExpectedPunch';
import { TimeClockStatsCard } from '../time-clock/TimeClockStatsCard';
import { TimeClockHistoryView } from '../time-clock/TimeClockHistoryView';
import { TimeClockManageView } from '../time-clock/TimeClockManageView';
import { PendingApprovalsList } from '../time-clock/PendingApprovalsList';
import { VendorScheduleCard } from '../time-clock/VendorScheduleCard';
import {
  useMyToday,
  useMyStats,
  useMySchedule,
  useTimeClockStats,
  useTimeClockConfig,
} from '../../hooks/useTimeClock';
import { useGeolocation } from '../../hooks/useGeolocation';

type Role = 'admin' | 'empresa' | 'vendedor' | 'gestor';

interface TabDef {
  key: TimeClockTab;
  label: string;
  icon: typeof Clock;
  roles: Role[];
}

const ALL_TABS: TabDef[] = [
  { key: 'punch', label: 'Bater Ponto', icon: Clock, roles: ['vendedor', 'empresa', 'admin', 'gestor'] },
  { key: 'history', label: 'Histórico', icon: ListChecks, roles: ['vendedor'] },
  { key: 'pending', label: 'Pendentes', icon: AlertCircle, roles: ['empresa', 'admin', 'gestor'] },
  { key: 'manage', label: 'Histórico Geral', icon: ListChecks, roles: ['empresa', 'admin', 'gestor'] },
];

export default function TimeClockPage() {
  const { user } = useAuth();
  const { tab, setTab } = useTimeClockTab();
  const role = (user?.role ?? 'vendedor') as Role;

  const allowedTabs = ALL_TABS.filter((t) => t.roles.includes(role));
  const activeTab: TimeClockTab = allowedTabs.some((t) => t.key === tab)
    ? tab
    : (allowedTabs[0]?.key ?? 'punch');

  return (
    <div className="space-y-4 p-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Ponto Eletrônico</h1>
        <p className="text-sm text-muted-foreground">
          Bate ponto com QR Code e geolocalização.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as TimeClockTab)}>
        <div className="overflow-x-auto">
          <TabsList>
            {allowedTabs.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.key} value={t.key} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {allowedTabs.some((t) => t.key === 'punch') && (
          <TabsContent value="punch">
            <PunchTab />
          </TabsContent>
        )}
        {allowedTabs.some((t) => t.key === 'history') && (
          <TabsContent value="history">
            <TimeClockHistoryView />
          </TabsContent>
        )}
        {allowedTabs.some((t) => t.key === 'pending') && (
          <TabsContent value="pending">
            <PendingTab />
          </TabsContent>
        )}
        {allowedTabs.some((t) => t.key === 'manage') && (
          <TabsContent value="manage">
            <TimeClockManageView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function PunchTab() {
  const { user } = useAuth();
  const role = (user?.role ?? 'vendedor') as Role;
  const isVendedor = role === 'vendedor';

  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrToken, setQrToken] = useState<string | undefined>();
  const locationCardRef = useRef<HTMLDivElement>(null);

  const {
    coords,
    status: geoStatus,
    error: geoError,
    loading: geoLoading,
    refresh: refreshGeo,
  } = useGeolocation({ autoStart: true, timeout: 12_000 });

  const { data: today, isLoading: loadingToday, refetch: refetchToday } = useMyToday(true);
  const { data: stats, isLoading: loadingStats } = useMyStats();
  const { data: config } = useTimeClockConfig();
  const { data: mySchedule, isLoading: loadingSchedule } = useMySchedule(true);

  const punches = (today?.punches ?? []).map((p: any) => ({
    id: p.id,
    type: p.type,
    timestamp: p.timestamp,
    status: p.status,
    distanceMeters: p.distanceMeters,
  }));

  const focusLocation = () => {
    refreshGeo();
    requestAnimationFrame(() => {
      locationCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  if (isVendedor) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <VendorScheduleCard
          today={mySchedule?.today ?? null}
          nextExpected={today?.nextExpected ?? null}
          loading={loadingSchedule && !mySchedule}
          punchesReady={!!today}
        />

        <PunchClockCard
          config={config}
          today={today}
          loading={loadingToday}
          onPunched={refetchToday}
          qrToken={qrToken}
          onRequireQrScan={() => setScannerOpen(true)}
          coords={coords}
          geoStatus={geoStatus}
          onRequestLocation={focusLocation}
        />

        {config?.requireQrCode && scannerOpen && (
          <QrScanner
            onScan={(token) => {
              setQrToken(token);
              setScannerOpen(false);
            }}
            onClose={() => setScannerOpen(false)}
          />
        )}

        <div ref={locationCardRef}>
          <LocationPrompt
            config={config}
            coords={coords}
            status={geoStatus}
            error={geoError}
            loading={geoLoading}
            onRefresh={refreshGeo}
          />
        </div>

        <PunchHistoryList
          punches={punches}
          loading={loadingToday}
          title="Marcações de hoje"
          emptyMessage="Nenhuma marcação registrada ainda hoje. Bate o ponto acima!"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PunchClockCard
        config={config}
        today={today}
        loading={loadingToday}
        onPunched={refetchToday}
        qrToken={qrToken}
        onRequireQrScan={() => setScannerOpen(true)}
        coords={coords}
        geoStatus={geoStatus}
        onRequestLocation={focusLocation}
      />

      <NextExpectedPunch
        nextType={today?.nextExpected ?? null}
        order={TIME_CLOCK_ORDER}
        loading={loadingToday}
        ready={!!today}
      />

      {config?.requireQrCode && scannerOpen && (
        <QrScanner
          onScan={(token) => {
            setQrToken(token);
            setScannerOpen(false);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}

      <div ref={locationCardRef}>
        <LocationPrompt
          config={config}
          coords={coords}
          status={geoStatus}
          error={geoError}
          loading={geoLoading}
          onRefresh={refreshGeo}
        />
      </div>

      <TimeClockStatsCard stats={stats} loading={loadingStats} title="Minhas estatísticas" />

      <PunchHistoryList
        loading={loadingToday}
        punches={punches}
        title="Marcações de hoje"
        emptyMessage="Nenhuma marcação registrada hoje."
      />
    </div>
  );
}

function PendingTab() {
  const { data: stats, isLoading } = useTimeClockStats();
  return (
    <div className="space-y-4">
      <PendingApprovalsList />
      <TimeClockStatsCard
        stats={stats}
        loading={isLoading}
        title="Indicadores da empresa"
      />
    </div>
  );
}
