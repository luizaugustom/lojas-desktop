const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Pasta release para limpar
const releaseDir = path.join(__dirname, '../release');

function cleanRelease() {
  try {
    if (fs.existsSync(releaseDir)) {
      console.log('Limpando pasta release...');
      
      // Tentar fechar processos do app que possam estar usando os arquivos
      try {
        if (process.platform === 'win32') {
          // Tentar matar processos do Montshop/Electron
          try {
            execSync('taskkill /F /IM "Montshop Desktop.exe" 2>nul', { stdio: 'ignore' });
          } catch {}
          try {
            execSync('taskkill /F /FI "WINDOWTITLE eq Montshop*" 2>nul', { stdio: 'ignore' });
          } catch {}
        }
      } catch (error) {
        // Ignorar erros ao tentar matar processos
      }

      // Remover a pasta (com retry)
      try {
        if (fs.rmSync) {
          // Node 14.14.0+
          fs.rmSync(releaseDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
        } else {
          // Fallback para Node mais antigo
          const rimraf = require('rimraf');
          rimraf.sync(releaseDir);
        }
        console.log('✓ Pasta release limpa');
      } catch (error) {
        console.warn('⚠ Aviso: Não foi possível remover alguns arquivos.');
        console.warn('  Feche o aplicativo Montshop Desktop e tente novamente.');
        console.warn('  Erro:', error.message);
        // Não falhar o build, apenas avisar
      }
    } else {
      console.log('✓ Pasta release não existe, nada para limpar');
    }
  } catch (error) {
    console.warn('⚠ Aviso ao limpar pasta release:', error.message);
    // Não falhar o build
  }
}

cleanRelease();

