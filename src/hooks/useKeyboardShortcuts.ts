import { useEffect, useRef, useCallback } from 'react';

export type KeyboardContext = 'sales' | 'checkout' | 'print' | 'cart';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  preventDefault?: boolean;
  context?: KeyboardContext[];
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  context?: KeyboardContext;
  ignoreInputs?: boolean;
}

/**
 * Hook para gerenciar atalhos de teclado
 * 
 * @param shortcuts - Array de atalhos a serem registrados
 * @param enabled - Se os atalhos estão habilitados
 * @param context - Contexto atual (sales, checkout, print, cart)
 * @param ignoreInputs - Se deve ignorar atalhos quando focado em inputs
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  context,
  ignoreInputs = true,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);
  const enabledRef = useRef(enabled);
  const contextRef = useRef(context);

  // Atualizar refs quando props mudarem
  useEffect(() => {
    shortcutsRef.current = shortcuts;
    enabledRef.current = enabled;
    contextRef.current = context;
  }, [shortcuts, enabled, context]);

  const isInputElement = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    
    const tagName = target.tagName.toLowerCase();
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    const isContentEditable = target.isContentEditable;
    const isDialogInput = target.closest('[role="dialog"]') !== null;
    
    // Se está em um input e ignoreInputs é true, não processar atalhos
    // Exceto se for um input específico que queremos permitir (ex: busca)
    if (isInput && ignoreInputs) {
      const input = target as HTMLInputElement;
      // Permitir alguns atalhos mesmo em inputs específicos (ex: Ctrl+B para busca)
      const allowedInInput = input.type === 'search' || input.placeholder?.toLowerCase().includes('buscar');
      return !allowedInInput;
    }
    
    return isContentEditable;
  }, [ignoreInputs]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver digitando em input (exceto inputs permitidos)
      if (isInputElement(e.target)) {
        // Verificar se é um atalho que deve funcionar mesmo em inputs
        const isSpecialShortcut = e.ctrlKey || e.altKey || e.key === 'Escape' || e.key === 'Enter';
        if (!isSpecialShortcut) {
          return;
        }
      }

      // Verificar cada atalho
      for (const shortcut of shortcutsRef.current) {
        const matchesKey = shortcut.key === e.key || 
                          (shortcut.key === 'Enter' && e.key === 'Enter') ||
                          (shortcut.key === 'Escape' && e.key === 'Escape');
        
        if (!matchesKey) continue;

        const matchesCtrl = shortcut.ctrl === undefined ? true : shortcut.ctrl === e.ctrlKey;
        const matchesShift = shortcut.shift === undefined ? true : shortcut.shift === e.shiftKey;
        const matchesAlt = shortcut.alt === undefined ? true : shortcut.alt === e.altKey;

        if (matchesCtrl && matchesShift && matchesAlt) {
          // Verificar contexto se especificado
          if (shortcut.context && contextRef.current) {
            if (!shortcut.context.includes(contextRef.current)) {
              continue;
            }
          }

          if (shortcut.preventDefault !== false) {
            e.preventDefault();
            e.stopPropagation();
          }

          shortcut.handler();
          break; // Processar apenas o primeiro atalho que corresponder
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, isInputElement]);
}

/**
 * Hook auxiliar para detectar se uma tecla específica está sendo pressionada
 */
export function useKeyPress(targetKey: string, handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === targetKey) {
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetKey, handler, enabled]);
}
