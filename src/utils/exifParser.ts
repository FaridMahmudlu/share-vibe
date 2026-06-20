export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: string;
  hasGps?: boolean;
}

/**
 * [NV-04] Vanilla JS EXIF Parser
 * Reads first 128KB of JPEG to extract Make, Model, DateTime, and detect GPS metadata.
 */
export async function parseExif(file: File): Promise<ExifData | null> {
  return new Promise((resolve) => {
    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) {
        resolve(null);
        return;
      }
      const view = new DataView(buffer);
      if (view.byteLength < 2 || view.getUint16(0, false) !== 0xFFD8) {
        resolve(null); // Not a JPEG
        return;
      }
      
      let offset = 2;
      const length = view.byteLength;
      let app1Offset = -1;

      while (offset < length - 4) {
        const marker = view.getUint16(offset, false);
        if (marker === 0xFFE1) {
          app1Offset = offset + 4;
          break;
        }
        offset += 2 + view.getUint16(offset + 2, false);
      }

      if (app1Offset === -1 || app1Offset + 6 > length) {
        resolve(null);
        return;
      }

      const header = view.getUint32(app1Offset, false);
      if (header !== 0x45786966) { // "Exif"
        resolve(null);
        return;
      }

      const tiffOffset = app1Offset + 6;
      if (tiffOffset + 8 > length) {
        resolve(null);
        return;
      }

      const isLittle = view.getUint16(tiffOffset, false) === 0x4949;
      if (view.getUint16(tiffOffset + 2, isLittle) !== 0x002A) {
        resolve(null);
        return;
      }

      const firstIFDOffset = view.getUint32(tiffOffset + 4, isLittle);
      let ifdOffset = tiffOffset + firstIFDOffset;

      const exifData: ExifData = { hasGps: false };

      try {
        if (ifdOffset + 2 > length) {
          resolve(null);
          return;
        }
        const numEntries = view.getUint16(ifdOffset, isLittle);
        ifdOffset += 2;

        for (let i = 0; i < numEntries; i++) {
          if (ifdOffset + 12 > length) break;
          const tag = view.getUint16(ifdOffset, isLittle);
          const count = view.getUint32(ifdOffset + 4, isLittle);
          const valOffsetValue = view.getUint32(ifdOffset + 8, isLittle);
          const valueOffset = valOffsetValue + tiffOffset;

          if (valueOffset + count <= length && valueOffset >= 0) {
            // Make = 271, Model = 272, DateTime = 306, GPSTag = 34853
            if (tag === 271) {
              exifData.make = readString(view, valueOffset, count);
            } else if (tag === 272) {
              exifData.model = readString(view, valueOffset, count);
            } else if (tag === 306) {
              exifData.dateTime = readString(view, valueOffset, count);
            } else if (tag === 34853) {
              exifData.hasGps = true;
            }
          }

          ifdOffset += 12;
        }
      } catch (err) {
        console.warn('Exif parsing failed:', err);
      }

      resolve(exifData);
    };

    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file.slice(0, 128 * 1024)); // Only read first 128KB
  });
}

function readString(view: DataView, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    const char = view.getUint8(offset + i);
    if (char === 0) break;
    str += String.fromCharCode(char);
  }
  return str.trim();
}
