import { create } from 'zustand';
import { applyCompanyColor } from '@/lib/colorUtils';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  sidebarHidden: boolean;
  theme: 'light' | 'dark';
  companyColor: string | null;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  toggleSidebarHidden: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarHidden: (hidden: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setCompanyColor: (color: string | null) => void;
  updatePrimaryColor: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: false,
  sidebarCollapsed: true,
  sidebarHidden: false,
  theme: 'light',
  companyColor: null,
  
  toggleSidebar: () => {
    set({ sidebarOpen: !get().sidebarOpen });
  },

  toggleSidebarCollapsed: () => {
    set({ sidebarCollapsed: !get().sidebarCollapsed });
  },

  toggleSidebarHidden: () => {
    set({ sidebarHidden: !get().sidebarHidden });
  },
  
  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  setSidebarHidden: (hidden) => {
    set({ sidebarHidden: hidden });
  },
  
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: newTheme });
    
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      localStorage.setItem('theme', newTheme);
      // Reaplica a cor da empresa após mudar o tema para garantir que não seja sobrescrita
      get().updatePrimaryColor();
    }
  },
  
  setTheme: (theme) => {
    set({ theme });
    
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      localStorage.setItem('theme', theme);
      // Reaplica a cor da empresa após mudar o tema para garantir que não seja sobrescrita
      get().updatePrimaryColor();
    }
  },

  setCompanyColor: (color) => {
    set({ companyColor: color });
    get().updatePrimaryColor();
  },

  updatePrimaryColor: () => {
    if (typeof window !== 'undefined') {
      const { companyColor } = get();
      const primaryColor = applyCompanyColor(companyColor);
      
      // Usa um elemento <style> com !important para garantir prioridade máxima sobre estilos do tema
      const styleId = 'company-primary-color-override';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      // Cria uma versão mais escura para o hover da scrollbar
      let scrollbarHover = '221.2 83.2% 45%';
      const hsl = primaryColor.split(' ');
      if (hsl.length === 3) {
        const [h, s, l] = hsl;
        const lValue = parseFloat(l.replace('%', ''));
        const darkerL = Math.max(lValue - 8, 30); // 8% mais escuro, mínimo 30%
        scrollbarHover = `${h} ${s} ${darkerL}%`;
      }
      
      // Define as variáveis CSS com !important para sobrescrever os estilos do tema
      styleElement.textContent = `
        :root {
          --primary: ${primaryColor} !important;
          --scrollbar-color: ${primaryColor} !important;
          --scrollbar-color-hover: ${scrollbarHover} !important;
        }
        .light {
          --primary: ${primaryColor} !important;
        }
        .dark {
          --primary: ${primaryColor} !important;
        }
      `;
      
      // Também define diretamente no elemento para garantir (mesmo sem !important no setProperty)
      document.documentElement.style.setProperty('--primary', primaryColor);
      document.documentElement.style.setProperty('--scrollbar-color', primaryColor);
      document.documentElement.style.setProperty('--scrollbar-color-hover', scrollbarHover);
    }
  },
}));

