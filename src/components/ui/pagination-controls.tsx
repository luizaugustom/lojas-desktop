'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  pageSize = 20,
  totalItems,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const handlePrevious = () => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      onPageChange(page + 1);
    }
  };

  const startItem = totalItems ? (page - 1) * pageSize + 1 : undefined;
  const endItem = totalItems ? Math.min(page * pageSize, totalItems) : undefined;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {totalItems && totalItems > 0
          ? `Mostrando ${startItem}-${endItem} de ${totalItems}`
          : `Página ${page} de ${totalPages}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={page === 1}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={page === totalPages}
          className="gap-1"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


