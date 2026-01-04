import QRCode from 'qrcode';
import path from 'node:path';

const root = process.cwd();
const outputPath = path.join(root, 'assets', 'github-qr.png');

const GITHUB_URL = 'https://github.com/wztxy/MyCampusCard';

async function main() {
  await QRCode.toFile(outputPath, GITHUB_URL, {
    width: 200,
    margin: 1,
    color: {
      dark: '#1d1d1f',
      light: '#ffffff'
    }
  });

  console.log('Generated QR code:');
  console.log(' - assets/github-qr.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
