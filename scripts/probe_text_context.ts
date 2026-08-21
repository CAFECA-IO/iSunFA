// Info: (20260820 - Emily) 一次性探針:印出 PDF 文字層裡某個字串的每一處上下文。
// Info: (20260820 - Emily) 用途是回答「這個詞是誰印上去的」—— 修正端與生效端必須先分清楚。
// Info: (20260820 - Emily) 用法:npx tsx scripts/probe_text_context.ts <報告.pdf> <要找的字串> [前後字數]
import fs from "fs";
import { extractPdfTextLayer, splitTextByPages } from "@/lib/pdf_text_layer";

const main = async (): Promise<void> => {
  const [target, needle, windowArg] = process.argv.slice(2);
  if (!target || !needle) {
    process.stdout.write(
      "用法:npx tsx scripts/probe_text_context.ts <報告.pdf> <要找的字串> [前後字數]\n",
    );
    process.exit(1);
  }
  const span = Number(windowArg ?? 120);

  const extracted = await extractPdfTextLayer(fs.readFileSync(target));
  if (!extracted) {
    process.stdout.write("讀不出文字層\n");
    process.exit(1);
  }

  const text = extracted.text;
  const hits: number[] = [];
  let from = text.indexOf(needle);
  while (from !== -1) {
    hits.push(from);
    from = text.indexOf(needle, from + needle.length);
  }

  // Info: (20260820 - Emily) 位移 → 頁次,判斷它落在哪一頁(切片範圍是以頁為單位)
  const pages = splitTextByPages(text);
  const pageStarts: number[] = [];
  let cursor = 0;
  pages.forEach((page) => {
    pageStarts.push(cursor);
    cursor += page.length;
  });
  const pageOf = (at: number): number => {
    let page = 1;
    pageStarts.forEach((start, index) => {
      if (at >= start) page = index + 1;
    });
    return page;
  };

  process.stdout.write(
    `「${needle}」共 ${hits.length} 處(全文 ${pages.length} 頁)\n\n`,
  );
  hits.forEach((at, index) => {
    const before = text.slice(Math.max(0, at - span), at).replace(/\n/g, "⏎");
    const after = text.slice(at, at + needle.length + span).replace(/\n/g, "⏎");
    process.stdout.write(
      `[${index + 1}] 第 ${pageOf(at)} 頁 …${before}【${after}】…\n\n`,
    );
  });
};

void main();
