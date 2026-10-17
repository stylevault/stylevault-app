import fs from 'fs';
import sharp from 'sharp';

async function run() {
  const sourcePath = 'public/assets/img/stylevault-mark.png';

  // 1. Get trimmed source buffer so the emblem fills the icon canvas crisply
  const trimmed = await sharp(sourcePath)
    .trim()
    .toBuffer();

  // Helper to generate resized PNG
  async function makePng(size, outPath) {
    const buf = await sharp(trimmed)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    fs.writeFileSync(outPath, buf);
    console.log(`Generated ${outPath} (${size}x${size}, ${buf.length} bytes)`);
    return buf;
  }

  // 2. Generate PNG icons
  const png16 = await makePng(16, 'public/assets/img/icon-16.png');
  const png32 = await makePng(32, 'public/assets/img/icon.png');
  await makePng(32, 'public/assets/img/icon-32.png');
  const png48 = await makePng(48, 'public/assets/img/icon-48.png');
  await makePng(180, 'public/assets/img/apple-touch-icon.png');
  await makePng(192, 'public/assets/img/icon-192.png');
  await makePng(512, 'public/assets/img/icon-512.png');

  // 3. Generate multi-resolution public/favicon.ico (16, 32, 48)
  const icoSizes = [
    { size: 16, buffer: png16 },
    { size: 32, buffer: png32 },
    { size: 48, buffer: png48 }
  ];

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type 1 = icon
  header.writeUInt16LE(icoSizes.length, 4); // count

  let offset = 6 + (16 * icoSizes.length);
  const dirEntries = [];

  for (const item of icoSizes) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.size, 0); // width
    entry.writeUInt8(item.size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    dirEntries.push(entry);
    offset += item.buffer.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...icoSizes.map(i => i.buffer)
  ]);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  console.log(`Generated public/favicon.ico (${icoBuffer.length} bytes)`);

  // 4. Generate SVG icon
  const svgPng = await sharp(trimmed)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const b64 = svgPng.toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <image href="data:image/png;base64,${b64}" width="64" height="64" preserveAspectRatio="xMidYMid meet"/>
</svg>\n`;
  fs.writeFileSync('public/assets/img/icon.svg', svg);
  console.log(`Generated public/assets/img/icon.svg (${svg.length} bytes)`);
}

run().catch(console.error);
