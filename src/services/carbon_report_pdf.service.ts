import fs from "fs";
import path from "path";
import { logger } from "@/lib/utils/logger";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  buildCarbonReportHtml,
  type ICarbonReportShell,
} from "@/lib/utils/carbon_report_html";
import { assertCjkRenderable } from "@/lib/utils/pdf_font_guard";
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

        const buffer = await page.pdf({
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
        });

        return {
          fileName: input.fileName,
          contentBase64: Buffer.from(buffer).toString("base64"),
          sizeBytes: buffer.length,
          landscapeTables: layout.landscape,
          chartsRendered: charts.rendered,
          chartsFailed: charts.failed,
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
