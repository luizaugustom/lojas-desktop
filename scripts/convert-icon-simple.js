const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Script para converter logo.png para icon.ico usando png-to-ico
const sourcePath = path.join(__dirname, '../public/logo.png');
const destPath = path.join(__dirname, '../build/icon.ico');
const tempDir = path.join(__dirname, '../build/temp-icons');

// Criar diretórios se não existirem
const buildDir = path.dirname(destPath);
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Converter PNG para ICO
async function convertIcon() {
  try {
    if (!fs.existsSync(sourcePath)) {
      console.warn('⚠ Aviso: logo.png não encontrado em', sourcePath);
      console.log('⚠ Continuando sem conversão de ícone - electron-builder usará ícone padrão');
      return;
    }

    console.log('Convertendo logo.png para icon.ico...');
    
    const pngToIco = require('png-to-ico').default || require('png-to-ico');
    
    // Criar diretório temporário
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Criar múltiplos tamanhos para o ICO
    // Windows precisa de 16x16, 32x32, 48x48, e 256x256
    const sizes = [16, 32, 48, 256];
    const tempFiles = [];
    
    console.log('Gerando PNGs nos tamanhos:', sizes.join('x, ') + 'x...');
    
    for (const size of sizes) {
      const tempFile = path.join(tempDir, `icon-${size}.png`);
      await sharp(sourcePath)
        .resize(size, size, { 
          fit: 'contain', 
          background: { r: 0, g: 0, b: 0, alpha: 0 },
          kernel: sharp.kernel.lanczos3
        })
        .png()
        .toFile(tempFile);
      tempFiles.push(tempFile);
    }
    
    console.log('Convertendo PNGs para formato ICO...');
    
    // Converter array de arquivos PNG para ICO
    const icoBuffer = await pngToIco(tempFiles);
    
    // Salvar o arquivo ICO
    fs.writeFileSync(destPath, icoBuffer);
    
    // Limpar arquivos temporários
    for (const file of tempFiles) {
      fs.unlinkSync(file);
    }
    fs.rmdirSync(tempDir);
    
    console.log('✓ Ícone convertido com sucesso para build/icon.ico');
    console.log('✓ Tamanhos incluídos:', sizes.join('x, ') + 'x');
    console.log('✓ Tamanho do arquivo:', (icoBuffer.length / 1024).toFixed(2), 'KB');
  } catch (error) {
    console.error('✗ Erro ao converter ícone:', error.message);
    console.error('Stack:', error.stack);
    
    // Limpar diretório temporário se existir
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
      fs.rmdirSync(tempDir);
    }
    
    process.exit(1); // Falhar o build se não conseguir criar o ícone
  }
}

convertIcon();

