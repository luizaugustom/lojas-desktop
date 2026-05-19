'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { formatCurrency } from '../../lib/utils';
import type { Product } from '../../types';

interface QuantityModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  product: Product | null;
}

export function QuantityModal({ open, onClose, onConfirm, product }: QuantityModalProps) {
  const [quantity, setQuantity] = useState('1');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuantity('1');
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [open]);

  const handleConfirm = () => {
    const parsed = parseFloat(quantity.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      onConfirm(parsed);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // Impedir que eventos subam para a página
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const parsedQty = parseFloat(quantity.replace(',', '.')) || 0;
  const effectivePrice = product?.isOnPromotion && product.promotionPrice !== undefined
    ? product.promotionPrice
    : (product?.price ?? 0);
  const estimatedTotal = Math.round(parsedQty * effectivePrice * 100) / 100;

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar ao carrinho</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="font-medium">{product.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(effectivePrice)} por {product.unitOfMeasure || 'un'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input
              ref={inputRef}
              id="quantity"
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => {
                const value = e.target.value.replace(',', '.');
                if (/^\d*\.?\d{0,3}$/.test(value)) {
                  setQuantity(value);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="0,000"
            />
            <p className="text-xs text-muted-foreground">
              Use ponto ou vírgula para decimais (máx. 3 casas)
            </p>
          </div>
          {parsedQty > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Total estimado: </span>
              <span className="font-semibold">{formatCurrency(estimatedTotal)}</span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={parsedQty <= 0}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}