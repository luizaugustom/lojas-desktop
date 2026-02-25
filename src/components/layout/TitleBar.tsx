import { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      const checkMaximized = async () => {
        if (window.electronAPI?.window) {
          const maximized = await window.electronAPI.window.isMaximized();
          if (typeof maximized === 'boolean') {
            setIsMaximized(maximized);
          }
        }
      };
      checkMaximized();
    }
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.window.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.window.maximize();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.window.close();
    }
  };

  if (!window.electronAPI) {
    return null; // Não mostrar em navegador
  }

  return (
    <div className="title-bar">
      <div className="title-bar-title">
        <span className="text-sm font-medium">Montshop Desktop</span>
      </div>
      <div className="title-bar-controls">
        <button
          className="title-bar-button"
          onClick={handleMinimize}
          aria-label="Minimizar"
        >
          <Minus size={16} />
        </button>
        <button
          className="title-bar-button"
          onClick={handleMaximize}
          aria-label={isMaximized ? 'Restaurar' : 'Maximizar'}
        >
          <Square size={14} />
        </button>
        <button
          className="title-bar-button close"
          onClick={handleClose}
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

