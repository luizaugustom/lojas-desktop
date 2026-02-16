import { CreditCard } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';

export type CardBrand = '01' | '02' | '03' | '04' | '05' | '99';

interface CardBrandOption {
  value: CardBrand;
  label: string;
  shortLabel: string;
}

const cardBrands: CardBrandOption[] = [
  {
    value: '01',
    label: 'Visa',
    shortLabel: 'Visa',
  },
  {
    value: '02',
    label: 'Mastercard',
    shortLabel: 'Master',
  },
  {
    value: '04',
    label: 'Elo',
    shortLabel: 'Elo',
  },
];

const otherBrands: CardBrandOption[] = [
  {
    value: '03',
    label: 'American Express',
    shortLabel: 'Amex',
  },
  {
    value: '05',
    label: 'Hipercard',
    shortLabel: 'Hipercard',
  },
  {
    value: '99',
    label: 'Outras',
    shortLabel: 'Outras',
  },
];

interface CardBrandSelectProps {
  value: CardBrand | '';
  onChange: (value: CardBrand) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function CardBrandSelect({
  value,
  onChange,
  disabled = false,
  id,
  className,
}: CardBrandSelectProps) {
  const allBrands = [...cardBrands, ...otherBrands];
  const selectedBrand = allBrands.find((brand) => brand.value === value);

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="text-xs">
        Bandeira (padrão: Outras)
      </Label>
      
      {/* Botões rápidos para bandeiras mais comuns */}
      <div className="flex flex-wrap gap-2">
        {cardBrands.map((brand) => (
          <Button
            key={brand.value}
            type="button"
            variant={value === brand.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(brand.value)}
            disabled={disabled}
            className={cn(
              'flex-1 min-w-[80px] transition-all',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs font-medium">{brand.shortLabel}</span>
          </Button>
        ))}
        
        {/* Botão "Outras" com dropdown */}
        <Select
          value={value || ''}
          onValueChange={(val) => onChange(val as CardBrand)}
          disabled={disabled}
        >
          <SelectTrigger
            id={id}
            className={cn(
              'flex-1 min-w-[80px] h-9',
              value && !cardBrands.find((brand) => brand.value === value)
                ? 'bg-primary text-primary-foreground'
                : ''
            )}
          >
            <SelectValue placeholder="Outras" />
          </SelectTrigger>
          <SelectContent>
            {allBrands.map((brand) => (
              <SelectItem key={brand.value} value={brand.value}>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>{brand.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Indicador visual da seleção */}
      {selectedBrand && (
        <p className="text-xs text-muted-foreground">
          Selecionado: <span className="font-medium">{selectedBrand.label}</span>
        </p>
      )}
    </div>
  );
}

