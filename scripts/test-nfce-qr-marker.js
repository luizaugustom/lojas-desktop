/**
 * Testa marcador <<NFC_E_QR:url>> via serial direto (mesmo fluxo do desktop).
 */
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);
const PORT = (process.argv[2] || 'COM7').replace(/:$/, '');
const TEST_URL =
  'https://www.nfce.fazenda.gov.br/portal/consulta.aspx?p=35260512345678901234567890123456789012345678901234|2|1|1|12345678901234567890123456789012345678901234|56565656565656565656565656565656565656565656';

function buildNativeQrEscPos(url) {
  const data = Buffer.from(url, 'ascii');
  const moduleSize = 3;
  const commands = [
    Buffer.from([0x1b, 0x61, 0x01]),
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
  commands.push(storeCmd);
  commands.push(Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]));
  commands.push(Buffer.from([0x1b, 0x61, 0x00, 0x0a]));
  return Buffer.concat(commands);
}

function parseContent(content) {
  const regex = /<<(?:ESC_POS_BINARY:([A-Za-z0-9+/=]+)|NFC_E_QR:([^>\n]+))>>/g;
  const buffers = [Buffer.from([0x1b, 0x40])];
  let last = 0;
  let m;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) buffers.push(Buffer.from(content.slice(last, m.index), 'utf8'));
    if (m[1]) buffers.push(Buffer.from(m[1], 'base64'));
    else if (m[2]) buffers.push(buildNativeQrEscPos(m[2]));
    last = m.index + m[0].length;
  }
  if (last < content.length) buffers.push(Buffer.from(content.slice(last), 'utf8'));
  buffers.push(Buffer.from('\n\n\n', 'utf8'), Buffer.from([0x1d, 0x56, 0x00]));
  return Buffer.concat(buffers);
}

async function main() {
  const nfce = [
    '        LOJA TESTE NFC-e',
    '================================',
    'OU UTILIZE O QR CODE ABAIXO:',
    '',
    `<<NFC_E_QR:${TEST_URL}>>`,
    '',
    'VALOR TOTAL: R$ 10,00',
  ].join('\n');

  const payload = parseContent(nfce);
  const tempFile = path.join(os.tmpdir(), `nfce-qr-${Date.now()}.bin`);
  fs.writeFileSync(tempFile, payload);

  const ps = [
    `$portName='${PORT}'`,
    `$filePath='${tempFile.replace(/\\/g, '/').replace(/'/g, "''")}'`,
    '$bytes=[System.IO.File]::ReadAllBytes($filePath)',
    '$sp=New-Object System.IO.Ports.SerialPort $portName,9600,([System.IO.Ports.Parity]::None),8,([System.IO.Ports.StopBits]::One)',
    'try { $sp.Open(); $sp.Write($bytes,0,$bytes.Length); Start-Sleep -Milliseconds 300 } finally { if ($sp.IsOpen) { $sp.Close() }; $sp.Dispose() }',
  ].join('; ');

  await execAsync(`powershell.exe -NoProfile -NonInteractive -Command "${ps}"`);
  fs.unlinkSync(tempFile);
  console.log(`Cupom com <<NFC_E_QR>> enviado em ${PORT}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
