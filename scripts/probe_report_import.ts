// Info: (20260730 - Tzuhan) 真實碳盤查報告匯入品質實測工具(run-once,非產品程式碼)
// Info: (20260730 - Tzuhan) 用法:npx tsx scripts/probe_report_import.ts <pdf 路徑>
// Info: (20260730 - Tzuhan) 逐章呼叫 ReportImportService(與前端 runImportChapters 同一條路徑),
// Info: (20260730 - Tzuhan) 量測:落地節數、逐字照抄失真率、活動數據筆數、耗時,結果寫成 JSON 供評估報告引用

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { ReportImportService } from "@/services/report_import.service";
import { assessPdfTextLayer, extractPdfTextLayer } from "@/lib/pdf_text_layer";
import { PdfTextLayerDecisionEnum } from "@/constants/pdf_text_layer";
import { CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES } from "@/constants/carbon_chatbot";
import {
  CARBON_REPORT_CHAPTERS,
  CARBON_REPORT_OUTLINE,
} from "@/constants/carbon_report_outline";

interface IChapterProbe {
  chapterId: string;
  chapterTitle: string;
  seconds: number;
  segments: number;
  sectionIds: string[];
  unmapped: number;
  activities: number;
  error?: string;
}

/**
 * Info: (20260730 - Tzuhan) 逐字照抄查核:把 LLM 回傳內容切成 12 字視窗,
 * 檢查每個視窗是否出現在原文中(空白全部壓平後比對)。命中率低即代表模型在改寫而非照抄。
 */
function verbatimRatio(content: string, sourceText: string): number {
  const flatten = (value: string): string => value.replace(/\s+/g, "");
  const source = flatten(sourceText);
  const flat = flatten(content);
  if (flat.length < 24) return 1;
  const windowSize = 12;
  let hit = 0;
  let total = 0;
  for (let i = 0; i + windowSize <= flat.length; i += windowSize) {
    total += 1;
    if (source.includes(flat.slice(i, i + windowSize))) hit += 1;
  }
  return total === 0 ? 1 : hit / total;
}

async function main(): Promise<void> {
  const pdfPath = process.argv[2];
  if (!pdfPath) throw new Error("需要 PDF 路徑參數");

  const buffer = fs.readFileSync(pdfPath);
  const sourceText = fs.existsSync(process.argv[3] ?? "")
    ? fs.readFileSync(process.argv[3], "utf-8")
    : "";

  const service = new ReportImportService();

  // Info: (20260730 - Tzuhan) 與匯入路由同一條裁決路徑:文字層乾淨走純文字,否則退回原檔走視覺模型
  const canUseVision = buffer.length <= CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES;
  const extracted = await extractPdfTextLayer(buffer);
  const assessment = extracted
    ? assessPdfTextLayer(extracted.text, extracted.pages, canUseVision)
    : null;
  const useText =
    !!extracted && assessment?.decision === PdfTextLayerDecisionEnum.TEXT;
  const source = {
    name: path.basename(pdfPath),
    mimeType: "application/pdf",
    data: useText ? extracted.text : buffer.toString("base64"),
    isText: useText,
  };
  console.log(
    JSON.stringify({
      sourceMode: useText ? "text" : "vision",
      reason: assessment?.reason,
      quality: assessment?.quality,
    }),
  );

  const probes: IChapterProbe[] = [];
  const allSegments: { paragraphId: string; content: string }[] = [];
  let activitiesTotal = 0;

  // Info: (20260730 - Tzuhan) 逐章序列呼叫(不並行,避免 rate limit 汙染耗時量測)
  // Info: (20260730 - Tzuhan) CHAPTERS 環境變數可限縮章節(如 "ch1,ch3"),便於分批實測
  const only = (process.env.CHAPTERS ?? "").split(",").filter(Boolean);
  const targets = only.length
    ? CARBON_REPORT_CHAPTERS.filter((chapter) => only.includes(chapter.id))
    : CARBON_REPORT_CHAPTERS;

  for (const chapter of targets) {
    const startedAt = Date.now();
    try {
      const result = await service.importReport(source, "zh_tw", {
        chapterId: chapter.id,
        extractActivities: chapter.id === CARBON_REPORT_CHAPTERS[0].id,
      });
      allSegments.push(...result.segments);
      activitiesTotal += result.activities.length;
      probes.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        seconds: +((Date.now() - startedAt) / 1000).toFixed(1),
        segments: result.segments.length,
        sectionIds: result.segments.map((segment) => segment.paragraphId),
        unmapped: result.unmapped.length,
        activities: result.activities.length,
      });
    } catch (error) {
      probes.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        seconds: +((Date.now() - startedAt) / 1000).toFixed(1),
        segments: 0,
        sectionIds: [],
        unmapped: 0,
        activities: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    console.log(JSON.stringify(probes[probes.length - 1]));
  }

  const landed = new Set(allSegments.map((segment) => segment.paragraphId));
  const missing = CARBON_REPORT_OUTLINE.filter(
    (section) => !landed.has(section.id),
  ).map((section) => `${section.code} ${section.title}`);

  const verbatim = sourceText
    ? allSegments.map((segment) => ({
        id: segment.paragraphId,
        ratio: +verbatimRatio(segment.content, sourceText).toFixed(3),
        chars: segment.content.length,
      }))
    : [];

  const summary = {
    file: path.basename(pdfPath),
    fileMb: +(buffer.length / 1048576).toFixed(2),
    model: process.env.MODEL,
    sourceMode: useText ? "text" : "vision",
    textLayer: assessment?.quality,
    chapters: probes,
    landedSections: landed.size,
    totalSections: CARBON_REPORT_OUTLINE.length,
    missingSections: missing,
    activitiesTotal,
    totalSeconds: +probes.reduce((sum, p) => sum + p.seconds, 0).toFixed(1),
    totalChars: allSegments.reduce((sum, s) => sum + s.content.length, 0),
    verbatim,
    verbatimMedian: verbatim.length
      ? verbatim.map((v) => v.ratio).sort((a, b) => a - b)[
          Math.floor(verbatim.length / 2)
        ]
      : null,
  };

  fs.writeFileSync(
    "/tmp/report_import_probe.json",
    JSON.stringify(summary, null, 2),
  );
  console.log(
    "\n=== SUMMARY ===\n",
    JSON.stringify(summary, null, 2).slice(0, 2000),
  );
}

main().catch((error) => {
  console.error("PROBE_FAILED", error);
  process.exit(1);
});
