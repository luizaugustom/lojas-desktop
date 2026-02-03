import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Barcode, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input, InputWithIcon } from '../ui/input';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { useCartStore } from '../../store/cart-store';
import { ProductList } from '../sales/product-list';
import { Cart } from '../sales/cart';
import { BarcodeScanner } from '../sales/barcode-scanner';
import { CheckoutDialog } from '../sales/checkout-dialog';
import { BudgetDialog } from '../sales/budget-dialog';
import { KeyboardShortcutsHelpDialog } from '../sales/keyboard-shortcuts-help-dialog';
import { handleNumberInputChange, isValidId } from '../../lib/utils-clean';
import { useDeviceStore } from '../../store/device-store';
import { parseScaleBarcode } from '../../lib/scale-barcode';
import { checkPrinterStatus } from '../../lib/printer-check';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useRef } from 'react';

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stockQuantity?: number;
  photos?: string[];
  [key: string]: any;
}

export default function SalesPage() {
  const { api, user } = useAuth();
  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const { addItem, items, clearCart } = useCartStore();
  const [lastScanned, setLastScanned] = useState(0);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [keyboardFocusArea, setKeyboardFocusArea] = useState<'products' | 'cart'>('products');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    barcodeBuffer,
    setBarcodeBuffer,
    scanSuccess,
    setScanSuccess,
    setScannerActive,
  } = useDeviceStore();

  const [openingDialogOpen, setOpeningDialogOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [creatingClosure, setCreatingClosure] = useState(false);

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: async () => {
      const params: any = {
        search,
        page: 1,
        limit: search ? 1000 : 10,
      };
      const response = (await api.get('/product', { params })).data;
      return response;
    },
  });

  const products = productsResponse?.products || [];

  const handleBarcodeScanned = async (barcode: string) => {
    setScanSuccess(true);
    setTimeout(() => setScanSuccess(false), 1500);

    try {
      const product = (await api.get(`/product/barcode/${barcode}`)).data;
      try {
        addItem(product, 1);
        toast.success(`${product.name} adicionado ao carrinho!`);
        setScannerOpen(false);
      } catch (addError) {
        console.error('Erro ao adicionar produto:', addError);
        toast.error(addError instanceof Error ? addError.message : 'Erro ao adicionar produto');
        setScanSuccess(false);
      }
    } catch (error) {
      const parsed = parseScaleBarcode(barcode);
      if (!parsed) {
        toast.error('Produto não encontrado');
        setScanSuccess(false);
        return;
      }

      try {
        const prod = (await api.get(`/product/barcode/${parsed.itemCode}`)).data as Product;
        let quantity = 1;
        if (parsed.type === 'weight') {
          quantity = parsed.amount;
        } else {
          const unitPrice = Number(prod.price);
          if (unitPrice > 0) {
            quantity = Math.max(0.001, Number((parsed.amount / unitPrice).toFixed(3)));
          }
        }

        addItem(prod, quantity);
        const label = parsed.type === 'weight' ? `${quantity.toFixed(3)} kg` : `R$ ${parsed.amount.toFixed(2)}`;
        toast.success(`${prod.name} adicionado (${label})!`);
        setScannerOpen(false);
      } catch (e2) {
        toast.error('Produto da etiqueta de balança não encontrado');
        setScanSuccess(false);
      }
    }
  };

  useEffect(() => {
    if (barcodeBuffer) {
      const timer = setTimeout(() => {
        setBarcodeBuffer('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [barcodeBuffer, setBarcodeBuffer]);

  useEffect(() => {
    checkPrinterStatus().catch((error) => {
      console.error('[SalesPage] Erro ao verificar status da impressora:', error);
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const resp = await api.get('/cash-closure/current');
        const current = resp?.data;
        if (!current || !current.id) {
          setOpeningDialogOpen(true);
        }
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404 || status === 204) {
          setOpeningDialogOpen(true);
        }
      }
    })();

    setScannerActive(true);

    const scanStartedAtRef = { current: null as number | null };

    const onKey = (e: KeyboardEvent) => {
      if (!e.key) return;

      if (e.key === 'Enter') {
        const code = barcodeBuffer.trim();
        if (code.length >= 3) {
          const startedAt = scanStartedAtRef.current ?? Date.now();
          const duration = Date.now() - startedAt;
          const avgPerChar = duration / Math.max(1, code.length);
          const isLikelyScanner = avgPerChar < 80;

          const now = Date.now();
          if (isLikelyScanner && now - lastScanned > 500) {
            handleBarcodeScanned(code);
            setLastScanned(now);
          }
        }
        setBarcodeBuffer('');
        scanStartedAtRef.current = null;
      } else if (e.key.length === 1) {
        if (!barcodeBuffer) {
          scanStartedAtRef.current = Date.now();
        }
        setBarcodeBuffer((s) => {
          const newBuffer = s + e.key;
          return newBuffer.length > 50 ? newBuffer.slice(-50) : newBuffer;
        });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      setScannerActive(false);
    };
  }, [barcodeBuffer, lastScanned, setScannerActive, setBarcodeBuffer]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    setCheckoutOpen(true);
  };

  const handleBudget = () => {
    if (items.length === 0) return;
    setBudgetOpen(true);
  };

  const handleBudgetSuccess = () => {
    toast.success('Orçamento criado com sucesso!');
  };

  // Quando qualquer modal está aberto, atalhos da página não devem interferir (apenas o modal responde)
  const anyModalOpen = checkoutOpen || budgetOpen || openingDialogOpen || helpDialogOpen || scannerOpen;

  // Atalhos de teclado para página de vendas (desabilitados quando há modal aberto)
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'F6',
        handler: () => {
          if (items.length > 0 && !checkoutOpen && !budgetOpen && !openingDialogOpen) {
            handleCheckout();
          }
        },
        context: ['sales'],
      },
      {
        key: 'Enter',
        ctrl: true,
        handler: () => {
          if (items.length > 0 && !checkoutOpen && !budgetOpen && !openingDialogOpen) {
            handleCheckout();
          }
        },
        context: ['sales'],
      },
      {
        key: 'b',
        ctrl: true,
        handler: () => {
          if (!checkoutOpen && !budgetOpen && !openingDialogOpen) {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
          }
        },
        context: ['sales'],
      },
      {
        key: 'l',
        ctrl: true,
        handler: () => {
          if (items.length > 0 && !checkoutOpen && !budgetOpen && !openingDialogOpen) {
            clearCart();
            toast.success('Carrinho limpo');
          }
        },
        context: ['sales'],
      },
      {
        key: 'Escape',
        handler: () => {
          if (checkoutOpen) {
            setCheckoutOpen(false);
          } else if (budgetOpen) {
            setBudgetOpen(false);
          } else if (scannerOpen) {
            setScannerOpen(false);
          }
        },
        context: ['sales'],
      },
      {
        key: 'ArrowLeft',
        handler: () => {
          setKeyboardFocusArea('products');
        },
        context: ['sales'],
      },
      {
        key: 'ArrowRight',
        handler: () => {
          setKeyboardFocusArea('cart');
        },
        context: ['sales'],
      },
    ],
    enabled: !anyModalOpen,
    context: 'sales',
    ignoreInputs: true,
  });

  const submitOpening = async () => {
    const value = Number(openingBalance.replace(',', '.'));
    if (isNaN(value) || value < 0) {
      toast.error('Digite um valor inicial válido (>= 0)');
      return;
    }
    try {
      setCreatingClosure(true);
      await api.post('/cash-closure', { openingAmount: value });
      toast.success('Caixa aberto com saldo inicial registrado');
      setOpeningDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao abrir caixa');
    } finally {
      setCreatingClosure(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 relative">
      <div
        className={`flex-1 flex flex-col overflow-hidden rounded-lg transition-all ${
          keyboardFocusArea === 'products' ? 'ring-1 ring-primary/20 ring-offset-1 ring-offset-background' : ''
        }`}
      >
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold tracking-tight">Vendas</h1>
            <button
              type="button"
              onClick={() => setHelpDialogOpen(true)}
              className="inline-flex items-center justify-center rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Ver atalhos de teclado"
              title="Ver atalhos de teclado"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <InputWithIcon
              ref={searchInputRef}
              placeholder="Buscar produtos... (Ctrl+B)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              iconPosition="left"
              className="flex-1"
            />
            <Button onClick={() => setScannerOpen(true)}>
              <Barcode className="mr-2 h-4 w-4" />
              Escanear
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ProductList
            products={products || []}
            isLoading={isLoading}
            keyboardFocusArea={keyboardFocusArea}
            keyboardShortcutsEnabled={!anyModalOpen}
            selectedProductIndex={selectedProductIndex ?? undefined}
            onProductSelect={setSelectedProductIndex}
            onAddToCart={(product) => {
              try {
                addItem(product);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Erro ao adicionar produto');
              }
            }}
          />
        </div>
      </div>

      <div
        className={`w-96 flex flex-col rounded-lg transition-all ${
          keyboardFocusArea === 'cart' ? 'ring-1 ring-primary/20 ring-offset-1 ring-offset-background' : ''
        }`}
      >
        <Cart
          keyboardFocusArea={keyboardFocusArea}
          keyboardShortcutsEnabled={!anyModalOpen}
          onCheckout={handleCheckout}
          onBudget={handleBudget}
        />
      </div>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleBarcodeScanned}
      />

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />

      <BudgetDialog
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        onSuccess={handleBudgetSuccess}
      />

      <KeyboardShortcutsHelpDialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
      />

      <Dialog open={openingDialogOpen} onOpenChange={setOpeningDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
            <DialogDescription>Informe o valor inicial do caixa para iniciar as vendas do dia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="openingBalance">Saldo inicial</Label>
              <Input
                id="openingBalance"
                type="text"
                placeholder="0.00"
                value={openingBalance}
                onChange={(e) => handleNumberInputChange(e, setOpeningBalance)}
                className="no-spinner"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpeningDialogOpen(false)} disabled={creatingClosure}>
              Cancelar
            </Button>
            <Button onClick={submitOpening} disabled={creatingClosure}>
              {creatingClosure ? 'Abrindo...' : 'Abrir Caixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
