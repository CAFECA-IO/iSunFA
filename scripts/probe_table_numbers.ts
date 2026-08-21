// Info: (20260820 - Emily) 一次性探針:把 PDF 裡所有「表號樣式」連頁次列出來。
// Info: (20260820 - Emily) 用途:確認原檔實際的表號寫法與所在頁,才能判斷切片有沒有送到。
// Info: (20260820 - Emily) 用法:npx tsx scripts/probe_table_numbers.ts <來源.pdf>
import fs from "fs";
import { extractPdfTextLayer, splitTextByPages } from "@/lib/pdf_text_layer";

// Info: (20260820 - Emily) 表 + 可選空白 + 數字 + 分隔(點/連字號/全角點) + 數字
const TABLE_NO = /表\s*[0-9０-９]+\s*[.\-–—・．]\s*[0-9０-９]+/g;

const main = async (): Promise<void> => {
  const target = process.argv[2];
  if (!target) {
    process.stdout.write(
      "用法:npx tsx scripts/probe_table_numbers.ts <來源.pdf>\n",
    );
    process.exit(1);
  }

  const extracted = await extractPdfTextLayer(fs.readFileSync(target));
  if (!extracted) {
    process.stdout.write("讀不出文字層\n");
    process.exit(1);
  }

  const pages = splitTextByPages(extracted.text);
  process.stdout.write(`全文 ${pages.length} 頁\n\n`);

  const seen = new Map<string, number[]>();
  pages.forEach((page, index) => {
    [...page.matchAll(TABLE_NO)].forEach((hit) => {
      const key = hit[0].replace(/\s+/g, "");
      const list = seen.get(key) ?? [];
      if (!list.includes(index + 1)) list.push(index + 1);
      seen.set(key, list);
    });
  });

  if (seen.size === 0) {
    process.stdout.write(
      "找不到任何表號樣式 —— 表號可能不是「表N.N」這種寫法\n",
    );
    return;
  }

  [...seen.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "zh-Hant", { numeric: true }))
    .forEach(([tableNo, pageList]) => {
      process.stdout.write(`${tableNo}\t頁 ${pageList.join(", ")}\n`);
    });
};

void main();
