import fs from "fs";
import path from "path";
import { logger } from "@/lib/utils/logger";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  buildCarbonReportHtml,
  type ICarbonReportShell,
} from "@/lib/utils/carbon_report_html";
import {
  assignTocPageNumbers,
  countLeadingTocPages,
} from "@/lib/utils/carbon_toc_pages";
import { squeezeForMatch } from "@/lib/utils/squeeze_for_match";
import { CARBON_TOC_PAGE_HEADING_HITS } from "@/constants/carbon_pdf";
import { extractPdfTextLayer, splitTextByPages } from "@/lib/pdf_text_layer";
import { assertCjkRenderable } from "@/lib/utils/pdf_font_guard";
import { repairPdfToUnicode } from "@/lib/utils/pdf_tounicode_repair";
import {
  dropPrintBrowser,
  getPrintBrowser,
  type IPrintPage,
} from "@/lib/utils/pdf_browser";
import {
  aliasNonAsciiSankeyNodes,
  restoreSankeyLabels,
  type ISankeyAlias,
} from "@/lib/utils/mermaid_helpers";
import {
  CARBON_PDF_LANDSCAPE_CONTENT_PX,
  CARBON_PDF_MERMAID_TIMEOUT_MS,
  CARBON_PDF_MIN_PT,
  CARBON_PDF_PORTRAIT_CONTENT_PX,
  CARBON_PDF_PORTRAIT_FLOOR_PT,
  CARBON_PDF_TABLE_BASE_PT,
} from "@/constants/carbon_pdf";

/**
 * Info: (20260810 - Emily) 碳盤查報告的伺服端向量列印
 * (data/issue_drafts/inventory_table_import/17)。
 *
 * 前端 html2canvas 的路徑不再用於長報告:它把 DOM 畫成一張大圖再在像素上橫切,
 * **不執行任何列印規則** —— page-break-inside、thead: table-header-group
 * 都是給瀏覽器列印引擎看的。文字行與表格列被切一半在那個架構下不是 bug,
 * 是它的工作方式。這裡改用 Chrome 自己的列印引擎,那些規則才第一次真的生效。
 *
 * 實測同一份 UAT 報告:112 頁 / 34 MB / 可抽取 0 字元
 *                  → 46 頁 / 1.67 MB / 可抽取 56,753 字元(中文可搜尋)。
 */

export interface ICarbonReportPdfInput {
  markdown: string;
  fileName: string;
  /** Info: (20260810 - Emily) 頁尾顯示的報告名稱;未給則用檔名 */
  title?: string;
  /**
   * Info: (20260811 - Emily) 文件外殼的文案(頁首／頁尾),由用戶端帶上來。
   * 省略即不印外殼 —— 舊的用戶端不會因此壞掉。
   */
  shell?: Omit<ICarbonReportShell, "logoDataUrl">;
}

export interface IGeneratedCarbonPdf {
  fileName: string;
  contentBase64: string;
  sizeBytes: number;
  landscapeTables: number;
  chartsRendered: number;
  chartsFailed: number;
  /**
   * Info: (20260812 - Emily) 目錄頁碼填了幾條、幾條留白。
   *
   * 原本只進 log。而文字層抽不出來時（`extractPdfTextLayer` 回 null，
   * ADR 014 記載的 @napi-rs/canvas SIGBUS 至今未定案）整份目錄會靜默沒有頁碼,
   * 使用者拿到的是一份看起來完整的報告 —— 與 chartsFailed 同一種需要
   * 讓呼叫端知道的降級,所以比照它一起回傳。
   */
  tocFilled: number;
  tocMissing: number;
}

const describeError = (error: unknown): string =>
  error instanceof Error
    ? `${error.name}: ${error.message}${error.cause ? ` <- ${String(error.cause)}` : ""}`
    : String(error);

/**
 * Info: (20260810 - Emily) mermaid 的瀏覽器版打包檔位置。
 *
 * 從 node_modules 直接讀而不是走 import:這支腳本要被注入到 headless Chrome 的
 * 頁面裡執行,不是在 Node 裡執行 —— import 進來的是模組物件,不是可注入的原始碼。
 */
const resolveMermaidBundle = (): string | null => {
  const candidates = [
    path.join(process.cwd(), "node_modules/mermaid/dist/mermaid.min.js"),
    path.join(
      process.cwd(),
      ".next/server/node_modules/mermaid/dist/mermaid.min.js",
    ),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
};

const buildFooterTemplate = (title: string): string =>
  `<div style="width:100%;padding:0 14mm;font-family:Arial,sans-serif;font-size:7pt;color:#94a3b8;display:flex;justify-content:space-between;">
     <span>${title.replace(/[<>&]/g, "")}</span>
     <span><span class="pageNumber"></span>/<span class="totalPages"></span></span>
   </div>`;

export class CarbonReportPdfService {
  /**
   * Info: (20260811 - Emily) logo 讀成 data URL。
   *
   * 列印頁面沒有伺服器,`/isunfa_logo.svg` 這種相對路徑取不到;
   * 而 `sealNetwork` 也會擋掉所有非 data/about/blob 的請求(SSRF 防護)。
   * 讀不到就回 undefined —— 一份少了 logo 的報告仍然可用,
   * 為了一個圖檔讓整份印不出來不成比例。
   */
  private static logoDataUrl(): string | undefined {
    try {
      const file = path.join(process.cwd(), "public", "isunfa_logo.svg");
      const svg = fs.readFileSync(file);
      return `data:image/svg+xml;base64,${svg.toString("base64")}`;
    } catch (error) {
      logger.warn("[CarbonReportPdfService] logo unavailable", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      return undefined;
    }
  }

  /**
   * Info: (20260812 - Emily) 目錄的頁碼**從產出的 PDF 量**，不是從 DOM 推算。
   *
   * 向量列印的分頁是 Chrome 在 page.pdf 當下做的，DOM 裡量不到 ——
   * 用「Y 偏移 ÷ 頁高」推算等於自己重寫一次它的排版引擎，而寬表會被移到橫式頁
   * (`.wide { page: landscapePage }`)，那裡有強制分頁、頁高也不同，推算必偏。
   *
   * 所以先印一次，用文字層逐頁找標題落在第幾頁，填進目錄，再印一次。
   * 第二次的分頁與第一次相同 —— 目錄的高度在第一次就是最終高度，
   * 這一步只把佔位符換成數字，而佔位符的寬度固定（見 TOC_PAGE_PLACEHOLDER），
   * 填 1~3 位數都不會讓那一行重新換行。
   *
   * 找不到的項目留白而不是填 0 或猜一個數字：一個錯的頁碼比沒有頁碼更糟，
   * 查證的人會照著它翻到錯的一頁然後以為報告漏了那一節。
   */
  private static async fillTocPageNumbers(
    page: IPrintPage,
    buffer: Buffer,
  ): Promise<{ filled: number; missing: number }> {
    /**
     * Info: (20260812 - Emily) 一併取目錄標題:它是短報告唯一能區分
     * 「目錄頁」與「內容頁」的訊號(見 countLeadingTocPages)。
     */
    const { title: tocTitle, entries } = (await page.evaluate(`(() => {
      var titleEl = document.querySelector(".doc-toc-title");
      return {
        title: titleEl ? (titleEl.textContent || "").trim() : "",
        entries: Array.from(
          document.querySelectorAll(".doc-toc-list .toc-page"),
        ).map(function (el) {
          var row = el.closest("a");
          var text = row ? row.querySelector(".toc-text") : null;
          return {
            target: el.getAttribute("data-target") || "",
            text: text ? (text.textContent || "").trim() : "",
          };
        }),
      };
    })()`)) as {
      title: string;
      entries: Array<{ target: string; text: string }>;
    };
    if (entries.length === 0) return { filled: 0, missing: 0 };

    const extracted = await extractPdfTextLayer(buffer);
    if (!extracted) {
      logger.warn("[CarbonReportPdfService] toc page numbers skipped", {
        reason: "text layer unavailable",
      });
      return { filled: 0, missing: entries.length };
    }
    // Info: (20260812 - Emily) NFKC + 去空白的理由見 squeezeForMatch
    const pages = splitTextByPages(extracted.text).map(squeezeForMatch);

    // Info: (20260812 - Emily) 目錄自己佔幾頁,判定與理由都在 countLeadingTocPages
    const needles = entries.map((entry) => squeezeForMatch(entry.text));
    const skip = countLeadingTocPages({
      squeezedPages: pages,
      squeezedTocTitle: squeezeForMatch(tocTitle),
      squeezedEntries: needles,
      headingHits: CARBON_TOC_PAGE_HEADING_HITS,
    });

    /**
     * Info: (20260812 - Emily) 頁碼的指派邏輯(單調游標、同名條目、退回全域)
     * 都在 assignTocPageNumbers ——它需要純函式才測得到,而本方法要有 Chrome 才跑得起來。
     * 這裡只負責 I/O 與把 `outOfOrder` 記成 log。
     */
    const assigned = assignTocPageNumbers({
      squeezedPages: pages,
      squeezedEntries: needles,
      skip,
    });
    const numbers = assigned.map((entry) => entry.page);

    /*
     * Info: (20260812 - Emily) 文件順序被違反的條目要記出來:回報的頁碼可能是錯的,
     * 而錯的頁碼比留白更糟(查證的人會照著它翻到錯的一頁)。
     */
    const outOfOrder = assigned
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.outOfOrder);
    if (outOfOrder.length > 0) {
      logger.warn(
        "[CarbonReportPdfService] toc entries out of document order",
        {
          count: outOfOrder.length,
          samples: outOfOrder.slice(0, 3).map(({ entry, index }) => ({
            text: needles[index].slice(0, 30),
            page: entry.page,
          })),
        },
      );
    }

    await page.evaluate(
      `(() => {
        var numbers = ${JSON.stringify(numbers)};
        Array.from(document.querySelectorAll(".doc-toc-list .toc-page")).forEach(
          function (el, i) {
            el.textContent = numbers[i] > 0 ? String(numbers[i]) : "";
          },
        );
      })()`,
    );

    const missing = numbers.filter((value) => value === 0).length;
    if (missing > 0) {
      logger.warn("[CarbonReportPdfService] toc entries without a page", {
        missing,
        total: entries.length,
        samples: entries
          .filter((unused, i) => numbers[i] === 0)
          .slice(0, 3)
          .map((entry) => entry.text.slice(0, 30)),
      });
    }
    return { filled: numbers.length - missing, missing };
  }

  async generate(input: ICarbonReportPdfInput): Promise<IGeneratedCarbonPdf> {
    const started = Date.now();
    const html = buildCarbonReportHtml(
      input.markdown,
      input.shell
        ? {
            ...input.shell,
            logoDataUrl: CarbonReportPdfService.logoDataUrl(),
          }
        : undefined,
    );

    try {
      const browser = await getPrintBrowser();
      const page = await browser.newPage();
      try {
        await this.sealNetwork(page);
        await page.setViewport({
          width: CARBON_PDF_PORTRAIT_CONTENT_PX,
          height: 1123,
        });
        await page.emulateMediaType("print");
        await page.setContent(html, { waitUntil: "load" });

        await assertCjkRenderable(page, html, {
          scope: "CarbonReportPdfService",
          ref: input.fileName,
        });

        const charts = await this.renderCharts(page);
        const layout = await this.applyPageLayout(page);

        const printPdf = (): Promise<Buffer> =>
          page.pdf({
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: "<span></span>",
            footerTemplate: buildFooterTemplate(input.title ?? input.fileName),
            /**
             * Info: (20260810 - Emily) preferCSSPageSize 必須開。
             * 橫式頁是靠 `@page landscapePage { size: A4 landscape }` 生效的,
             * 關掉它 Chrome 會忽略 @page 的 size,寬表就又擠回直式。
             */
            preferCSSPageSize: true,
          }) as Promise<Buffer>;

        let buffer = await printPdf();
        const toc = await CarbonReportPdfService.fillTocPageNumbers(
          page,
          buffer,
        );
        // Info: (20260812 - Emily) 有填到東西才值得再印一次
        if (toc.filled > 0) buffer = await printPdf();

        /**
         * Info: (20260817 - Emily) 修 ToUnicode 對照表
         * (`data/issue_drafts/open/38_pdf_tounicode_radicals.md`)。
         *
         * Chrome 把部分漢字的文字層寫成**康熙部首**的碼位
         * （`文` 寫成 U+2F42）—— 紙上看不出來，但 Ctrl+F 搜不到、複製出去是錯字。
         * 實測那份 57 頁報告：2,560 個字、44 種，含「高」「文」「工」「行」。
         *
         * 必須在**兩趡列印都跑完之後**才修：第二趡會重新產生整份 PDF，
         * 先修的話整個被覆蓋掉。fillTocPageNumbers 讀的是文字層，
         * 而它自己用 squeezeForMatch 比對，不受部首影響（實測 33/33 都對）。
         *
         * 修不動不讓列印失敗 —— 一份「可以看但搜不到」的報告，
         * 仍然遠好過一份沒有產出的報告。但**不修得靜悄悄**：
         * 沒有這行 log，「這份本來就乾淨」與「修補整個沒接上」在現場分不出來。
         */
        const repair = await repairPdfToUnicode(new Uint8Array(buffer));
        if (repair.decision === "repaired") buffer = Buffer.from(repair.bytes);
        logger.info("[CarbonReportPdfService] tounicode repaired", {
          fileName: input.fileName,
          decision: repair.decision,
          streams: repair.streams,
          replaced: repair.replaced,
          unmapped: [...repair.unmapped],
        });

        logger.info("[CarbonReportPdfService] rendered", {
          fileName: input.fileName,
          ms: Date.now() - started,
          bytes: buffer.length,
          landscapeTables: layout.landscape,
          // Info: (20260811 - Luphia) 縮字級留在直式的張數也要記(PR review 第 7 點):
          // Info: (20260811 - Luphia) applyPageLayout 算了 shrunk 卻沒有任何出口,而它正是
          // Info: (20260811 - Luphia) 「幾張表是靠縮字級才避掉一次強制分頁」的唯一觀測點。
          shrunkTables: layout.shrunk,
          chartsRendered: charts.rendered,
          chartsFailed: charts.failed,
          tocFilled: toc.filled,
          tocMissing: toc.missing,
          toUnicodeReplaced: repair.replaced,
        });

        return {
          fileName: input.fileName,
          contentBase64: Buffer.from(buffer).toString("base64"),
          sizeBytes: buffer.length,
          landscapeTables: layout.landscape,
          chartsRendered: charts.rendered,
          chartsFailed: charts.failed,
          tocFilled: toc.filled,
          tocMissing: toc.missing,
        };
      } finally {
        await page.close().catch(() => undefined);
      }
    } catch (error) {
      logger.error(
        `[CarbonReportPdfService] generate failed: ${describeError(error)}`,
      );
      /**
       * Info: (20260810 - Emily) 已分類的錯誤原樣往上拋,且**不**棄用共用 Chrome。
       * 缺中文字型時瀏覽器本身是健康的,關掉它只會讓後續每個請求多付一次冷啟動,
       * 對成因毫無幫助 —— 而那個成因唯一的解法是裝字型,重試一萬次都一樣。
       */
      if (error instanceof ApiError) throw error;
      await dropPrintBrowser();
      throw new ApiError(
        API_ERRORS.IS_PDF_GENERATION_FAILED.code,
        API_ERRORS.IS_PDF_GENERATION_FAILED.message,
        API_ERRORS.IS_PDF_GENERATION_FAILED.status,
      );
    }
  }

  /**
   * Info: (20260810 - Emily) 全面阻斷頁面的網路請求。
   *
   * 報告內容出自使用者的草稿,而它會在**伺服器的網路位置上**被 Chrome 載入。
   * 一張 `<img src="http://internal-service/...">` 就是一次由伺服器發出的請求(SSRF)。
   * 列印本身不需要任何外部資源:字型取本機安裝的、mermaid 由我們自己注入、
   * 圖片走 data URL —— 所以「全部擋掉」不會犧牲功能。
   *
   * 與 carbon_report_html 的 stripActiveContent 是兩層:那層擋執行,這層擋外連。
   * 任一層失效時另一層仍成立。
   */
  private async sealNetwork(page: IPrintPage): Promise<void> {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = request.url();
      const allowed =
        url.startsWith("data:") ||
        url.startsWith("about:") ||
        url.startsWith("blob:");
      if (allowed) {
        request.continue().catch(() => undefined);
        return;
      }
      request.abort().catch(() => undefined);
    });
  }

  /**
   * Info: (20260810 - Emily) 在真的 DOM 裡把 mermaid 畫成 SVG。
   *
   * 圖表因此是**向量**:放大不糊、檔案小,而且不會像光柵化那樣被分頁線切開。
   *
   * 別名替換沿用 repo 既有的 aliasNonAsciiSankeyNodes / restoreSankeyLabels
   * (Julian 2026-07-16):mermaid 的 sankey lexer 只吃 ASCII,中文節點名一律
   * Parse error。實測純英文可以、換成中文就 `Parse error on line 2`。
   * 前處理放在 Node 而非頁面內,是為了與前端 renderMermaid 走同一份實作 ——
   * 兩邊各寫一份的下場已經看過一次(驗證與渲染看到不同輸入,見 mermaid_render 的註解)。
   */
  private async renderCharts(
    page: IPrintPage,
  ): Promise<{ rendered: number; failed: number }> {
    const sources = await page.evaluate(() =>
      Array.from(document.querySelectorAll("pre.mermaid")).map(
        (node) => node.textContent ?? "",
      ),
    );
    if (sources.length === 0) return { rendered: 0, failed: 0 };

    const bundle = resolveMermaidBundle();
    if (!bundle) {
      logger.warn("[CarbonReportPdfService] mermaid bundle not found");
      return { rendered: 0, failed: sources.length };
    }
    await page.addScriptTag({ content: fs.readFileSync(bundle, "utf8") });

    const prepared: Array<{ chart: string; aliases: ISankeyAlias[] }> =
      sources.map((source) => aliasNonAsciiSankeyNodes(source));

    const results = await page.evaluate(
      async (charts: string[], timeoutMs: number) => {
        const mermaid = (window as unknown as { mermaid: unknown }).mermaid as {
          initialize: (config: Record<string, unknown>) => void;
          render: (id: string, text: string) => Promise<{ svg: string }>;
        };
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "strict",
        });
        const withTimeout = <T>(task: Promise<T>): Promise<T> =>
          Promise.race([
            task,
            new Promise<T>((unused, reject) => {
              setTimeout(() => reject(new Error("mermaid timeout")), timeoutMs);
            }),
          ]);

        const out: Array<{ svg: string | null; error: string | null }> = [];
        for (let index = 0; index < charts.length; index += 1) {
          try {
            const { svg } = await withTimeout(
              mermaid.render(`carbon-mmd-${index}`, charts[index]),
            );
            out.push({ svg, error: null });
          } catch (error) {
            out.push({
              svg: null,
              error: String((error as Error)?.message ?? error).split("\n")[0],
            });
          }
        }
        return out;
      },
      prepared.map((item) => item.chart),
      CARBON_PDF_MERMAID_TIMEOUT_MS,
    );

    // Info: (20260810 - Emily) 佔位換回中文在 Node 做 —— 與前端同一支函式
    const painted = results.map((result, index) =>
      result.svg === null
        ? null
        : restoreSankeyLabels(result.svg, prepared[index].aliases),
    );

    const failures = results
      .map((result, index) => ({ index, error: result.error }))
      .filter((item) => item.error !== null);
    if (failures.length > 0) {
      logger.warn("[CarbonReportPdfService] mermaid render failures", {
        failures,
      });
    }

    /**
     * Info: (20260810 - Emily) 畫不出來的圖以說明取代,而不是留一塊空白。
     * 一份查證文件裡「這裡本來有一張圖」與「這裡什麼都沒有」是兩件事,
     * 讀的人必須分得出來。
     */
    await page.evaluate((svgs: Array<string | null>) => {
      const nodes = Array.from(document.querySelectorAll("pre.mermaid"));
      nodes.forEach((node, index) => {
        const svg = svgs[index];
        if (svg) {
          node.outerHTML = svg;
          return;
        }
        const notice = document.createElement("p");
        notice.className = "chart-failed";
        notice.textContent = "（此圖無法繪製，請於編輯畫面確認圖表語法）";
        node.replaceWith(notice);
      });
    }, painted);

    return {
      rendered: painted.filter(Boolean).length,
      failed: painted.length - painted.filter(Boolean).length,
    };
  }

  /**
   * Info: (20260810 - Emily) 版面判定:哪張表要轉橫式、要不要縮字級。
   *
   * 走過兩次錯的判準,兩次都被實測推翻:
   *   1.「欄數 ≥ 8」—— 把直式明明放得下的表推去橫式。
   *   2.「完全不換行需要多寬」—— 表格本來就可以換行,這個標準把 26 張表裡的 11 張
   *      判成橫式,其中 6 張連橫式都放不下。
   *
   * 真正的失敗條件是:**連為了可讀性設的欄寬下限都塞不進頁寬**。
   * 那時表格會撐破容器,而不是優雅地換行。所以量的是「照常排版後實際多寬」。
   *
   * 每多判一張橫式就多一次強制分頁(換頁樣式必然分頁),而分頁的代價是留白 ——
   * UAT 回報的「不必要的留白」就是標題留在前一張直式頁、表格自己跑到下一頁。
   * 因此標題與表格要包在同一個區塊裡一起搬。
   */
  private async applyPageLayout(
    page: IPrintPage,
  ): Promise<{ landscape: number; shrunk: number }> {
    return page.evaluate(
      (config: {
        portraitWidth: number;
        landscapeWidth: number;
        basePt: number;
        portraitFloorPt: number;
        minPt: number;
      }) => {
        const CAPTION = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P"]);
        let landscape = 0;
        let shrunk = 0;

        Array.from(document.querySelectorAll("table")).forEach((table) => {
          const wrap = document.createElement("section");
          wrap.className = "tablewrap";
          table.parentNode?.insertBefore(wrap, table);

          const prev = wrap.previousElementSibling;
          const isCaption =
            prev !== null &&
            CAPTION.has(prev.tagName) &&
            (prev.tagName !== "P" ||
              prev.firstElementChild?.tagName === "STRONG");
          if (isCaption && prev) wrap.appendChild(prev);
          wrap.appendChild(table);

          const widthOf = () => table.getBoundingClientRect().width;
          wrap.style.width = `${config.portraitWidth}px`;
          let pt = config.basePt;

          // 只差一點就放得下的表先縮字級留在直式:一次強制分頁的代價比 0.5pt 大得多
          while (
            widthOf() > config.portraitWidth + 1 &&
            pt > config.portraitFloorPt
          ) {
            pt = Math.round((pt - 0.5) * 10) / 10;
            table.style.fontSize = `${pt}pt`;
          }

          if (widthOf() > config.portraitWidth + 1) {
            pt = config.basePt;
            table.style.removeProperty("font-size");
            wrap.classList.add("wide");
            wrap.style.width = `${config.landscapeWidth}px`;
            landscape += 1;
            while (widthOf() > config.landscapeWidth + 1 && pt > config.minPt) {
              pt = Math.round((pt - 0.5) * 10) / 10;
              table.style.fontSize = `${pt}pt`;
            }
          }
          if (pt < config.basePt) shrunk += 1;
          wrap.style.removeProperty("width");
        });

        return { landscape, shrunk };
      },
      {
        portraitWidth: CARBON_PDF_PORTRAIT_CONTENT_PX,
        landscapeWidth: CARBON_PDF_LANDSCAPE_CONTENT_PX,
        basePt: CARBON_PDF_TABLE_BASE_PT,
        portraitFloorPt: CARBON_PDF_PORTRAIT_FLOOR_PT,
        minPt: CARBON_PDF_MIN_PT,
      },
    );
  }
}
