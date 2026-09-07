/**
 * Info: (20260820 - Emily) 從伺服端 log 收割原文表格的**真實形狀**，存成回放語料庫。
 *
 * 為什麼要它：這個缺陷偶發，每一趟匯入丟掉的表都不一樣（08-20 三趟分別是
 * 0 張 / 表3.4 / 表4.4+表4.8）。靠「跑一趟看到一種形狀」來修，一趟的成本是
 * 40 分鐘與 20 萬 token。收割成素材之後，改動可以對著**所有已知形狀** 0.3 秒跑完。
 *
 * 用法：
 *   npx tsx scripts/harvest_source_tables.ts <log 檔或目錄> [更多…]
 *
 * 只收 `full` 欄位存在的事件（該欄位是後來才加的，舊 log 沒有）。
 * 以「表號 + 內容前 80 字」去重，已存在的檔案不覆蓋 —— 素材一旦進版控就是憑證。
 */
import fs from "fs";
import path from "path";

const TARGET_DIR = path.join(
  process.cwd(),
  "src/__tests__/fixtures/source_tables/should_accept",
);

interface IDroppedEvent {
  paragraphId?: string;
  tableNo?: string;
  reason?: string;
  lineCount?: number;
  full?: string;
}

const collectLogFiles = (inputs: string[]): string[] => {
  const files: string[] = [];
  inputs.forEach((input) => {
    if (!fs.existsSync(input)) return;
    if (fs.statSync(input).isDirectory()) {
      fs.readdirSync(input)
        .filter((name) => name.endsWith(".log"))
        .forEach((name) => files.push(path.join(input, name)));
      return;
    }
    files.push(input);
  });
  return files.sort();
};

const main = (): void => {
  const inputs = process.argv.slice(2);
  if (inputs.length === 0) {
    process.stdout.write(
      "用法:npx tsx scripts/harvest_source_tables.ts <log 檔或目錄> [更多…]\n",
    );
    process.exit(1);
  }

  fs.mkdirSync(TARGET_DIR, { recursive: true });
  const seen = new Set<string>();
  let written = 0;
  let skipped = 0;

  collectLogFiles(inputs).forEach((file) => {
    const lines = fs.readFileSync(file, "utf-8").split("\n");
    lines.forEach((line) => {
      /*
       * Info: (20260820 - Emily) 兩種事件都收：
       * `dropped` = 真的被丟掉的（每一趟只有 1–2 張，這是舊有的來源）
       * `candidate` = `CARBON_DUMP_SOURCE_TABLES=1` 時的全量傾印（一趟 19 張）
       */
      const isDropped = line.includes("source table dropped");
      const isCandidate = line.includes("source table candidate");
      if (!isDropped && !isCandidate) return;
      const match = line.match(/(\{.*\})/);
      if (!match) return;

      let event: IDroppedEvent;
      try {
        event = JSON.parse(match[1]) as IDroppedEvent;
      } catch {
        return;
      }
      const full = event.full ?? "";
      if (full.length === 0) return;

      const key = `${event.tableNo}|${full.slice(0, 80)}`;
      if (seen.has(key)) return;
      seen.add(key);

      const tag = (event.tableNo ?? "unknown")
        .replace("表", "t")
        .replace(/[^0-9a-zA-Z._-]/g, "");
      const run = path
        .basename(file, ".log")
        .replace(/^dev_terminal_/, "")
        .replace(/^dev_/, "");
      const suffix = isDropped ? (event.reason ?? "dropped") : "candidate";
      const name = `${tag}__${run}__${suffix}.md`;
      const target = path.join(TARGET_DIR, name);

      if (fs.existsSync(target)) {
        skipped += 1;
        return;
      }

      const header =
        `<!-- 來源:${path.basename(file)} / paragraphId=${event.paragraphId} / ` +
        `tableNo=${event.tableNo} / ` +
        `${isDropped ? `當時被丟的原因=${event.reason}` : "全量傾印（當時沒被丟）"} / ` +
        `lineCount=${event.lineCount} -->\n`;
      fs.writeFileSync(target, header + full, "utf-8");
      process.stdout.write(`+ ${name}（${full.split("\n").length} 行）\n`);
      written += 1;
    });
  });

  process.stdout.write(
    `\n新增 ${written} 份、已存在略過 ${skipped} 份。語料庫在 ${path.relative(process.cwd(), TARGET_DIR)}\n`,
  );
  process.stdout.write(
    "接著跑:npx jest src/__tests__/source_table_corpus.test.ts\n",
  );
};

main();
