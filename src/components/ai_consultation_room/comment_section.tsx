"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { IComment } from "@/interfaces/ai_talk";
import { CommentItem } from "@/components/ai_consultation_room/comment_item";
import { CommentPostInput } from "@/components/ai_consultation_room/comment_post_input";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

export const CommentSection = () => {
  const { t } = useTranslation();
  const params = useParams();
  const threadId = params?.talk_id ?? "";

  const [isShowInput, setIsShowInput] = useState<boolean>(true);
  const [commentInput, setCommentInput] = useState<string>("");
  const [comments, setComments] = useState<IComment[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const fetchComments = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!threadId) return;
    const loadComments = async () => {
      try {
        const data = await request<IApiResponse<IComment[]>>(
          `/api/v1/ai_talk/thread/${threadId}/comment`,
        );
        if (data.code === ApiCode.SUCCESS && data.payload) {
          setComments(data.payload);
        }
      } catch (err) {
        console.error("Fetch comments error:", err);
      }
    };
    loadComments();
  }, [threadId, refreshKey]);

  const openInputHandler = () => {
    if (isShowInput) setCommentInput("");
    setIsShowInput((prev) => !prev);
  };

  const displayedComments =
    comments.length > 0 ? (
      <div className="mt-6 space-y-6">
        {/* Info: (20260206 - Julian) 會計師評論範例 */}
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onSuccess={fetchComments}
          />
        ))}

        {/* Info: (20260206 - Julian) 更多留言載入 */}
        <button className="w-full rounded-2xl border-2 border-dashed border-gray-100 py-4 font-bold text-gray-300 transition-all hover:border-orange-200 hover:text-orange-400">
          {t("ai_consultation_room.load_more")}
        </button>
      </div>
    ) : (
      <div className="mt-6 flex h-20 items-center justify-center text-gray-400">
        {t("ai_consultation_room.no_discussions")}
      </div>
    );

  return (
    <section className="pt-20">
      <div className="mb-8 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
          {t("ai_consultation_room.discussion_title")}{" "}
          <span className="font-normal text-gray-300">{comments.length}</span>
        </h3>
        <button
          onClick={openInputHandler}
          className="flex items-center gap-1 text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700"
        >
          <MessageSquare size={16} />
          {isShowInput
            ? t("ai_consultation_room.cancel_post")
            : t("ai_consultation_room.publish_opinion")}
        </button>
      </div>

      {/* Info: (20260206 - Julian) 發表評論 Input */}
      <CommentPostInput
        isShowInput={isShowInput}
        value={commentInput}
        onChange={setCommentInput}
        onSuccess={() => {
          fetchComments();
          setIsShowInput(false);
        }}
      />

      {/* Info: (20260206 - Julian) 評論區 */}
      {displayedComments}
    </section>
  );
};
