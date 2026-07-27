// Info: (20260714 - Tzuhan) Carbon Chatbot session 工廠(取代 carbon_chatbot.mock 的假資料)
// Info: (20260714 - Tzuhan) 段落一律從空白骨架展開;內容僅能由 AI 對話/附件管線生成或自 localStorage 草稿還原

import {
  IChatSession,
  IReportParagraph,
  SessionStatusEnum,
} from "@/types/carbon_chatbot.types";
import { DEFAULT_SESSION_ID } from "@/constants/carbon_chatbot";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";

// Info: (20260714 - Tzuhan) 預設 session 標題(初次進入的年度盤查)
export const DEFAULT_SESSION_TITLE = "2025 溫室氣體盤查報告";

// Info: (20260713 - Tzuhan) 由標準大綱展開 33 段初始狀態;未生成段落 content 為空字串
export const buildInitialParagraphs = (): IReportParagraph[] =>
  CARBON_REPORT_OUTLINE.map((section) => ({
    id: section.id,
    chapterId: section.chapterId,
    code: section.code,
    title: `${section.code} ${section.title}`,
    content: "",
    isCompleted: false,
    isVerified: false,
    isDataDriven: section.isDataDriven,
  }));

// Info: (20260714 - Tzuhan) 建立全新 session:空對話 + 空白 33 段報告骨架
export const createChatSession = (
  id: string,
  title: string,
  time: string,
): IChatSession => ({
  id,
  title,
  time,
  status: SessionStatusEnum.IN_PROGRESS,
  statusColor: "text-orange-500 bg-orange-100",
  progress: 0,
  messages: [],
  reportData: {
    documentName: `Carbon_Report_Draft_${id}.pdf`,
    title,
    section: "",
    categories: [],
    paragraphs: buildInitialParagraphs(),
    totalEmissions: 0,
  },
});

export const createDefaultSessions = (): Record<string, IChatSession> => ({
  [DEFAULT_SESSION_ID]: createChatSession(
    DEFAULT_SESSION_ID,
    DEFAULT_SESSION_TITLE,
    new Date().toLocaleDateString(),
  ),
});
