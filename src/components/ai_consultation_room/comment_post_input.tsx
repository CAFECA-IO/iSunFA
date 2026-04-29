"use client";

import { useState, KeyboardEvent } from "react";
import { request } from "@/lib/utils/request";
import { User, Send, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useParams } from "next/navigation";
import { ApiCode } from "@/lib/utils/status";
import LoginButton from "@/components/common/login_button";
import { useAuth } from "@/contexts/auth_context";
import { IApiResponse } from "@/lib/utils/response";

interface ICommentPostInput {
  isShowInput: boolean;
  value: string;
  onChange: (val: string) => void;
  parentId?: string;
  onSuccess?: () => void;
}

export const CommentPostInput = ({
  isShowInput,
  value,
  onChange,
  parentId = "",
  onSuccess = undefined,
}: ICommentPostInput) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const params = useParams();
  const talkId = params?.talk_id as string;
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Info: (20260428 - Julian) 支援 @ 其他用戶的功能，透過 regex 抓取第一個 @ 後面的文字直到空白
  const replyToMatch = value.match(/@([^\s]+)/);
  const replyTo = replyToMatch ? replyToMatch[1] : "";

  // Info: (20260212 - Julian) 處理提交
  const handleSubmit = async () => {
    if (!value.trim() || isSubmitting || !user) return;

    try {
      setIsSubmitting(true);
      const data = await request<IApiResponse<object>>(
        `/api/v1/ai_consulting/thread/${talkId}/comment`,
        {
          method: "POST",
          body: JSON.stringify({
            content: value,
            parentId,
            isProfessional: false, // ToDo: 判斷是否為專業人士
            replyTo,
          }),
        },
      );
      if (data.code === ApiCode.SUCCESS) {
        onChange("");
        onSuccess?.();
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Info: (20260213 Julian) 處理按鍵事件
  const handleKeyDown = (e: KeyboardEvent) => {
    // Info: (20260213 Julian) 如果正在輸入法組字（選字）中，就直接跳過不執行
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const displayedSubmit = user ? (
    <button
      onClick={handleSubmit}
      disabled={!value.trim() || isSubmitting}
      className="flex items-center gap-2 rounded-xl bg-orange-600 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all active:scale-95 enabled:hover:bg-orange-500 disabled:opacity-50 disabled:active:scale-100 lg:px-5 lg:text-base"
    >
      {isSubmitting ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Send size={16} />
      )}
      <span>{t("ai_consultation_room.submit_comment")}</span>
    </button>
  ) : (
    <LoginButton label="Please login to comment" />
  );

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ${isShowInput ? "mb-6 max-h-60 opacity-100" : "mb-0 max-h-0 opacity-0"}`}
    >
      <div className="flex gap-4 rounded-4xl border border-orange-100 bg-orange-50/50 p-4 shadow-inner lg:p-6">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-orange-50 bg-white text-orange-200 shadow-sm lg:size-12 lg:rounded-2xl">
          <User className="size-4 shrink-0 lg:size-6" />
        </div>
        <div className="flex-1 space-y-2">
          <textarea
            id="ai-comment-input"
            aria-label={t("ai_consultation_room.submit_comment")}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("ai_consultation_room.comment_placeholder")}
            className="min-h-[100px] w-full resize-none rounded-2xl border border-orange-100 bg-white p-4 text-sm text-gray-500 shadow-sm transition-all placeholder:text-gray-300 focus:border-orange-500 focus:outline-none"
          />
          <div className="flex justify-end">{displayedSubmit}</div>
        </div>
      </div>
    </div>
  );
};
