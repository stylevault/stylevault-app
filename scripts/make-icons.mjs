import fs from 'fs';
import sharp from 'sharp';

async function run() {
  const png128 = await sharp('public/assets/img/stylevault-mark.png')
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const b64 = png128.toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <image href="data:image/png;base64,${b64}" width="64" height="64" preserveAspectRatio="xMidYMid meet"/>
</svg>\n`;

  fs.writeFileSync('public/assets/img/icon.svg', svg);
  console.log('Updated public/assets/img/icon.svg');
}

run().catch(console.error);

