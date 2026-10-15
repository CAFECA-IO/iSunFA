import { createHash } from "node:crypto";
import {
  MOPS_DOC_ENCODING,
  PDF_MAGIC_BYTES,
} from "@/constants/company_observatory";

// Info: (20261015 - Luphia) 內容雜湊：判斷「同一份報告」是否需要重建索引的依據
export function sha256Hex(body: Buffer): string {
  return createHash("sha256").update(body).digest("hex");
}

export function isPdfBuffer(body: Buffer): boolean {
  return (
    body.subarray(0, PDF_MAGIC_BYTES.length).toString("ascii") ===
    PDF_MAGIC_BYTES
  );
}

// Info: (20261015 - Luphia) MOPS 電子書頁面是 Big5；Node 內建完整 ICU，TextDecoder 即可解碼
export function decodeBig5(body: Buffer): string {
  return new TextDecoder(MOPS_DOC_ENCODING).decode(body);
}

export function decodeUtf8(body: Buffer): string {
  return body.toString("utf-8");
}

/**
 * Info: (20261015 - Luphia) 解析 JSON 回應；商業司查無資料時回空字串而非 `[]`，視為空陣列。
 */
export function parseJsonBody(body: Buffer): unknown {
  const text = decodeUtf8(body).trim();
  if (text.length === 0) return [];
  return JSON.parse(text);
}
