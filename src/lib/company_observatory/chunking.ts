import {
  OBSERVATORY_CHUNK_OVERLAP,
  OBSERVATORY_CHUNK_SIZE,
  OBSERVATORY_SOURCE_LABEL,
  ObservatorySource,
} from "@/constants/company_observatory";
import { IObservatoryChunk } from "@/interfaces/company_observatory";

// Info: (20261015 - Luphia) CJK 漢字、CJK 標點與全形字元
const CJK_SPACED_PATTERN =
  /([\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef])[ \u00a0]+(?=[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef])/g;

/**
 * Info: (20261015 - Luphia) 清理 PDF 文字層：MOPS 財報的文字層把每個中文字用空白隔開
 * （「本 合 併 財 務 報 告」），嵌入模型會把它當成一串單字而失去詞義。
 * 只移除「兩個 CJK 字元之間」的半形空白；換行（段落判斷用）與 tab（表格儲存格分隔）原樣保留，
 * 英數之間的空白也不動。純字串處理，不改任何字元內容。
 */
export function normalizeExtractedText(text: string): string {
  return text.replace(CJK_SPACED_PATTERN, "$1");
}

/**
 * Info: (20261015 - Luphia) 企業觀測站的文字切塊。純函數。
 *
 * 先以空行分段落，段落累積到上限就收一塊，並把上一塊尾端 `overlap` 個字元帶進下一塊保持語意連貫；
 * 單一段落本身超過上限才硬切。做法沿用 scripts/import_pdfs.ts 的 chunkMarkdown，
 * 但以頁為單位切，切塊永遠不跨頁——檢索結果才能回指到原文頁碼。
 */
export function chunkText(
  text: string,
  size: number = OBSERVATORY_CHUNK_SIZE,
  overlap: number = OBSERVATORY_CHUNK_OVERLAP,
): string[] {
  if (overlap >= size) {
    throw new Error("chunk overlap must be smaller than chunk size");
  }
  const chunks: string[] = [];
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  let current = "";
  // Info: (20261015 - Luphia) current 是否含有尚未收進任何切塊的內容（只剩重疊尾巴時為 false）
  let hasNewContent = false;

  for (const paragraph of paragraphs) {
    const joined = current ? `${current}\n\n${paragraph}` : paragraph;
    if (joined.length <= size) {
      current = joined;
      hasNewContent = true;
      continue;
    }
    if (current && hasNewContent) {
      chunks.push(current);
      current = current.slice(-overlap);
    }
    if (paragraph.length > size) {
      // Info: (20261015 - Luphia) 超長段落硬切，每刀往回重疊 overlap 個字元；最後一刀留著與後續段落合併
      let offset = 0;
      while (offset + size < paragraph.length) {
        chunks.push(paragraph.slice(offset, offset + size));
        offset += size - overlap;
      }
      current = paragraph.slice(offset);
    } else {
      // Info: (20261015 - Luphia) 重疊尾巴加上這段若會超過上限，就捨棄尾巴——上限優先於重疊
      const withOverlap = current ? `${current}\n\n${paragraph}` : paragraph;
      current = withOverlap.length <= size ? withOverlap : paragraph;
    }
    hasNewContent = true;
  }
  if (current && hasNewContent) chunks.push(current);
  return chunks;
}

// Info: (20261015 - Luphia) 逐頁切塊並編上全文件連續的 chunkIndex（向量列 id 的一部分，必須穩定）
export function chunkPages(pages: string[]): IObservatoryChunk[] {
  const result: IObservatoryChunk[] = [];
  pages.forEach((pageText, pageIndex) => {
    for (const text of chunkText(pageText)) {
      result.push({
        text,
        pageNumber: pageIndex + 1,
        chunkIndex: result.length,
      });
    }
  });
  return result;
}

// Info: (20261015 - Luphia) 每個切塊的標頭：讓向量與檢索結果本身就帶著「哪家公司、哪年、哪種報告、第幾頁」
export function chunkHeader(params: {
  companyName: string;
  stockId: string;
  source: ObservatorySource;
  year: number;
  pageNumber: number;
}): string {
  const label = OBSERVATORY_SOURCE_LABEL[params.source];
  return `### 企業: ${params.companyName} (${params.stockId}) ｜ ${params.year} 年${label} [第 ${params.pageNumber} 頁]`;
}
