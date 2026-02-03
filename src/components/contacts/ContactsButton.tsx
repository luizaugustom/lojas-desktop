'use client';

import { useState } from 'react';
import { Contact } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ContactsPanel } from './ContactsPanel';

export function ContactsButton() {
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
        aria-label="Abrir contatos"
        title="Contatos"
      >
        <Contact className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </Button>
      <ContactsPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
