"use client";

import { FileText } from "lucide-react";
import { IChatSession } from "@/types/carbon_chatbot.types";
import PdfEditor from "@/components/pdf_tool/pdf_editor";
import { useState } from "react";

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

interface ICarbonReportPreviewProps {
  session?: IChatSession;
  onMarkdownChange?: (val: string) => void;
  onToggleCompleted?: (id: string) => void;
  onToggleVerified?: (id: string) => void;
}

const generateMarkdownFromParagraphs = (session: IChatSession): string => {
  const isMock2025 = session.id === "2025";

  if (!isMock2025 || !session.reportData?.paragraphs) {
    return (
      `# ${session.reportData?.title || "盤查報告"}\n\n## ${session.reportData?.section || ""}\n\n### 溫室氣體排放量摘要\n\n| 類別 (ISO Category) | 來源說明 | 排放量 (tCO2e) |\n| --- | --- | --- |\n` +
      (session.reportData?.categories
        ?.map(
          (c) =>
            `| **${c.name}** | ${c.description} | ${c.emissions.toFixed(2)} |`,
        )
        .join("\n") || "") +
      `\n\n**TOTAL GROSS EMISSIONS: ${session.reportData?.totalEmissions?.toFixed(2) || 0}**`
    );
  }

  let md = `# 卡菲卡智慧製造股份有限公司\n## 2025 年度碳盤查報告書 (草案)\n\n<span style="color: gray; font-size: 10px; font-weight: bold; letter-spacing: 0.2em;">REPORT STATUS: DRAFT GENERATED</span>\n\n---\n\n`;

  session.reportData.paragraphs.forEach((p) => {
    md += `${p.content}\n\n---\n\n`;
  });

  return md;
};

export default function CarbonReportPreview({
  session = {} as IChatSession,
  onMarkdownChange = () => {},
  onToggleCompleted = () => {},
  onToggleVerified = () => {},
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

  const markdownContent = generateMarkdownFromParagraphs(session);
  const isMock2025 = session.id === "2025";

  return (
    <div className="relative flex h-full w-full flex-1 flex-col border-l border-gray-200 bg-white">
      {/* Info: (20260708 - Tzuhan) Paragraph Status Tracker UI */}
      {isMock2025 && reportData.paragraphs && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h3 className="mb-2 text-sm font-bold text-gray-700">
            段落狀態追蹤面板
          </h3>
          <div className="flex flex-col gap-2">
            {reportData.paragraphs.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md bg-white p-2 text-xs shadow-sm ring-1 ring-gray-200"
              >
                <span
                  className="w-1/3 truncate font-medium text-gray-700"
                  title={p.title}
                >
                  {p.title}
                </span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onToggleCompleted && onToggleCompleted(p.id)}
                    className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${p.isCompleted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                  >
                    {p.isCompleted ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <Circle size={14} />
                    )}
                    {p.isCompleted ? "已完成" : "未完成"}
                  </button>
                  <button
                    onClick={() => onToggleVerified && onToggleVerified(p.id)}
                    className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${p.isVerified ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
                  >
                    {p.isVerified ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <AlertCircle size={14} />
                    )}
                    {p.isVerified ? "已查核" : "未查核"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PdfEditor
        layout="toggle"
        isEmbedded={true}
        value={markdownContent}
        onChange={onMarkdownChange}
        setErrorModal={setErrorModal}
        storageKey={`chatbot_draft_${session.id}`}
      />
    </div>
  );
}
