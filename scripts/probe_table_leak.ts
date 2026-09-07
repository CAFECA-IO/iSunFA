// Info: (20260820 - Emily) 一次性探針:把 PDF 文字層裡「markdown 表格語法外洩」那幾處
// Info: (20260820 - Emily) 的上下文印出來,用來判斷外洩的是哪一張表、走的是哪一條路徑。
// Info: (20260820 - Emily) 用法:npx tsx scripts/probe_table_leak.ts <報告.pdf>
import fs from "fs";
import { extractPdfTextLayer } from "@/lib/pdf_text_layer";

const LEAK = /(\|\s*-{3,}\s*\||\|\s*\|\s*\|)/g;

const main = async (): Promise<void> => {
  const target = process.argv[2];
  if (!target) {
    process.stdout.write(
      "用法:npx tsx scripts/probe_table_leak.ts <報告.pdf>\n",
    );
    process.exit(1);
  }

  const extracted = await extractPdfTextLayer(fs.readFileSync(target));
  if (!extracted) {
    process.stdout.write("讀不出文字層\n");
    process.exit(1);
  }
  const text = extracted.text;
  const hits = [...text.matchAll(LEAK)];
  process.stdout.write(`外洩處數:${hits.length}\n\n`);

  hits.forEach((hit, index) => {
    const at = hit.index ?? 0;
    const before = text.slice(Math.max(0, at - 400), at);
    const after = text.slice(at, at + 400);
    process.stdout.write(`===== 第 ${index + 1} 處(位移 ${at}) =====\n`);
    process.stdout.write(`--- 前文 ---\n${before}\n`);
    process.stdout.write(`--- 命中起 ---\n${after}\n\n`);
  });
};

void main();
