import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, Loader2, RefreshCw, AlertCircle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { loadNCMData, searchNCM, type NCMItem, clearNCMCache, getCacheInfo } from '../../lib/ncm-data';
import { ncmApi } from '../../lib/api-endpoints';
import { toast } from 'react-hot-toast';

const fetchNcmFromBackend = () => ncmApi.list().then((r) => r.data as NCMItem[]);

interface NCMSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (ncmCode: string) => void;
}

const MAX_DISPLAY_RESULTS = 500; // Limitar resultados exibidos para performance
const DEBOUNCE_DELAY = 300; // ms

export function NCMSearchModal({ open, onClose, onSelect }: NCMSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [ncmData, setNcmData] = useState<NCMItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setSelectedIndex(0); // Resetar seleção ao buscar
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Carregar dados NCM quando modal abrir
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await loadNCMData(false, fetchNcmFromBackend);
        setNcmData(data);
        if (data.length === 0) {
          setError('Nenhum dado NCM disponível. Tente recarregar.');
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados NCM:', err);
        setError(err.message || 'Erro ao carregar dados de NCM. Verifique sua conexão.');
        try {
          const cacheInfo = getCacheInfo();
          if (cacheInfo.exists && cacheInfo.itemCount > 0) {
            toast.error('Usando dados em cache. Alguns dados podem estar desatualizados.');
            const data = await loadNCMData(false, fetchNcmFromBackend);
            setNcmData(data);
            setError(null);
          }
        } catch (cacheErr) {
          // Ignorar
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open]);

  // Focar no input quando modal abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      setError(null);
    }
  }, [open]);

  // Buscar resultados
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return ncmData.slice(0, 300); // Mostrar primeiros 300 quando sem busca
    }
    
    const results = searchNCM(debouncedQuery, ncmData);
    return results.slice(0, MAX_DISPLAY_RESULTS);
  }, [debouncedQuery, ncmData]);

  // Destacar termo de busca no texto
  const highlightText = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, []);

  const handleSelect = useCallback((code: string) => {
    onSelect(code);
    onClose();
  }, [onSelect, onClose]);

  // Navegação por teclado
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelect(searchResults[selectedIndex].codigo);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, searchResults, selectedIndex, onClose, handleSelect]);

  // Scroll para item selecionado
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      clearNCMCache();
      const data = await loadNCMData(true, fetchNcmFromBackend);
      setNcmData(data);
      toast.success('Dados atualizados com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar dados:', err);
      toast.error('Erro ao atualizar dados. Tente novamente.');
      setError(err.message || 'Erro ao atualizar dados');
    } finally {
      setIsRefreshing(false);
    }
  };

  const cacheInfo = useMemo(() => getCacheInfo(), [ncmData]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-foreground">Buscar NCM</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Pesquise por código ou descrição do NCM
              </DialogDescription>
            </div>
            {cacheInfo.exists && (
              <div className="text-xs text-muted-foreground">
                {cacheInfo.itemCount.toLocaleString()} códigos disponíveis
                {cacheInfo.age > 0 && ` • Cache: ${cacheInfo.age}h`}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Digite o código NCM (8 dígitos) ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 text-foreground"
              disabled={loading}
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-1 text-destructive"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  Tentar recarregar
                </Button>
              </div>
            </div>
          )}

          {/* Loading inicial */}
          {loading && ncmData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Carregando códigos NCM...</p>
            </div>
          )}

          {/* Lista de resultados */}
          {!loading && ncmData.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  {debouncedQuery.trim()
                    ? `${searchResults.length.toLocaleString()} resultado${searchResults.length !== 1 ? 's' : ''} encontrado${searchResults.length !== 1 ? 's' : ''}`
                    : 'Principais códigos NCM'}
                </p>
                {searchResults.length >= MAX_DISPLAY_RESULTS && (
                  <p className="text-xs text-muted-foreground">
                    Mostrando primeiros {MAX_DISPLAY_RESULTS.toLocaleString()} resultados
                  </p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-7"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              <ScrollArea className="flex-1 border rounded-md">
                <div ref={resultsRef} className="divide-y p-1">
                  {searchResults.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum resultado encontrado para &quot;{debouncedQuery}&quot;
                      </p>
                    </div>
                  ) : (
                    searchResults.map((item, index) => (
                      <button
                        key={`${item.codigo}-${index}`}
                        type="button"
                        onClick={() => handleSelect(item.codigo)}
                        className={`w-full text-left p-3 hover:bg-accent transition-colors ${
                          index === selectedIndex ? 'bg-accent ring-2 ring-ring' : ''
                        }`}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-sm font-mono font-semibold text-primary">
                                {item.codigo}
                              </code>
                              {item.ex && (
                                <span className="text-xs text-muted-foreground">
                                  Ex: {item.ex}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground break-words">
                              {highlightText(item.descricao, debouncedQuery)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Instruções */}
          <div className="text-xs text-muted-foreground border-t pt-3">
            <p>
              <strong>Dica:</strong> Use as setas ↑↓ para navegar, Enter para selecionar, Esc para fechar
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
