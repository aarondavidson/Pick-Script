import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

/** Minimal valid PNG of one flat colour (no image library needed). */
function png(width: number, height: number, rgb: [number, number, number]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3)]);
  for (let x = 0; x < width; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Write a hosted pack (small pack.json + assets/ folder) into the built site,
 * the way an author would upload one. Served by the preview server at
 * /e2e-hosted/pack.json.
 */
export default function globalSetup() {
  const dir = join(process.cwd(), "dist", "e2e-hosted");
  mkdirSync(join(dir, "assets"), { recursive: true });
  writeFileSync(join(dir, "assets", "hall.png"), png(320, 180, [40, 90, 140]));
  writeFileSync(join(dir, "assets", "vault.png"), png(320, 180, [140, 60, 40]));
  const pack = {
    schemaVersion: 1,
    id: "e2e-hosted",
    title: "Hosted Pack",
    version: "1.0.0",
    startRoom: "hall",
    verbMode: "simple",
    rooms: {
      hall: {
        id: "hall",
        name: "Hall",
        description: "Art comes from the assets folder.",
        image: "assets/hall.png",
        hotspots: [
          {
            id: "plaque",
            name: "Plaque",
            x: 40,
            y: 35,
            width: 20,
            height: 25,
            kind: "interact",
            lookText: "Hosted packs load their art from files.",
          },
        ],
      },
      vault: {
        id: "vault",
        name: "Vault",
        description: "Second room.",
        image: "assets/vault.png",
        hotspots: [],
      },
    },
    links: [
      { from: "hall", to: "vault", direction: "east", fromLabel: "Vault", toLabel: "Hall" },
    ],
  };
  writeFileSync(join(dir, "pack.json"), JSON.stringify(pack));
}
