import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';

export interface PageHelpTab {
  value: string;
  label: string;
  content: React.ReactNode;
}

export interface PageHelpModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  tabs: PageHelpTab[];
}

export function FeatureCard({
  icon,
  title,
  description,
  badge,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  delay?: number;
}) {
  return (
    <Card
      className="transition-all hover:shadow-md hover:border-primary duration-200 cursor-default animate-in fade-in-50 duration-300"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="mt-1">{icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{title}</h4>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StepItem({
  number,
  text,
  emphasis,
}: {
  number: number;
  text: string;
  emphasis?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
        {number}
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm">{text}</p>
        {emphasis && (
          <p className="text-xs text-muted-foreground mt-1">→ {emphasis}</p>
        )}
      </div>
    </div>
  );
}

export function StatusBadgeDemo({
  status,
  color,
  description,
}: {
  status: string;
  color: 'green' | 'red' | 'yellow';
  description?: string;
}) {
  const colorClasses = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    yellow:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClasses[color]}`}
      >
        {status}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </div>
  );
}

export function TipItem({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <span className="text-sm">{text}</span>
    </li>
  );
}

export function TroubleshootItem({
  problem,
  solution,
}: {
  problem: string;
  solution: string;
}) {
  return (
    <div className="space-y-1">
      <h5 className="text-sm font-medium text-destructive">❌ {problem}</h5>
      <p className="text-sm text-muted-foreground ml-6">✓ {solution}</p>
    </div>
  );
}

export function PageHelpModal({
  open,
  onClose,
  title,
  description,
  icon,
  iconClassName = 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  tabs,
}: PageHelpModalProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.value ?? 'overview');

  const defaultIcon = (
    <HelpCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${iconClassName}`}
              aria-hidden
            >
              {icon ?? defaultIcon}
            </div>
            <div>
              <DialogTitle className="text-2xl">{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList
            className={`grid w-full ${tabs.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}
          >
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="space-y-6 animate-in fade-in-50 duration-300 mt-4"
            >
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter>
          <Button onClick={onClose} aria-label="Fechar ajuda">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
