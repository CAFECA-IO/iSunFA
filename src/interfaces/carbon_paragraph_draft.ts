import { CarbonDisclosureFrameworkEnum } from "@/constants/carbon_report_framework";
// Info: (20260714 - Tzuhan) Carbon Chatbot 段落草稿生成的 DTO 定義
// Info: (20260714 - Tzuhan) LLM 只負責敘述撰寫與字串萃取;數值一律引用 contextFacts 原值,不做任何計算

import { ChatRoleEnum } from "@/types/carbon_chatbot.types";

// Info: (20260714 - Tzuhan) 供 AI 理解背景的對話片段(僅取最近 N 則,由前端裁切)
export interface IParagraphDraftContextMessage {
  role: ChatRoleEnum;
  text: string;
}

// Info: (20260714 - Tzuhan) 已確認事實:段落內文引用數值的唯一合法來源(附件萃取或盤查狀態填入)
export interface IContextFact {
  label: string;
  value: string;
  source?: string;
}

export interface IParagraphDraftInput {
  // Info: (20260714 - Tzuhan) 對應 CARBON_REPORT_OUTLINE 的段落 id(白名單驗證於 validator)
  paragraphId: string;
  conversationContext: IParagraphDraftContextMessage[];
  contextFacts?: IContextFact[];
  language?: string;
  // Info: (20260720 - Tzuhan) #55 修訂模式(兩者皆有值時啟用):既有段落原文 + 使用者修訂指示;
  // Info: (20260720 - Tzuhan) 修訂稿不直接落地,由前端對照卡人工確認後才寫入報告
  existingContent?: string;
  instruction?: string;
  /**
   * Info: (20260821 - Emily) 揭露框架。省略 = INVENTORY_ONLY(現行行為,只出盤查報告書)。
   *
   * 這裡是**選填**而 frameworkView 的參數是**必填**,兩者不矛盾:
   * API 邊界要向後相容(既有呼叫端不帶這個欄位),但服務層一進門就把 undefined
   * 收斂成明確的 enum 值 —— 「沒選」在系統內部不存在,只在線路上存在。
   */
  framework?: CarbonDisclosureFrameworkEnum;
}

export interface IParagraphDraft {
  paragraphId: string;
  code: string;
  title: string;
  // Info: (20260714 - Tzuhan) Markdown 內文,不含 h3 標頭(`### {段落標題}` 由報告預覽組稿時產生)
  content: string;
  // Info: (20260714 - Tzuhan) 內文實際引用的事實描述,供前端溯源顯示
  citedFacts: string[];
}
