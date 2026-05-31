/**
 * Teste envio RAW direto na porta serial COM (sem spooler Windows).
 * Uso: node scripts/test-qrcode-serial.js [COM7] [9600|115200]
 */

const { SerialPort } = require('serialport');

const PORT = (process.argv[2] || 'COM7').replace(/:$/, '');
const BAUD = Number(process.argv[3] || 9600);
const TEST_URL =
  'https://www.nfce.fazenda.gov.br/portal/consulta.aspx?p=35260512345678901234567890123456789012345678901234|2|1|1|12345678901234567890123456789012345678901234|56565656565656565656565656565656565656565656';

function buildReceipt() {
  const data = Buffer.from(TEST_URL, 'ascii');
  const moduleSize = 3;
  const parts = [
    Buffer.from([0x1b, 0x40]), // reset
    Buffer.from('\n     TESTE SERIAL DIRETO\n================================\n\n', 'ascii'),
    Buffer.from([0x1b, 0x61, 0x01]), // center
    Buffer.from([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize]),
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]),
  ];
  const storeLen = data.length + 3;
  const storeCmd = Buffer.alloc(8 + data.length);
  storeCmd[0] = 0x1d;
  storeCmd[1] = 0x28;
  storeCmd[2] = 0x6b;
  storeCmd[3] = storeLen & 0xff;
  storeCmd[4] = (storeLen >> 8) & 0xff;
  storeCmd[5] = 0x31;
  storeCmd[6] = 0x50;
  storeCmd[7] = 0x30;
  data.copy(storeCmd, 8);
  parts.push(storeCmd);
  parts.push(Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]));
  parts.push(Buffer.from([0x1b, 0x61, 0x00]));
  parts.push(Buffer.from('\n\nQR pequeno acima.\n\n\n', 'ascii'));
  parts.push(Buffer.from([0x1d, 0x56, 0x00]));
  return Buffer.concat(parts);
}

function openAndWrite(path, baudRate, payload) {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path,
      baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      autoOpen: false,
    });

    port.open((err) => {
      if (err) {
        reject(err);
        return;
      }
      port.write(payload, (writeErr) => {
        if (writeErr) {
          port.close(() => reject(writeErr));
          return;
        }
        port.drain((drainErr) => {
          port.close((closeErr) => {
            if (drainErr) reject(drainErr);
            else if (closeErr) reject(closeErr);
            else resolve();
          });
        });
      });
    });
  });
}

async function main() {
  const paths = [`\\\\.\\${PORT}`, PORT];
  const payload = buildReceipt();
  console.log(`Porta: ${PORT}, baud: ${BAUD}, bytes: ${payload.length}`);

  let lastError = null;
  for (const path of paths) {
    try {
      console.log(`Tentando ${path}...`);
      await openAndWrite(path, BAUD, payload);
      console.log('OK — cupom enviado via serial direto.');
      return;
    } catch (e) {
      lastError = e;
      console.warn(`Falhou (${path}): ${e.message}`);
    }
  }

  if (BAUD === 9600) {
    console.log('\nTentando 115200 baud...');
    for (const path of paths) {
      try {
        await openAndWrite(path, 115200, payload);
        console.log('OK com 115200 baud.');
        return;
      } catch (e) {
        lastError = e;
      }
    }
  }

  throw lastError || new Error('Nao foi possivel abrir a porta serial');
}

main().catch((e) => {
  console.error('Erro:', e.message);
  process.exit(1);
});
