'use client'

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
  const threadId = params?.talk_id ?? ''

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
        const data = await request<IApiResponse<IComment[]>>(`/api/v1/ai_talk/thread/${threadId}/comment`);
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
      <div className="space-y-6 mt-6">
        {/* Info: (20260206 - Julian) 會計師評論範例 */}
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onSuccess={fetchComments}
          />
        ))}

        {/* Info: (20260206 - Julian) 更多留言載入 */}
        <button className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-300 font-bold hover:border-orange-200 hover:text-orange-400 transition-all">
          {t("ai_consultation_room.load_more")}
        </button>
      </div>
    ) : (
      <div className="flex mt-6 items-center justify-center h-20 text-gray-400">
        {t("ai_consultation_room.no_discussions")}
      </div>
    );

  return (
    <section className="pt-20">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          {t("ai_consultation_room.discussion_title")}{" "}
          <span className="text-gray-300 font-normal">{comments.length}</span>
        </h3>
        <button
          onClick={openInputHandler}
          className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
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
