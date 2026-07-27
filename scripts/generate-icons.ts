import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "scripts", "brand-mark.svg");

async function main() {
  const svg = await sharp(source).png();

  await mkdir(path.join(root, "public", "icons"), { recursive: true });

  const targets: { file: string; size: number }[] = [
    { file: "public/icons/icon-192.png", size: 192 },
    { file: "public/icons/icon-512.png", size: 512 },
    { file: "public/icons/apple-touch-icon.png", size: 180 },
    { file: "src/app/icon.png", size: 512 },
    { file: "src/app/apple-icon.png", size: 180 },
  ];

  for (const { file, size } of targets) {
    const outPath = path.join(root, file);
    await sharp(source).resize(size, size).png().toFile(outPath);
    console.log(`generated ${file} (${size}x${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
