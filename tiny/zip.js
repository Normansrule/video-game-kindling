// tiny/zip.js
// WHAT: Write a .zip file in plain JavaScript: CRC-32 checksums, file headers and
//       the central directory at the end.
// WHY:  js13kGames measures the ZIPPED size, so the packer must make a real zip
//       to tell you the real number. No dependencies: Node passes in its built-in
//       deflate (zlib.deflateRawSync); without one, files are stored uncompressed.
// DOC:  tiny/README.md

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

// CRC-32, the checksum every zip stores for each file. crc32("123456789") is 0xcbf43926.
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// files: [{ name: "index.html", data: Uint8Array }]
// deflateRaw: optional function(Uint8Array) -> Uint8Array (raw DEFLATE, no header).
// Returns the zip as a Uint8Array. Dates are fixed (1 Jan 1980), so the same files
// always give the same bytes.
export function makeZip(files, deflateRaw = null) {
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    let method = 0;
    let body = file.data;
    if (deflateRaw) {
      const packed = deflateRaw(file.data);
      if (packed.length < file.data.length) {
        method = 8;
        body = packed;
      }
    }
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);   // "PK\3\4": a file starts here
    local.setUint16(4, 20, true);           // version needed: 2.0
    local.setUint16(8, method, true);       // 0 = stored, 8 = deflate
    local.setUint16(12, 0x21, true);        // date: 1980-01-01
    local.setUint32(14, crc, true);
    local.setUint32(18, body.length, true);
    local.setUint32(22, file.data.length, true);
    local.setUint16(26, name.length, true);
    locals.push(new Uint8Array(local.buffer), name, body);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true); // "PK\1\2": directory entry
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(10, method, true);
    central.setUint16(14, 0x21, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, body.length, true);
    central.setUint32(24, file.data.length, true);
    central.setUint16(28, name.length, true);
    central.setUint32(42, offset, true);    // where the local header is
    centrals.push(new Uint8Array(central.buffer), name);

    offset += 30 + name.length + body.length;
  }

  const directorySize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);       // "PK\5\6": end of central directory
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, directorySize, true);
  end.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
  const zip = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    zip.set(part, at);
    at += part.length;
  }
  return zip;
}
