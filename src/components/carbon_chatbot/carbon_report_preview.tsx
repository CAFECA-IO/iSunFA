"use client";

// Info: (20260713 - Tzuhan) 報告 artifact 檢視:工具列 + 章節導軌 + 目錄抽屜 + PDF 預覽(default)
// Info: (20260713 - Tzuhan) vibe 模式:段落由 AI 對話生成後即時出現於預覽;點導軌/目錄跳段會將對話目標切至該段

import { FileText } from "lucide-react";
import {
  IChatSession,
  IReportProgressStats,
} from "@/types/carbon_chatbot.types";
import PdfEditor from "@/components/pdf_tool/pdf_editor";
import { PdfToolViewMode } from "@/constants/pdf_tool";
import { MOBILE_MEDIA_QUERY } from "@/constants/carbon_chatbot";
import { buildSectionHeadingByTitle } from "@/constants/carbon_report_outline";
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

  paragraphs.forEach((p, index) => {
    const block =
      p.content ||
      `${buildSectionHeadingByTitle(p.title, index)}\n\n> _${placeholderHint}_`;
    md += `${block}\n\n---\n\n`;
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

  // Info: (20260713 - Tzuhan) 跳段時將 PDF 預覽捲動至該段標題(以段落標題文字定位);未生成段落亦有佔位落點
  useEffect(() => {
    if (!activeParagraphId || !previewContainerRef.current) return undefined;
    const target = paragraphs.find((p) => p.id === activeParagraphId);
    if (!target) return undefined;

    const timer = setTimeout(() => {
      const headings =
        previewContainerRef.current?.querySelectorAll("h3") ?? [];
      const match = Array.from(headings).find((h) =>
        h.textContent?.includes(target.title),
      );
      match?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(timer);
  }, [activeParagraphId, paragraphs]);

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
          <PdfEditor
            layout="toggle"
            isEmbedded={true}
            defaultViewMode={PdfToolViewMode.PREVIEW}
            contentVariant="compact"
            value={markdownContent}
            onChange={onMarkdownChange}
            setErrorModal={setErrorModal}
            storageKey={`chatbot_draft_${session.id}`}
          />
        </div>
      </div>
    </div>
  );
}
