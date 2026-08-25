import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SortKey = 'name-asc' | 'price-asc' | 'price-desc';

type Props = {
  categories: string[];
  category: string | undefined;
  minPrice: string;
  maxPrice: string;
  sort: SortKey;
  onCategoryChange: (next: string | undefined) => void;
  onMinPriceChange: (next: string) => void;
  onMaxPriceChange: (next: string) => void;
  onSortChange: (next: SortKey) => void;
  onReset: () => void;
};

export function FilterDrawer(props: Props) {
  const {
    categories,
    category,
    minPrice,
    maxPrice,
    sort,
    onCategoryChange,
    onMinPriceChange,
    onMaxPriceChange,
    onSortChange,
    onReset,
  } = props;

  const activeCount =
    (category ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (sort !== 'name-asc' ? 1 : 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" aria-hidden />
          Filtros
          {activeCount > 0 ? (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-xs font-semibold text-white">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="catalog-root max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
          <DialogDescription>
            Refine a lista de produtos do catálogo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label htmlFor="sort" className="text-sm font-medium">
              Ordenação
            </Label>
            <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
              <SelectTrigger id="sort" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="catalog-root">
                <SelectItem value="name-asc">Nome (A → Z)</SelectItem>
                <SelectItem value="price-asc">Menor preço</SelectItem>
                <SelectItem value="price-desc">Maior preço</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {categories.length > 0 ? (
            <div>
              <Label className="text-sm font-medium">Categoria</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={category ? 'outline' : 'default'}
                  onClick={() => onCategoryChange(undefined)}
                >
                  Todas
                </Button>
                {categories.map((c) => (
                  <Button
                    key={c}
                    type="button"
                    size="sm"
                    variant={category === c ? 'default' : 'outline'}
                    onClick={() => onCategoryChange(c)}
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="minPrice" className="text-sm font-medium">
                Preço mín.
              </Label>
              <Input
                id="minPrice"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(e) => onMinPriceChange(e.target.value)}
                placeholder="0,00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="maxPrice" className="text-sm font-medium">
                Preço máx.
              </Label>
              <Input
                id="maxPrice"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(e) => onMaxPriceChange(e.target.value)}
                placeholder="0,00"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 flex-row justify-between gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={onReset}>
            Limpar
          </Button>
          <DialogTrigger asChild>
            <Button type="button">Aplicar</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}