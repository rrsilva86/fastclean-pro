function crc32(buffer: Buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function dosDateTime(date: Date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = Math.max(date.getFullYear() - 1980, 0);
  return { date: (year << 9) | (month << 5) | day, time };
}

function writeUInt32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function writeUInt16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

export function createZip(files: Record<string, string | Buffer>) {
  const createdAt = new Date();
  const centralDirectory: Buffer[] = [];
  const localFiles: Buffer[] = [];
  let offset = 0;

  for (const [filename, content] of Object.entries(files)) {
    const name = Buffer.from(filename);
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const checksum = crc32(data);
    const { date, time } = dosDateTime(createdAt);

    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(time),
      writeUInt16(date),
      writeUInt32(checksum),
      writeUInt32(data.length),
      writeUInt32(data.length),
      writeUInt16(name.length),
      writeUInt16(0),
      name
    ]);

    localFiles.push(localHeader, data);

    centralDirectory.push(Buffer.concat([
      writeUInt32(0x02014b50),
      writeUInt16(20),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(time),
      writeUInt16(date),
      writeUInt32(checksum),
      writeUInt32(data.length),
      writeUInt32(data.length),
      writeUInt16(name.length),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(0),
      writeUInt32(offset),
      name
    ]));

    offset += localHeader.length + data.length;
  }

  const centralStart = offset;
  const central = Buffer.concat(centralDirectory);
  const end = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(centralDirectory.length),
    writeUInt16(centralDirectory.length),
    writeUInt32(central.length),
    writeUInt32(centralStart),
    writeUInt16(0)
  ]);

  return Buffer.concat([...localFiles, central, end]);
}
