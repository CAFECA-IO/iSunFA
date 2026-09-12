import { User } from "lucide-react";
import { IChatMessage } from "@/types/carbon_chatbot.types";
import { AttachmentCard } from "@/components/carbon_chatbot/attachment_card";

export interface IUserBubbleProps {
  message: IChatMessage;
}
import { useTranslation } from "@/i18n/i18n_context";

export function UserBubble({ message }: IUserBubbleProps) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end gap-4">
      {/* Info: (20260716 - Tzuhan) min-w-0 + max-w-full:長檔名/長字串不得撐破聊天視窗(UAT 破版修正) */}
      <div className="flex max-w-xl min-w-0 flex-1 flex-col items-end">
        {/**
         * Info: (20260907 - Emily) 使用者這一側**刻意維持純文字**,只補 `whitespace-pre-wrap`。
         *
         * 回覆那側改用 markdown 渲染(見 `ai_bubble`),但使用者打的字不是 markdown 來源,
         * 交給 markdown 規則會改寫他的原話。實測 remark-gfm:
         *
         *     "3. 上游運輸 15.4379"  → 變成編號清單(數字被吃成項目編號)
         *     "3*5=15 而 2*4*6"     → 星號被讀成強調(算式逸出只保護「兩側都是算式字元」的那些)
         *     "# 我的問題"           → 變成 H1
         *
         * 使用者送出的是什麼,泡泡就該顯示什麼 —— 這一側的判準是「原樣」,不是「排版」。
         * `whitespace-pre-wrap` 是順手修的:在此之前他打的換行在 HTML 裡被折成空白,
         * 三行變一行,而那也是他送出去的內容的一部分。
         *
         * 若日後產品決定兩側都渲染(例如使用者要貼表格進來討論),改法是把下面那段
         * 換成與 `ai_bubble` 相同的 `MarkdownContent`(`theme="dark"` —— 橘底屬深色),
         * 並更新 `carbon_chat_markdown.test.ts` 裡釘住這個邊界的那一條。
         */}
        <div className="max-w-full min-w-0 rounded-[24px] rounded-tr-none bg-[#ff5a00] p-5 leading-relaxed font-bold break-words whitespace-pre-wrap text-white shadow-sm shadow-orange-500/20">
          {message.text}

          {/* Info: (20260714 - Tzuhan) 使用者上傳的附件卡片(與 AIBubble 共用 AttachmentCard) */}
          {message.attachments?.map((attachment) => (
            <AttachmentCard
              key={`${message.id}-${attachment.name}`}
              attachment={attachment}
            />
          ))}
        </div>
        <div className="mt-2 mr-2 text-xs font-bold text-gray-400">
          {t("common.system_admin")}
        </div>
      </div>

      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-100 bg-white shadow-sm">
        <User className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
}
