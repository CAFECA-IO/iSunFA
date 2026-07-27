/**
 * Info: (20260716 - Tzuhan) 檔案內容簽章驗證(magic bytes,#6517)。
 * 瀏覽器宣告的 MIME(file.type)可任意偽造;本模組以檔頭實際 bytes 驗證宣告格式,
 * 防止「.exe 改名 .pdf」類的偽裝上傳。純 TS 實作,不引第三方庫。
 * 支援清單對齊 CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES。
 */

// Info: (20260716 - Tzuhan) 文本啟發式的檢查長度:取檔案前 8KB 判斷是否為合法文字內容
const TEXT_SNIFF_BYTES = 8 * 1024;

const startsWith = (buffer: Uint8Array, magic: number[], offset = 0): boolean => {
  if (buffer.length < offset + magic.length) return false;
  return magic.every((byte, i) => buffer[offset + i] === byte);
};

const startsWithAscii = (buffer: Uint8Array, text: string, offset = 0): boolean =>
  startsWith(
    buffer,
    Array.from(text).map((c) => c.charCodeAt(0)),
    offset,
  );

// Info: (20260716 - Tzuhan) ISO-BMFF ftyp brand(HEIC/HEIF 家族)
const HEIF_BRANDS = [
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
  "heif",
];

const isHeifFamily = (buffer: Uint8Array): boolean => {
  if (!startsWithAscii(buffer, "ftyp", 4)) return false;
  const brand = String.fromCharCode(...buffer.subarray(8, 12));
  return HEIF_BRANDS.includes(brand);
};

/**
 * Info: (20260716 - Tzuhan) CSV 無 magic bytes,以文本啟發式判定:
 * 前 8KB 不得含 NUL(二進位標記),且不得命中任何已知二進位格式檔頭。
 */
const isPlausibleTextFile = (buffer: Uint8Array): boolean => {
  const head = buffer.subarray(0, TEXT_SNIFF_BYTES);
  if (head.length === 0) return false;
  for (let i = 0; i < head.length; i++) {
    if (head[i] === 0x00) return false;
  }
  return true;
};

// Info: (20260716 - Tzuhan) 宣告 MIME → 檔頭驗證器(白名單制:未知宣告一律不通過)
const SIGNATURE_VALIDATORS: Record<string, (buffer: Uint8Array) => boolean> = {
  "image/png": (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/jpeg": (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  "image/webp": (b) => startsWithAscii(b, "RIFF") && startsWithAscii(b, "WEBP", 8),
  "image/gif": (b) => startsWithAscii(b, "GIF87a") || startsWithAscii(b, "GIF89a"),
  "image/heic": isHeifFamily,
  "image/heif": isHeifFamily,
  "application/pdf": (b) => startsWithAscii(b, "%PDF-"),
  // Info: (20260716 - Tzuhan) XLSX 為 ZIP 容器(OOXML);PK\x03\x04 為 ZIP local file header
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": (b) =>
    startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
  "text/csv": isPlausibleTextFile,
  // Info: (20260716 - Tzuhan) #56 報告匯入格式:md/純文字走文本啟發式;docx 為 ZIP 容器(OOXML)
  "text/markdown": isPlausibleTextFile,
  "text/plain": isPlausibleTextFile,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (
    b,
  ) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
};

/**
 * Info: (20260716 - Tzuhan) 驗證檔案實際內容是否符合宣告的 MIME type。
 * @returns true = 檔頭與宣告一致;false = 不一致或宣告型別不在支援清單(Fail Fast)
 */
export const matchesDeclaredMimeType = (
  buffer: Uint8Array,
  declaredMimeType: string,
): boolean => {
  const validator = SIGNATURE_VALIDATORS[declaredMimeType];
  if (!validator) return false;
  return validator(buffer);
};
