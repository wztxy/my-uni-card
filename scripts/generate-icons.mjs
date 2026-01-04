import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const assetsDir = path.join(root, 'assets');

const svgPath = path.join(assetsDir, 'icon.svg');
const pngPath = path.join(assetsDir, 'icon.png');
const icoPath = path.join(assetsDir, 'icon.ico');

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await fileExists(svgPath))) {
    throw new Error(`Missing ${svgPath}`);
  }

  const svg = await fs.readFile(svgPath);

  const masterPng = await sharp(svg)
    .resize(1024, 1024)
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(pngPath, masterPng);

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = await Promise.all(
    sizes.map((s) => sharp(masterPng).resize(s, s).png().toBuffer())
  );

  const ico = await pngToIco(pngs);
  await fs.writeFile(icoPath, ico);

  console.log('Generated icons:');
  console.log(' - assets/icon.png');
  console.log(' - assets/icon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
