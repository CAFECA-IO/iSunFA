// Info: (20260714 - Emily) 附件萃取 → 段落生成管線的 DTO 定義
// Info: (20260714 - Emily) LLM 只做「看懂附件 → 萃取字串事實 + 建議段落」;段落對應由 TS 白名單裁決,數值原樣萃取不換算

import { IContextFact, IParagraphDraft } from "@/interfaces/carbon_paragraph_draft";
import { IActivityRecord } from "@/types/carbon_chatbot.types";

// Info: (20260714 - Emily) 單一附件的萃取結果(suggestedParagraphIds 已通過白名單過濾)
export interface IAttachmentExtraction {
  facts: IContextFact[];
  suggestedParagraphIds: string[];
  confidence: "high" | "medium" | "low";
  // Info: (20260716 - Emily) #6518:已裁決的活動數據(source = 檔名)
  activities: IActivityRecord[];
}

// Info: (20260714 - Emily) 管線總結果:degraded = 任一附件解析失敗或信心不足,改以通用範本生成
export interface IAttachmentPipelineResult {
  drafts: IParagraphDraft[];
  facts: IContextFact[];
  degraded: boolean;
  // Info: (20260716 - Emily) #6518:附件中萃取的活動數據(已白名單裁決,source = 檔名)
  activities: IActivityRecord[];
}
