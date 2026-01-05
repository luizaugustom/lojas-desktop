import { useState, useEffect } from 'react';
import { Minus, Plus, Trash2, ShoppingCart, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ProductImage } from '../products/ProductImage';
import { useCartStore } from '../../store/cart-store';
import { formatCurrency } from '../../lib/utils';
import { parseDiscount } from '../../lib/utils-clean';

interface CartProps {
  onCheckout: () => void;
  onBudget?: () => void;
}

export function Cart({ onCheckout, onBudget }: CartProps) {
  const { items, discount, updateQuantity, removeItem, setDiscount, getSubtotal, getTotal, clearCart } =
    useCartStore();
  const [discountInput, setDiscountInput] = useState('');
  const [isPercentageDiscount, setIsPercentageDiscount] = useState(false);
  const [percentageValue, setPercentageValue] = useState<number | null>(null);

  const subtotal = getSubtotal();
  const total = getTotal();

  // Recalcular desconto percentual quando o subtotal mudar
  useEffect(() => {
    if (isPercentageDiscount && percentageValue !== null && subtotal > 0) {
      const parsed = parseDiscount(`${percentageValue}%`, subtotal);
      setDiscount(parsed.absoluteValue);
    }
  }, [subtotal, isPercentageDiscount, percentageValue, setDiscount]);

  // Sincronizar discountInput quando o desconto mudar externamente (ex: limpar carrinho)
  useEffect(() => {
    if (discount === 0) {
      setDiscountInput('');
      setIsPercentageDiscount(false);
      setPercentageValue(null);
    }
  }, [discount]);

  // Resetar desconto quando o carrinho for limpo
  useEffect(() => {
    if (items.length === 0) {
      setDiscountInput('');
      setIsPercentageDiscount(false);
      setPercentageValue(null);
    }
  }, [items.length]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b py-1">
        <CardTitle className="flex items-center gap-2 text-[10px]">
          <ShoppingCart className="h-2.5 w-2.5" />
          Carrinho ({items.length})
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 pb-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <ShoppingCart className="h-8 w-8 sm:h-12 sm:w-12 mb-2" />
            <p className="text-xs sm:text-sm">Carrinho vazio</p>
            <p className="text-xs">Adicione produtos para começar</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.product.id} className="flex gap-3 border-b pb-4">
              <ProductImage
                photos={item.product.photos}
                name={item.product.name}
                size="sm"
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-2">{item.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(item.product.price)} x {item.quantity}
                </p>
                <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => removeItem(item.product.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <div className="border-t bg-background flex-shrink-0">
        <div className="p-1.5 space-y-1.5">
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Desconto:</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t pt-0.5">
              <span>Total:</span>
              <span className="text-base">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="discount" className="text-xs">
              Desconto
            </Label>
            <Input
              id="discount"
              type="text"
              value={discountInput}
              onChange={(e) => {
                const value = e.target.value;
                setDiscountInput(value);
                
                // Se o campo estiver vazio, limpar desconto
                if (value.trim() === '') {
                  setDiscount(0);
                  setIsPercentageDiscount(false);
                  setPercentageValue(null);
                  return;
                }
                
                // Parsear o desconto
                const parsed = parseDiscount(value, subtotal);
                setDiscount(parsed.absoluteValue);
                setIsPercentageDiscount(parsed.isPercentage);
                setPercentageValue(parsed.percentageValue);
              }}
              onBlur={() => {
                if (discountInput.trim() === '') {
                  setDiscountInput('');
                  setDiscount(0);
                  setIsPercentageDiscount(false);
                  setPercentageValue(null);
                } else {
                  // Recalcular para garantir que está correto
                  const parsed = parseDiscount(discountInput, subtotal);
                  setDiscount(parsed.absoluteValue);
                  
                  // Manter o formato original no input (com % se for percentual)
                  if (parsed.isPercentage && parsed.percentageValue !== null) {
                    setDiscountInput(`${parsed.percentageValue}%`);
                  } else if (parsed.absoluteValue > 0) {
                    // Formatar valor absoluto com 2 casas decimais
                    setDiscountInput(parsed.absoluteValue.toFixed(2).replace('.', ','));
                  }
                }
              }}
              placeholder="0.00 ou 5%"
              className="no-spinner h-6"
            />
          </div>
        </div>

        <div className="p-2 pt-0 space-y-1.5">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={clearCart} disabled={items.length === 0}>
              Limpar
            </Button>
            <Button className="flex-1" onClick={onCheckout} disabled={items.length === 0}>
              Finalizar
            </Button>
          </div>
          {onBudget && (
            <Button
              variant="ghost"
              className="w-full text-primary text-sm"
              onClick={onBudget}
              disabled={items.length === 0}
            >
              <FileText className="mr-2 h-4 w-4" />
              Criar Orçamento
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

