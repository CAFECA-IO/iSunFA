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
import { ReportToolbar } from "@/components/carbon_chatbot/report_toolbar";
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
  // Info: (20260714 - Emily) AI 段落草稿生成(透傳給 OutlineDrawer → OutlineTree)
  draftingParagraphId?: string | null;
  onGenerateDraft?: (paragraphId: string) => void;
  // Info: (20260714 - Emily) 對話↔報告雙向連動:短暫高亮的段落與「點報告段落 → 回跳對話訊息」callback
  highlightedParagraphId?: string | null;
  onParagraphHeadingClick?: (paragraphId: string) => void;
  // Info: (20260714 - Emily) 報告草稿本機保存狀態(透傳給 ReportToolbar)
  saveStatus?: ReportSaveStatus;
}

// Info: (20260713 - Tzuhan) 渲染全部 33 段:已生成者顯示內容,未生成者顯示灰色佔位區塊,確保跳段永遠有落點且報告骨架一眼可見
const generateMarkdownFromParagraphs = (
  session: IChatSession,
  placeholderHint: string,
  draftStatusLine: string,
): string => {
  const paragraphs = session.reportData?.paragraphs;

  if (!paragraphs || paragraphs.length === 0) {
    return (
      `# ${session.reportData?.title || ""}\n\n## ${session.reportData?.section || ""}\n\n### 溫室氣體排放量摘要\n\n| 類別 (ISO Category) | 來源說明 | 排放量 (tCO2e) |\n| --- | --- | --- |\n` +
      (session.reportData?.categories
        ?.map(
          (c) =>
            `| **${c.name}** | ${c.description} | ${c.emissions.toFixed(2)} |`,
        )
        .join("\n") || "") +
      `\n\n**TOTAL GROSS EMISSIONS: ${session.reportData?.totalEmissions?.toFixed(2) || 0}**`
    );
  }

  // Info: (20260713 - Tzuhan) MarkdownContent 未啟用 rehype-raw,嚴禁在內容層塞原生 HTML;
  // Info: (20260713 - Tzuhan) 狀態徽章由 ReportToolbar 呈現,文件內僅保留 Markdown 原生語法的草稿聲明(匯出 PDF 亦可見)
  let md = `# ${session.title}\n\n> _${draftStatusLine}_\n\n---\n\n`;

  // Info: (20260714 - Emily) 標頭一律由 p.title 組出;content 只存內文(stripLeadingSectionHeading 相容舊格式殘留標頭)
  paragraphs.forEach((p) => {
    const body = p.content
      ? stripLeadingSectionHeading(p.content)
      : `> _${placeholderHint}_`;
    md += `${buildSectionHeadingByTitle(p.title)}\n\n${body}\n\n---\n\n`;
  });

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
  highlightedParagraphId = null,
  onParagraphHeadingClick = undefined,
  saveStatus = null,
}: ICarbonReportPreviewProps) {
  const { t } = useTranslation();
  const [, setErrorModal] = useState({ isOpen: false, message: "" });
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const reportData = session?.reportData;
  // Info: (20260713 - Tzuhan) useMemo 穩定引用,避免 useEffect 依賴每次 render 變動
  const paragraphs = useMemo(
    () => reportData?.paragraphs ?? [],
    [reportData?.paragraphs],
  );
  const hasOutline = paragraphs.length > 0;

  // Info: (20260714 - Emily) 錨點注入:段落標題全 33 段唯一,以「h3 文字 = 段落標題」對應注入段落 id
  // Info: (20260714 - Emily) (Markdown 渲染層不支援原生 HTML,故於渲染後注入 data attribute)
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
        // Info: (20260714 - Emily) 反向連動:點報告段落標題 → 回跳對話關聯訊息
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

  // Info: (20260714 - Emily) 即時高亮:草稿寫入或 chip 點擊時,段落區塊(標題至下一個 h3/hr)短暫上色後淡出
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
        // Info: (20260714 - Emily) 標記高亮元素,供下載前清理(高亮不得滲入 PDF)
        el.setAttribute(CARBON_REPORT_HIGHLIGHTED_ATTR, "true");
        applied.push(el);
        node = node.nextElementSibling;
        if (node && (node.tagName === "H3" || node.tagName === "HR")) break;
      }
    }, 250);

    // Info: (20260714 - Emily) highlightedParagraphId 逾時歸零時清除底色,靠 transition 淡出
    return () => {
      clearTimeout(timer);
      applied.forEach((el) => {
        el.style.backgroundColor = "";
        el.removeAttribute(CARBON_REPORT_HIGHLIGHTED_ATTR);
      });
    };
  }, [highlightedParagraphId]);

  // Info: (20260714 - Emily) 下載快照前同步清除殘留高亮(React 狀態清除非同步,直接操作 DOM 確保快照乾淨)
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
      <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center border-l border-gray-200 bg-[#f8fafc] text-gray-400">
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

  const markdownContent = generateMarkdownFromParagraphs(
    session,
    t("carbon_chatbot.section_placeholder"),
    t("carbon_chatbot.report_status_draft"),
  );

  return (
    <div className="relative flex h-full w-full flex-1 flex-col border-l border-gray-200 bg-white">
      {hasOutline && stats && (
        <ReportToolbar
          documentName={reportData.documentName}
          stats={stats}
          status={session.status}
          statusColor={session.statusColor}
          isDrawerOpen={isDrawerOpen}
          onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
          saveStatus={saveStatus}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {/* Info: (20260713 - Tzuhan) <xl 且抽屜開啟時隱藏導軌,讓目錄獨占畫面 */}
        {hasOutline && (
          <OutlineRail
            paragraphs={paragraphs}
            activeParagraphId={activeParagraphId}
            onJump={onJumpToParagraph}
            className={isDrawerOpen ? "hidden xl:flex" : ""}
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
          />
        )}

        {/* Info: (20260713 - Tzuhan) <xl 且抽屜開啟時隱藏 PDF 區,避免與全寬目錄擠壓並排 */}
        <div
          ref={previewContainerRef}
          className={`min-w-0 flex-1 overflow-y-auto ${
            isDrawerOpen ? "hidden xl:block" : ""
          }`}
        >
          {/* Info: (20260714 - Emily) 報告成為主視圖後寬度足夠,改 split 讓編輯與預覽水平並排(窄螢幕自動退回切換模式) */}
          <PdfEditor
            layout="split"
            isEmbedded={true}
            defaultViewMode={PdfToolViewMode.EDIT}
            contentVariant="compact"
            value={markdownContent}
            onChange={onMarkdownChange}
            setErrorModal={setErrorModal}
            storageKey={`chatbot_draft_${session.id}`}
            downloadFileName={buildCarbonReportFileName(session.title)}
            onBeforeDownload={handleBeforeDownload}
          />
        </div>
      </div>
    </div>
  );
}
