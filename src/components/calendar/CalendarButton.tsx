'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarPanel } from './CalendarPanel';

export function CalendarButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const visible = user?.role === 'empresa' || user?.role === 'vendedor';
  if (!visible) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Abrir agenda"
        title="Agenda"
      >
        <Calendar className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </Button>
      <CalendarPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
