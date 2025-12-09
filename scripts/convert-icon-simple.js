const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Script para converter logo.png para icon.ico usando sharp
const sourcePath = path.join(__dirname, '../public/logo.png');
const destPath = path.join(__dirname, '../build/icon.ico');

// Criar diretório build se não existir
const buildDir = path.dirname(destPath);
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Converter PNG para ICO usando sharp
async function convertIcon() {
  try {
    if (!fs.existsSync(sourcePath)) {
      console.warn('⚠ Aviso: logo.png não encontrado em', sourcePath);
      console.log('⚠ Continuando sem conversão de ícone - electron-builder usará ícone padrão');
      return;
    }

    console.log('Convertendo logo.png para icon.ico...');
    
    // Tentar usar png-to-ico primeiro
    try {
      const pngToIco = require('png-to-ico');
      
      // Criar múltiplos tamanhos para o ICO incluindo todos os tamanhos do Windows
      // 16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256
      const sizes = [16, 24, 32, 48, 64, 128, 256];
      const images = [];
      
      for (const size of sizes) {
        const buffer = await sharp(sourcePath)
          .resize(size, size, { 
            fit: 'contain', 
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            kernel: sharp.kernel.lanczos3
          })
          .png({ 
            compressionLevel: 9,
            quality: 100
          })
          .toBuffer();
        images.push(buffer);
      }
      
      // Converter para ICO usando png-to-ico
      const ico = await pngToIco(images);
      fs.writeFileSync(destPath, ico);
      console.log('✓ Ícone convertido com sucesso para build/icon.ico');
      console.log('✓ Tamanhos incluídos:', sizes.join('x, ') + 'x');
    } catch (icoError) {
      console.log('⚠ png-to-ico falhou, usando sharp para criar ICO de 256x256...');
      // Fallback: criar um PNG de 256x256 e renomear para .ico
      // Electron Builder pode processar isso
      await sharp(sourcePath)
        .resize(256, 256, { 
          fit: 'contain', 
          background: { r: 0, g: 0, b: 0, alpha: 0 },
          kernel: sharp.kernel.lanczos3
        })
        .png({ 
          compressionLevel: 9,
          quality: 100
        })
        .toFile(destPath);
      console.log('✓ Ícone 256x256 criado em build/icon.ico');
    }
  } catch (error) {
    console.warn('⚠ Aviso: Erro ao converter ícone:', error.message);
    console.log('⚠ Continuando sem ícone customizado - electron-builder converterá automaticamente do PNG');
    // Não bloquear o build se a conversão falhar
  }
}

convertIcon();

