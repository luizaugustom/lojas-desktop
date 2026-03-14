import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { logger } from '@/lib/logger';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          color: 'red', 
          fontFamily: 'monospace',
          background: '#fff',
          minHeight: '100vh'
        }}>
          <h1>Erro na aplicação</h1>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

// Tratamento de erros globais
window.addEventListener('error', (event) => {
  logger.error('Erro global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Promise rejeitada:', event.reason);
});

logger.log('main.tsx carregado');
logger.log('Document ready state:', document.readyState);

const rootElement = document.getElementById('root');
logger.log('Root element:', rootElement);

if (!rootElement) {
  logger.error('Elemento root não encontrado!');
  throw new Error('Elemento root não encontrado');
}

logger.log('Iniciando renderização do React...');

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  logger.log('React renderizado com sucesso');
} catch (error) {
  logger.error('Erro ao renderizar React:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace; background: #fff; min-height: 100vh">
      <h1>Erro ao renderizar React</h1>
      <pre>${error}</pre>
    </div>
  `;
}

