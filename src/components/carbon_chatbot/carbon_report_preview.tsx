"use client";

// Info: (20260713 - Tzuhan) 報告 artifact 檢視:工具列 + 章節導軌 + 目錄抽屜 + PDF 預覽(default)
// Info: (20260713 - Tzuhan) vibe 模式:段落由 AI 對話生成後即時出現於預覽;點導軌/目錄跳段會將對話目標切至該段

import { FileText } from "lucide-react";
import {
  IChatSession,
  IReportProgressStats,
} from "@/types/carbon_chatbot.types";
import { ReportSaveStatus } from "@/hooks/use_carbon_chat";
import PdfEditor from "@/components/pdf_tool/pdf_editor";
import { PdfToolViewMode } from "@/constants/pdf_tool";
import {
  MOBILE_MEDIA_QUERY,
  CARBON_REPORT_PARAGRAPH_ATTR,
  CARBON_REPORT_HIGHLIGHT_COLOR,
  CARBON_REPORT_HIGHLIGHTED_ATTR,
  buildCarbonReportFileName,
} from "@/constants/carbon_chatbot";
import {
  buildSectionHeadingByTitle,
  stripLeadingSectionHeading,
} from "@/constants/carbon_report_outline";
import {
  buildIdentityRows,
  missingIdentityFields,
  type ICarbonReportIdentity,
} from "@/lib/utils/carbon_report_identity";
import {
  buildDefaultReportName,
  resolveReportName,
  stripLeadingDocumentTitle,
} from "@/lib/utils/carbon_report_title";
import { CarbonDataBadgeStateEnum } from "@/lib/carbon_report_table.builder";
import { ReportToolbar } from "@/components/carbon_chatbot/report_toolbar";
import { ReportIdentityFields } from "@/components/carbon_chatbot/report_identity_fields";
import { CarbonDisclosureFrameworkEnum } from "@/constants/carbon_report_framework";
import { OutlineRail } from "@/components/carbon_chatbot/outline_rail";
import { OutlineDrawer } from "@/components/carbon_chatbot/outline_drawer";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";

interface ICarbonReportPreviewProps {
  session?: IChatSession;
  stats?: IReportProgressStats;
  activeParagraphId?: string | null;
  onMarkdownChange?: (val: string) => void;
  onJumpToParagraph?: (paragraphId: string) => void;
  onToggleVerified?: (paragraphId: string) => void;
  // Info: (20260714 - Tzuhan) AI 段落草稿生成(透傳給 OutlineDrawer → OutlineTree)
  draftingParagraphId?: string | null;
  onGenerateDraft?: (paragraphId: string) => void;
  // Info: (20260730 - Tzuhan) 產生結構圖(透傳至 OutlineTree;僅有對應模板的段落顯示按鈕)
  onGenerateDiagram?: (paragraphId: string) => void;
  // Info: (20260714 - Tzuhan) 對話↔報告雙向連動:短暫高亮的段落與「點報告段落 → 回跳對話訊息」callback
  highlightedParagraphId?: string | null;
  onParagraphHeadingClick?: (paragraphId: string) => void;
  // Info: (20260714 - Tzuhan) 報告草稿本機保存狀態(透傳給 ReportToolbar)
  saveStatus?: ReportSaveStatus;
  // Info: (20260716 - Tzuhan) #52 唯讀(帳本 VIEWER):編輯回呼由 hook 擋下,此 prop 供工具列顯示唯讀徽章
  readOnly?: boolean;
  // Info: (20260716 - Tzuhan) #56 匯入整份報告(透傳工具列)
  onImportReport?: (file: File) => void;
  // Info: (20260716 - Tzuhan) 報告檔名改名(透傳工具列)
  onRenameDocument?: (documentName: string) => void;
  /**
   * Info: (20260814 - Emily) 查證識別欄位逐格寫回（issue 24）。
   * 省略即不顯示那塊面板 —— 唯讀或尚未支援的使用端不該看到一個填不了的表單。
   */
  onUpdateIdentity?: (patch: ICarbonReportIdentity) => void;
  /**
   * Info: (20260903 - Emily) 揭露框架(#6688-A):與 identity 同一塊面板、不同儲存體。
   * 值來自盤查狀態(`ICarbonInventoryState.disclosureFramework`),
   * 所以由 hook 給值、由 hook 收寫入,這裡只負責把它接到面板上。
   */
  disclosureFramework?: CarbonDisclosureFrameworkEnum;
  onChangeDisclosureFramework?: (
    framework: CarbonDisclosureFrameworkEnum,
  ) => void;
  // Info: (20260720 - Tzuhan) #23 數據段落勾稽三態(透傳 OutlineDrawer → OutlineTree)
  dataBadgeState?: CarbonDataBadgeStateEnum;
}

// Info: (20260713 - Tzuhan) 渲染全部 33 段:已生成者顯示內容,未生成者顯示灰色佔位區塊,確保跳段永遠有落點且報告骨架一眼可見
const generateMarkdownFromParagraphs = (
  session: IChatSession,
  buildPendingSummary: (count: number) => string,
  draftStatusLine: string,
): string => {
  const paragraphs = session.reportData?.paragraphs;

  if (!paragraphs || paragraphs.length === 0) {
    return (
      // ToDo: (20260713 - Luphia) 報告預覽 markdown 表頭為硬編中文，如需多語系報告請改走 t()
      `# ${session.reportData?.title || ""}\n\n## ${session.reportData?.section || ""}\n\n### 溫室氣體排放量摘要\n\n| 類別 (ISO Category) | 來源說明 | 排放量 (tCO2e) |\n| --- | --- | --- |\n` +
      // Info: (20260720 - Tzuhan) #23 移除 .toFixed(numerical_precision_guideline):
      // Info: (20260720 - Tzuhan) emissions/totalEmissions 為引擎字串化 Decimal,直接渲染
      (session.reportData?.categories
        ?.map((c) => `| **${c.name}** | ${c.description} | ${c.emissions} |`)
        .join("\n") || "") +
      `\n\n**TOTAL GROSS EMISSIONS: ${session.reportData?.totalEmissions || "0"}**`
    );
  }

  // Info: (20260713 - Tzuhan) MarkdownContent 未啟用 rehype-raw,嚴禁在內容層塞原生 HTML;
  // Info: (20260713 - Tzuhan) 狀態徽章由 ReportToolbar 呈現,文件內僅保留 Markdown 原生語法的草稿聲明(匯出 PDF 亦可見)
  /**
   * Info: (20260812 - Emily) 不再輸出文件級 H1
   * (`data/issue_drafts/open/24_report_identity_fields.md`)。
   *
   * 原本是 `# ${session.title}` —— 而 `session.title` 是**使用者第一則訊息截斷 24 字**
   * (`use_carbon_chat.ts` 的 `session.title = firstUserMessage.text.trim().slice(0, 24)`)。
   * 於是那份要送第三方查證的 53 頁報告，第一頁印的是 `8/12.test1`。
   *
   * 報告名稱改走文件外殼 `ICarbonReportShell.title`:它是文件的中繼資料而不是內容，
   * 而 ADR 014 要求 `content` 逐字照抄原文。留在內容裡還有一個實際後果 ——
   * 使用者可以在編輯器裡把它刪掉，然後那份文件就沒有名稱了，而沒有人會發現。
   */
  let md = `> _${draftStatusLine}_\n\n---\n\n`;

  // Info: (20260714 - Tzuhan) 標頭一律由 p.title 組出;content 只存內文(stripLeadingSectionHeading 相容舊格式殘留標頭)
  // Info: (20260730 - Tzuhan) 版面收斂:原本每個空段落都輸出一整句「本段尚未生成…」,
  // Info: (20260730 - Tzuhan) 33 節全空時就是同一句話刷屏 30 次 —— 那不是內容,是噪音,還會把已寫好的段落擠到看不見。
  // Info: (20260730 - Tzuhan) 改為把「連續未生成」的節收成一列摘要(標頭仍逐節輸出,跳段落點與大綱骨架不受影響)。
  const flushPending = (pending: string[]): string =>
    pending.length === 0
      ? ""
      : `> _${buildPendingSummary(pending.length)}_\n\n---\n\n`;

  let pendingTitles: string[] = [];
  paragraphs.forEach((p) => {
    if (!p.content) {
      // Info: (20260730 - Tzuhan) 空段落仍輸出標頭(跳段需要落點),但內文暫存,待遇到有內容的段落或結尾才一次收攏
      pendingTitles.push(p.title);
      md += `${buildSectionHeadingByTitle(p.title)}\n\n`;
      return;
    }
    md += flushPending(pendingTitles);
    pendingTitles = [];
    md += `${buildSectionHeadingByTitle(p.title)}\n\n${stripLeadingSectionHeading(p.content)}\n\n---\n\n`;
  });
  md += flushPending(pendingTitles);

  return md;
};

export default function CarbonReportPreview({
  session = {} as IChatSession,
  stats = undefined,
  activeParagraphId = null,
  onMarkdownChange = () => {},
  onJumpToParagraph = () => {},
  onToggleVerified = () => {},
  draftingParagraphId = null,
  onGenerateDraft = undefined,
  onGenerateDiagram = undefined,
  highlightedParagraphId = null,
  onParagraphHeadingClick = undefined,
  saveStatus = null,
  readOnly = false,
  onImportReport = undefined,
  onRenameDocument = undefined,
  onUpdateIdentity = undefined,
  disclosureFramework = undefined,
  onChangeDisclosureFramework = undefined,
  dataBadgeState = undefined,
}: ICarbonReportPreviewProps) {
  const { t } = useTranslation();
  const [, setErrorModal] = useState({ isOpen: false, message: "" });
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  /**
   * Info: (20260814 - Emily) 查證識別欄位面板（issue 24）。
   *
   * 預設收合:那四格填一次就不再動,常駐展開會永久吃掉報告的高度。
   * 但工具列的觸發鈕會顯示「還缺幾項」,所以沒填也不會被忘記。
   */
  const [isIdentityOpen, setIsIdentityOpen] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const reportData = session?.reportData;
  // Info: (20260713 - Tzuhan) useMemo 穩定引用,避免 useEffect 依賴每次 render 變動
  const paragraphs = useMemo(
    () => reportData?.paragraphs ?? [],
    [reportData?.paragraphs],
  );
  const hasOutline = paragraphs.length > 0;

  // Info: (20260714 - Tzuhan) 錨點注入:段落標題全 33 段唯一,以「h3 文字 = 段落標題」對應注入段落 id
  // Info: (20260714 - Tzuhan) (Markdown 渲染層不支援原生 HTML,故於渲染後注入 data attribute)
  useEffect(() => {
    if (!previewContainerRef.current) return undefined;
    const timer = setTimeout(() => {
      const titleToId = new Map(paragraphs.map((p) => [p.title, p.id]));
      const headings =
        previewContainerRef.current?.querySelectorAll("h3") ?? [];
      Array.from(headings).forEach((heading) => {
        const paragraphId = titleToId.get(heading.textContent?.trim() ?? "");
        if (!paragraphId) return;
        heading.setAttribute(CARBON_REPORT_PARAGRAPH_ATTR, paragraphId);
        // Info: (20260714 - Tzuhan) 反向連動:點報告段落標題 → 回跳對話關聯訊息
        if (onParagraphHeadingClick) {
          const el = heading as HTMLElement;
          el.style.cursor = "pointer";
          el.onclick = () => onParagraphHeadingClick(paragraphId);
        }
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [paragraphs, onParagraphHeadingClick]);

  // Info: (20260713 - Tzuhan) 跳段時將 PDF 預覽捲動至該段標題;優先用 data 錨點,注入未完成時退回標題文字比對
  useEffect(() => {
    if (!activeParagraphId || !previewContainerRef.current) return undefined;
    const target = paragraphs.find((p) => p.id === activeParagraphId);
    if (!target) return undefined;

    const timer = setTimeout(() => {
      const container = previewContainerRef.current;
      if (!container) return;
      const anchor = container.querySelector(
        `[${CARBON_REPORT_PARAGRAPH_ATTR}="${activeParagraphId}"]`,
      );
      const match =
        anchor ??
        Array.from(container.querySelectorAll("h3")).find((h) =>
          h.textContent?.includes(target.title),
        ) ??
        null;
      match?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => clearTimeout(timer);
  }, [activeParagraphId, paragraphs]);

  // Info: (20260714 - Tzuhan) 即時高亮:草稿寫入或 chip 點擊時,段落區塊(標題至下一個 h3/hr)短暫上色後淡出
  useEffect(() => {
    if (!highlightedParagraphId || !previewContainerRef.current) {
      return undefined;
    }
    const container = previewContainerRef.current;
    const applied: HTMLElement[] = [];

    const timer = setTimeout(() => {
      const heading = container.querySelector(
        `[${CARBON_REPORT_PARAGRAPH_ATTR}="${highlightedParagraphId}"]`,
      ) as HTMLElement | null;
      if (!heading) return;

      let node: Element | null = heading;
      while (node) {
        const el = node as HTMLElement;
        el.style.transition = "background-color 0.5s ease";
        el.style.backgroundColor = CARBON_REPORT_HIGHLIGHT_COLOR;
        // Info: (20260714 - Tzuhan) 標記高亮元素,供下載前清理(高亮不得滲入 PDF)
        el.setAttribute(CARBON_REPORT_HIGHLIGHTED_ATTR, "true");
        applied.push(el);
        node = node.nextElementSibling;
        if (node && (node.tagName === "H3" || node.tagName === "HR")) break;
      }
    }, 250);

    // Info: (20260714 - Tzuhan) highlightedParagraphId 逾時歸零時清除底色,靠 transition 淡出
    return () => {
      clearTimeout(timer);
      applied.forEach((el) => {
        el.style.backgroundColor = "";
        el.removeAttribute(CARBON_REPORT_HIGHLIGHTED_ATTR);
      });
    };
  }, [highlightedParagraphId]);

  // Info: (20260714 - Tzuhan) 下載快照前同步清除殘留高亮(React 狀態清除非同步,直接操作 DOM 確保快照乾淨)
  const handleBeforeDownload = () => {
    const container = previewContainerRef.current;
    if (!container) return;
    container
      .querySelectorAll<HTMLElement>(`[${CARBON_REPORT_HIGHLIGHTED_ATTR}]`)
      .forEach((el) => {
        el.style.transition = "";
        el.style.backgroundColor = "";
        el.removeAttribute(CARBON_REPORT_HIGHLIGHTED_ATTR);
      });
  };

  if (!reportData) {
    return (
      <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center border-l border-gray-200 bg-gray-50 text-gray-400">
        <FileText className="mb-4 h-12 w-12 opacity-20" />
        <p>{t("carbon_chatbot.no_report_data")}</p>
      </div>
    );
  }

  // Info: (20260713 - Tzuhan) <xl 抽屜為全寬獨占,跳段後自動關閉回到 PDF 落點;xl+ 維持開啟便於連續瀏覽
  const handleDrawerJump = (paragraphId: string) => {
    onJumpToParagraph(paragraphId);
    if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
      setIsDrawerOpen(false);
    }
  };

  // Info: (20260716 - Tzuhan) 報告保真:rawMarkdown(使用者所見即所存)優先;無則以大綱組稿骨架起始
  const storedMarkdown =
    reportData?.rawMarkdown ??
    generateMarkdownFromParagraphs(
      session,
      (count) => t("carbon_chatbot.sections_pending_summary", { count }),
      t("carbon_chatbot.report_status_draft"),
    );

  /**
   * Info: (20260812 - Emily) 既有草稿的讀取端補救
   * (`data/issue_drafts/open/24_report_identity_fields.md`)。
   *
   * `rawMarkdown` 是權威來源而且是**逐段 patch** 的 —— 已經存過的草稿，
   * 第一行早就烤進了 `# <會話名>`，不會因為產生端改了就變。
   * 這與 timeline、私有區符號、表頭補欄是同一個形狀（修正端 ≠ 生效端），
   * 那三次都因此被回報「沒修好」。
   *
   * ## 這裡只**讀**標題，不改傳下去的內容
   *
   * 剝除發生在兩個**渲染端**（`MarkdownContent` 的 `stripDocumentTitle`
   * 與 `buildCarbonReportHtml`），與 timeline／私有區符號的補救放在同一層。
   *
   * 不能在這裡剝：`PdfEditor` 的 `value` 同時餵編輯器與預覽，而 `onChange`
   * 會把內容存回 `rawMarkdown` —— 傳一份剝過的進去，使用者**編輯一次**
   * 那行標題就從儲存裡消失了，而它是目前唯一的名稱來源。
   * 一次編輯換來一份無名的查證文件，而且沒有人會發現。
   */
  const { title: legacyHeading } = stripLeadingDocumentTitle(storedMarkdown);
  const markdownContent = storedMarkdown;

  /**
   * Info: (20260812 - Emily) 沒有名稱時**留空，不猜**。
   *
   * 與目錄頁碼「找不到就留白」同一個判準:第一頁沒有標題是一眼看得出來的缺漏，
   * 而一個猜出來的名稱印在查證文件的封面上會被當成事實。
   *
   * Info: (20260814 - Emily) 退路改為「盤查年度 + 報告書」（issue 24）。
   *
   * 仍然**不猜公司名**：報告 1.1 節雖然寫著公司名稱，但抽錯的代價是封面印成
   * 另一家公司。盤查年度不一樣 —— 它是**使用者自己填的**識別欄位而不是抽出來的，
   * 拿它組名稱不算猜。年度也沒填時 `buildDefaultReportName` 回空字串，
   * 第一頁就沒有標題，維持「留空不猜」。
   */
  const identity = reportData?.identity;
  const reportTitle = resolveReportName({
    explicitName: reportData?.reportName,
    legacyHeading,
    fallback: buildDefaultReportName({
      inventoryYear: identity?.inventoryYear,
      suffix: t("admin_mission_board.pdf_editor.report_identity.name_suffix")!,
    }),
  });

  /**
   * Info: (20260814 - Emily) 四列一律都給，沒填的填「未填寫」（見 buildIdentityRows）。
   * 文案在這裡取而不是在渲染端寫死:純函式與伺服端都不知道使用者的語言。
   */
  const identityRows = buildIdentityRows({
    identity,
    labels: {
      inventoryYear: t(
        "admin_mission_board.pdf_editor.report_identity.inventory_year",
      )!,
      preparedBy: t(
        "admin_mission_board.pdf_editor.report_identity.prepared_by",
      )!,
      verifiedBy: t(
        "admin_mission_board.pdf_editor.report_identity.verified_by",
      )!,
      issuedOn: t("admin_mission_board.pdf_editor.report_identity.issued_on")!,
    },
    placeholder: t("admin_mission_board.pdf_editor.report_identity.unfilled")!,
  });

  return (
    <div className="relative flex h-full w-full flex-1 flex-col border-l border-gray-200 bg-white">
      {hasOutline && stats && (
        <ReportToolbar
          readOnly={readOnly}
          onImportReport={onImportReport}
          onRenameDocument={onRenameDocument}
          documentName={reportData.documentName}
          stats={stats}
          importedFrom={reportData.importedFrom}
          status={session.status}
          statusColor={session.statusColor}
          isDrawerOpen={isDrawerOpen}
          onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
          saveStatus={saveStatus}
          onToggleIdentity={
            onUpdateIdentity && !readOnly
              ? () => setIsIdentityOpen((prev) => !prev)
              : undefined
          }
          identityMissing={missingIdentityFields(identity).length}
          isIdentityOpen={isIdentityOpen}
        />
      )}
      {/* Info: (20260814 - Emily) 面板貼在工具列下方而不是做成 modal:
          這四項要邊看報告邊填（年度對照 2.1 節、製作單位對照 1.4 節），
          modal 會把要對照的東西蓋掉。 */}
      {isIdentityOpen && onUpdateIdentity && (
        <ReportIdentityFields
          identity={identity}
          onChange={onUpdateIdentity}
          framework={disclosureFramework}
          onChangeFramework={onChangeDisclosureFramework}
          readOnly={readOnly}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {/* Info: (20260713 - Tzuhan) <xl 且抽屜開啟時隱藏導軌,讓目錄獨占畫面 */}
        {hasOutline && (
          <OutlineRail
            paragraphs={paragraphs}
            activeParagraphId={activeParagraphId}
            onJump={onJumpToParagraph}
            // Info: (20260714 - Tzuhan) 手機(<md)隱藏導軌讓出預覽寬度,目錄改由工具列抽屜提供
            className={isDrawerOpen ? "hidden xl:flex" : "hidden md:flex"}
          />
        )}

        {hasOutline && isDrawerOpen && (
          <OutlineDrawer
            paragraphs={paragraphs}
            activeParagraphId={activeParagraphId}
            onJump={handleDrawerJump}
            onToggleVerified={onToggleVerified}
            onClose={() => setIsDrawerOpen(false)}
            draftingParagraphId={draftingParagraphId}
            onGenerateDraft={onGenerateDraft}
            onGenerateDiagram={onGenerateDiagram}
            dataBadgeState={dataBadgeState}
          />
        )}

        {/* Info: (20260713 - Tzuhan) <xl 且抽屜開啟時隱藏 PDF 區,避免與全寬目錄擠壓並排 */}
        <div
          ref={previewContainerRef}
          className={`min-w-0 flex-1 overflow-y-auto ${
            isDrawerOpen ? "hidden xl:block" : ""
          }`}
        >
          {/* Info: (20260730 - Tzuhan) 版面收斂:原本 layout="split" 讓 Markdown 與 PDF 預覽水平並排,
              但兩欄顯示的是同一份內容 —— 並排不增加資訊,只把每欄壓到一半寬度,而右欄又常被聊天面板遮住。
              改 layout="toggle":單欄全寬 + 編輯/預覽切換鈕,寬度全給正在看的那一邊。
              預設 PREVIEW:進來先看報告成品,要改再切編輯。 */}
          <PdfEditor
            layout="toggle"
            isEmbedded={true}
            defaultViewMode={PdfToolViewMode.PREVIEW}
            contentVariant="compact"
            value={markdownContent}
            /*
             * Info: (20260812 - Emily) 報告名稱走文件外殼，不走內容
             * (`data/issue_drafts/open/24_report_identity_fields.md`)。
             * 空字串代表還沒命名 —— 外殼那端不印，而不是印一個猜出來的名稱。
             */
            reportTitle={reportTitle}
            identityRows={identityRows}
            /*
             * Info: (20260904 - Emily) #6688-C:框架往下送到伺服端列印。
             * 與上面 report_identity_fields 收到的是同一個值 ——
             * 使用者選的那個框架決定紙上印哪一套聲明行。
             */
            disclosureFramework={disclosureFramework}
            /*
             * Info: (20260812 - Emily) 既有草稿內容裡那行 `# <會話名>` 在**渲染時**剝掉。
             * 儲存的內容不動 —— 見上方 legacyHeading 那段。
             */
            stripDocumentTitle
            /*
             * Info: (20260820 - Emily) 剝掉「標頭後緊接一行同文」的那一行。
             * 組稿端一律由 `p.title` 產生標頭，內容第一行的同文是重複；
             * 這個旗標在 `MarkdownContent` 預設關閉（那支元件還服務 16 個
             * 非碳使用端，剝掉會是靜默的內容遺失），所以碳報告這端要主動開。
             */
            stripEchoedHeadings
            onChange={onMarkdownChange}
            setErrorModal={setErrorModal}
            storageKey={`chatbot_draft_${session.id}`}
            // Info: (20260716 - Tzuhan) 下載檔名跟隨使用者自訂的報告檔名(可於工具列改名)
            downloadFileName={
              reportData?.documentName ??
              buildCarbonReportFileName(session.title)
            }
            onBeforeDownload={handleBeforeDownload}
            /*
             * Info: (20260810 - Emily) 盤查報告走伺服端向量列印
             * (data/issue_drafts/inventory_table_import/17)。
             *
             * 只有這裡開:報告動輒上百頁、含跨頁表格,而且要交給查證人員 ——
             * 前端光柵化產出的是點陣圖,一個排放量數字都複製不出來。
             * 文件工具與公開分享頁維持原路徑(後者沒有登入,打不到這條端點)。
             */
            serverPrint
            /*
             * Info: (20260810 - Emily) 還原原文的段落斷行 —— 盤查報告的敘述
             * 逐條編號本來就分行寫，被 markdown 的軟斷行收成一整片文字牆
             * （最長一段 6,212 字）。預覽與列印要看到同一份。
             */
            restoreSourceLineBreaks
          />
        </div>
      </div>
    </div>
  );
}
