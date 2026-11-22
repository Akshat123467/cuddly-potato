import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ZIP_NAME = 'Billionaire-Watch-SEO-Optimized.zip';
const OUT_DIR = '_site';

if (!fs.existsSync(ZIP_NAME)) {
  console.error(`ERROR: ${ZIP_NAME} not found in repository root.`);
  process.exit(1);
}

const buf = fs.readFileSync(ZIP_NAME);

// Locate End of Central Directory (0x06054b50)
let eocdOffset = -1;
const minOffset = Math.max(0, buf.length - 65557);
for (let i = buf.length - 22; i >= minOffset; i--) {
  if (buf.readUInt32LE(i) === 0x06054b50) {
    eocdOffset = i;
    break;
  }
}

if (eocdOffset === -1) {
  console.error('ERROR: Invalid ZIP file (EOCD signature missing).');
  process.exit(1);
}

const totalEntries = buf.readUInt16LE(eocdOffset + 10);
const cdOffset = buf.readUInt32LE(eocdOffset + 16);

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

let pos = cdOffset;
let extracted = 0;

for (let idx = 0; idx < totalEntries; idx++) {
  if (buf.readUInt32LE(pos) !== 0x02014b50) {
    console.error(`ERROR: Corrupt Central Directory header at offset ${pos}.`);
    process.exit(1);
  }

  const method = buf.readUInt16LE(pos + 10);
  const compSize = buf.readUInt32LE(pos + 20);
  const nameLen = buf.readUInt16LE(pos + 28);
  const extraLen = buf.readUInt16LE(pos + 30);
  const commentLen = buf.readUInt16LE(pos + 32);
  const localHeaderOffset = buf.readUInt32LE(pos + 42);
  const relPath = buf.toString('utf8', pos + 46, pos + 46 + nameLen);

  pos += 46 + nameLen + extraLen + commentLen;

  // Prevent path traversal & skip directory entries
  const normalized = path.posix.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
  if (!normalized || normalized.endsWith('/')) continue;

  if (buf.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
    console.error(`ERROR: Corrupt Local File header for ${relPath}.`);
    process.exit(1);
  }

  const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
  const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
  const compressed = buf.subarray(dataStart, dataStart + compSize);

  let content;
  if (method === 0) {
    content = compressed;
  } else if (method === 8) {
    content = zlib.inflateRawSync(compressed);
  } else {
    console.error(`ERROR: Unsupported compression method ${method} for ${relPath}.`);
    process.exit(1);
  }

  const dest = path.join(OUT_DIR, normalized);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
  extracted++;
}

console.log(`Unpacked ${extracted} files from ${ZIP_NAME} into ${OUT_DIR}/`);
