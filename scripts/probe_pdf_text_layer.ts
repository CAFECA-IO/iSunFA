// Info: (20260731 - Tzuhan) PDF 文字層抽取失敗定位工具(run-once,非產品程式碼)
// Info: (20260731 - Tzuhan) 用法:npx tsx scripts/probe_pdf_text_layer.ts <pdf 路徑>
// Info: (20260731 - Tzuhan) 動機:實跑時伺服端記到 charsPerPage: 0 / text_layer_unavailable,
// Info: (20260731 - Tzuhan) 但成因有三種可能且處置完全不同 —— 本腳本在 Next 之外逐段走同一條載入鏈,
// Info: (20260731 - Tzuhan) 一次跑完即可分辨是「原生 canvas 掛掉」「Next 打包破壞動態載入」還是「這份檔案本身沒有文字層」。
// Info: (20260731 - Tzuhan) 為什麼要在 Next 之外跑:若此處成功而 dev server 失敗,問題就在 bundler 而非 pdf-parse。

import fs from "node:fs";
import path from "node:path";
import {
  assessPdfTextLayer,
  extractPdfTextLayer,
  measurePdfTextLayer,
} from "@/lib/pdf_text_layer";
import { PdfTextLayerDecisionEnum } from "@/constants/pdf_text_layer";
import { describeError } from "@/lib/utils/error_message";
import { CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES } from "@/constants/carbon_chatbot";

// Info: (20260731 - Tzuhan) 每個檢查點的三態:通過 / 失敗(帶原因)/ 未執行(前一關已斷)
enum ProbeStateEnum {
  PASS = "PASS",
  FAIL = "FAIL",
  SKIPPED = "SKIPPED",
}

interface IProbeStep {
  name: string;
  state: ProbeStateEnum;
  detail: string;
}

const steps: IProbeStep[] = [];

const record = (name: string, state: ProbeStateEnum, detail: string): void => {
  steps.push({ name, state, detail });
  const mark =
    state === ProbeStateEnum.PASS
      ? "✓"
      : state === ProbeStateEnum.FAIL
        ? "✗"
        : "–";
  process.stdout.write(`${mark} ${name}\n    ${detail}\n`);
};

/**
 * Info: (20260731 - Tzuhan) 檢查點一:原生繪圖綁定。
 * pdfjs 的 Node 分支會**無條件** require("@napi-rs/canvas") 來補 DOMMatrix/ImageData/Path2D,
 * 且在檢查 globalThis 之前就 require —— 也就是說,即使我們只要純文字,
 * 這個原生 .node 依舊會被載入。它載不起來(平台/架構不符)或直接讓行程崩掉,
 * 整個 pdf-parse 就 import 不了,而抽取失敗會被降級邏輯吸收成一句 text_layer_unavailable。
 */
async function probeNativeCanvas(): Promise<boolean> {
  try {
    const canvas: unknown = await import("@napi-rs/canvas");
    const hasMatrix =
      typeof canvas === "object" &&
      canvas !== null &&
      "DOMMatrix" in (canvas as Record<string, unknown>);
    record(
      "@napi-rs/canvas(原生綁定,pdfjs 無條件載入)",
      ProbeStateEnum.PASS,
      `載入成功,DOMMatrix ${hasMatrix ? "可用" : "缺席"};platform=${process.platform}/${process.arch},node=${process.version}`,
    );
    return true;
  } catch (error) {
    record(
      "@napi-rs/canvas(原生綁定,pdfjs 無條件載入)",
      ProbeStateEnum.FAIL,
      `${describeError(error)}
    → 這就是根因:文字抽取根本不需要繪圖,卻被原生綁定擋住。處置見下方結論。`,
    );
    return false;
  }
}

// Info: (20260731 - Tzuhan) 檢查點二:pdf-parse 本體能否 import(canvas 掛掉時這關必倒)
async function probePdfParseImport(): Promise<boolean> {
  try {
    const mod = await import("pdf-parse");
    record(
      "pdf-parse 模組載入",
      ProbeStateEnum.PASS,
      `PDFParse ${typeof mod.PDFParse === "function" ? "可用" : "缺席"}`,
    );
    return typeof mod.PDFParse === "function";
  } catch (error) {
    record("pdf-parse 模組載入", ProbeStateEnum.FAIL, describeError(error));
    return false;
  }
}

/**
 * Info: (20260731 - Tzuhan) 檢查點三:走產品程式碼本身(extractPdfTextLayer),不是另寫一套。
 * 這關通過而 dev server 仍記到 text_layer_unavailable,就證明問題出在 Next 打包而非抽取邏輯。
 */
async function probeExtraction(buffer: Buffer, sizeBytes: number) {
  const started = Date.now();
  const extracted = await extractPdfTextLayer(buffer);
  const seconds = Number(((Date.now() - started) / 1000).toFixed(1));

  if (!extracted) {
    record(
      "extractPdfTextLayer(產品程式碼)",
      ProbeStateEnum.FAIL,
      `回傳 null,耗時 ${seconds}s。上方 logger 那行即真正的例外。`,
    );
    return;
  }

  const quality = measurePdfTextLayer(extracted.text, extracted.pages);
  record(
    "extractPdfTextLayer(產品程式碼)",
    ProbeStateEnum.PASS,
    `${extracted.pages} 頁 / ${quality.chars} 字 / ${quality.charsPerPage} 字每頁 / 解碼失敗 ${quality.undecodedChars}(數值鄰接 ${quality.numericUndecodedChars}),耗時 ${seconds}s`,
  );

  // Info: (20260731 - Tzuhan) 視覺降級的可行性取決於原檔是否在 inlineData 上限內,與品質閘門的裁決相依
  const canUseVision = sizeBytes <= CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES;
  const assessment = assessPdfTextLayer(
    extracted.text,
    extracted.pages,
    canUseVision,
  );
  record(
    "品質閘門裁決",
    assessment.decision === PdfTextLayerDecisionEnum.TEXT
      ? ProbeStateEnum.PASS
      : ProbeStateEnum.FAIL,
    `decision=${assessment.decision} reason=${assessment.reason}(視覺降級${canUseVision ? "可用" : "不可用"})`,
  );

  // Info: (20260731 - Tzuhan) 頁標記是頁碼索引兩階段的前提,沒有標記切片一律退回全文
  const markers = extracted.text.match(/-- p\.\d+\/\d+ --/g)?.length ?? 0;
  record(
    "頁標記(頁碼索引兩階段的前提)",
    markers > 0 ? ProbeStateEnum.PASS : ProbeStateEnum.FAIL,
    `找到 ${markers} 個頁標記${markers === 0 ? ",切片會退回送全文" : ""}`,
  );
}

async function main(): Promise<void> {
  const target = process.argv[2];
  if (!target) {
    process.stdout.write(
      "用法:npx tsx scripts/probe_pdf_text_layer.ts <pdf 路徑>\n",
    );
    process.exit(1);
  }
  const resolved = path.resolve(target);
  if (!fs.existsSync(resolved)) {
    process.stdout.write(`找不到檔案:${resolved}\n`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(resolved);
  process.stdout.write(
    `\n檔案:${path.basename(resolved)}(${(buffer.length / 1024 / 1024).toFixed(2)} MB)\n\n`,
  );

  const canvasOk = await probeNativeCanvas();
  const parseOk = await probePdfParseImport();
  if (!parseOk) {
    record(
      "extractPdfTextLayer(產品程式碼)",
      ProbeStateEnum.SKIPPED,
      "pdf-parse 載入失敗,抽取無從執行",
    );
  } else {
    await probeExtraction(buffer, buffer.length);
  }

  // Info: (20260731 - Tzuhan) 結論直接指向處置:三種成因的修法完全不同,不讓讀者自己猜
  process.stdout.write("\n結論\n");
  const extraction = steps.find((step) =>
    step.name.startsWith("extractPdfTextLayer"),
  );
  if (!canvasOk) {
    process.stdout.write(
      "原生 canvas 綁定載不起來,而 pdfjs 在補 DOMMatrix 之前就無條件 require 它。\n" +
        "純文字抽取不需要繪圖,這個依賴是多餘的風險 —— 應改用不含原生綁定的抽取器。\n",
    );
  } else if (extraction?.state !== ProbeStateEnum.PASS) {
    process.stdout.write(
      "canvas 正常但抽取仍失敗:例外內容見上方 logger 那行,可能是這份 PDF 的字型/加密特性。\n",
    );
  } else {
    process.stdout.write(
      "在 Next 之外抽取正常 —— 那麼 dev server 記到的 text_layer_unavailable 是打包造成的。\n" +
        "next.config.ts 的 serverExternalPackages 已加入 pdf-parse,請重啟 dev server 再匯入一次。\n",
    );
  }
  process.stdout.write("\n");
}

main().catch((error: unknown) => {
  process.stdout.write(`probe 自身異常:${describeError(error)}\n`);
  process.exit(1);
});
