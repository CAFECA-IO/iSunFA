"use client";

import { FileText } from "lucide-react";
import { IChatSession } from "@/types/carbon_chatbot.types";
import PdfEditor from "@/components/pdf_tool/pdf_editor";
import { useState } from "react";

interface ICarbonReportPreviewProps {
  session?: IChatSession;
}

const generateMockMarkdown = (session: IChatSession): string => {
  const isMock2025 = session.id === "2025";
  const progress = session.progress || 0;

  if (!isMock2025) {
    return (
      `# ${session.reportData?.title || "盤查報告"}\n\n## ${session.reportData?.section || ""}\n\n### 溫室氣體排放量摘要\n\n| 類別 (ISO Category) | 來源說明 | 排放量 (tCO2e) |\n| --- | --- | --- |\n` +
      (session.reportData?.categories
        .map(
          (c) =>
            `| **${c.name}** | ${c.description} | ${c.emissions.toFixed(2)} |`,
        )
        .join("\n") || "") +
      `\n\n**TOTAL GROSS EMISSIONS: ${session.reportData?.totalEmissions.toFixed(2)}**`
    );
  }

  let md = `# 卡菲卡智慧製造股份有限公司\n## 2025 年度碳盤查報告書 (草案)\n\n<span style="color: gray; font-size: 10px; font-weight: bold; letter-spacing: 0.2em;">REPORT STATUS: DRAFT GENERATED</span>\n\n---\n\n`;

  if (progress > 30) {
    md += `### SECTION 01: 基準年設定\n\n**SELECTED BASE YEAR: 2023 年度報告期間**\n\n根據 **ISO 14064-1** 規範，系統已自動校驗您的 2023 基準年數據。其中包含基礎電力排放係數 (0.495 kgCO2e/度) 與相關燃料排放因子，已同步更新至本報告草案中。此基準年將作為 2030 減碳 30% 之計算起點。\n\n---\n\n`;
  }

  if (progress > 60) {
    md += `### SECTION 02: 組織邊界鑑定\n\n- **鑑定方法**: 營運控制權法\n- **設施數量**: 4 個據點 (HQ + 3 工廠)\n- **排除範圍**: 外部租賃倉庫 (忽略)\n\n---\n\n`;
  }

  if (progress >= 85) {
    md +=
      `### SECTION 03: 溫室氣體排放量摘要\n\n| 類別 (ISO Category) | 來源說明 | 排放量 (tCO2e) |\n| --- | --- | --- |\n` +
      (session.reportData?.categories
        .map(
          (c) =>
            `| **${c.name}** | ${c.description.replace(/\n/g, "<br/>")} | ${c.emissions.toFixed(2)} |`,
        )
        .join("\n") || "") +
      `\n\n**TOTAL GROSS EMISSIONS: ${session.reportData?.totalEmissions.toFixed(2)}**\n`;
  }

  return md;
};

export default function CarbonReportPreview({
  session = {} as IChatSession,
}: ICarbonReportPreviewProps) {
  const [, setErrorModal] = useState({ isOpen: false, message: "" });

  const reportData = session?.reportData;

  if (!reportData) {
    return (
      <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center border-l border-gray-200 bg-[#f8fafc] text-gray-400">
        <FileText className="mb-4 h-12 w-12 opacity-20" />
        <p>目前尚未有報告資料</p>
      </div>
    );
  }

  const markdownContent = generateMockMarkdown(session);

  return (
    <div className="relative flex h-full w-full flex-1 flex-col border-l border-gray-200 bg-white">
      <PdfEditor
        layout="toggle"
        isEmbedded={true}
        value={markdownContent}
        setErrorModal={setErrorModal}
        storageKey={`chatbot_draft_${session.id}`}
      />
    </div>
  );
}
