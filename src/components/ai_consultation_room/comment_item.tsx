import { useState } from "react";
import { CheckCircle2, Trash2, ThumbsDown, ThumbsUp } from "lucide-react";
import { request } from "@/lib/utils/request";
import { formatTime } from "@/lib/utils/common";
import { IComment, UserReaction } from "@/interfaces/ai_consulting";
import { CommentPostInput } from "@/components/ai_consultation_room/comment_post_input";
import ConfirmModal from "@/components/common/confirm_modal";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import { ApiCode } from "@/lib/utils/status";
import { IApiResponse } from "@/lib/utils/response";

export const CommentItem = ({
  comment,
  isReply = false,
  onSuccess = undefined,
}: {
  comment: IComment;
  isReply?: boolean;
  onSuccess?: () => void;
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [reaction, setReaction] = useState<UserReaction>(comment.userReaction);
  const [likesCount, setLikesCount] = useState<number>(comment.likes);
  const [dislikesCount, setDislikesCount] = useState<number>(comment.dislikes);
  const [showReplies, setShowReplies] = useState<boolean>(false);
  const [replyInput, setReplyInput] = useState<string>("");
  const [now] = useState(() => Date.now() / 1000);
  const [isLocalDeleted, setIsLocalDeleted] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const isDeleted = comment.isDeleted || isLocalDeleted;

  const initial = comment.authorName.slice(0, 1).toUpperCase();
  const isMyComment = !!user && user.name === comment.authorName;

  const isShowProTag = comment.isProfessional && (
    <div className="absolute top-0 right-0 p-4 opacity-0 transition-opacity group-hover:opacity-100">
      <span className="text-xs text-gray-400">
        {t("ai_consultation_room.pro_feedback")}
      </span>
    </div>
  );

  const isShowVerifiedTag = comment.isVerified && (
    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold tracking-wider text-blue-700 uppercase">
      {t("ai_consultation_room.certified")}
    </span>
  );

  const isShowVerifiedIcon = comment.isVerified && (
    <div className="absolute -right-1 -bottom-1 rounded-full border border-gray-50 bg-white p-0.5">
      <CheckCircle2 size={16} className="text-blue-500" fill="currentColor" />
    </div>
  );

  const handleReaction = async (reaction: UserReaction) => {
    if (!user) return;
    try {
      const data = await request<
        IApiResponse<{
          countOfLike: number;
          countOfDislike: number;
          userReaction: UserReaction;
        }>
      >(`/api/v1/ai_consulting/comment/${comment.id}/react`, {
        method: "POST",
        body: JSON.stringify({ reaction }),
      });

      if (data.code === ApiCode.SUCCESS && data.payload) {
        const { countOfLike, countOfDislike, userReaction } = data.payload;
        setLikesCount(countOfLike);
        setDislikesCount(countOfDislike);
        setReaction(userReaction);
      }
    } catch (error) {
      console.error("Failed to react to comment:", error);
    }
  };

  const handleLike = () => handleReaction("LIKE");
  const handleDislike = () => handleReaction("DISLIKE");

  const deleteClicker = () => {
    if (!isMyComment) return;
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    // Info: (20260428 - Julian) 發文者只能刪除自己的留言
    if (!isMyComment) return;
    try {
      const data = await request<IApiResponse<void>>(
        `/api/v1/ai_consulting/comment/${comment.id}`,
        { method: "DELETE" },
      );

      if (data.code === ApiCode.SUCCESS) {
        setIsLocalDeleted(true);
        onSuccess?.();
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const toggleReplies = () => {
    if (!showReplies) {
      // Info: (20260428 - Julian) 點擊回覆時，預設帶入 @用戶名稱
      setReplyInput(`@${comment.authorName} `);
    } else {
      setReplyInput("");
    }
    setShowReplies(!showReplies);
  };

  // Info: (20260428 - Julian) 判斷是否有回覆
  const hasReplies = comment.replies && comment.replies.length > 0;

  // Info: (20260212 - Julian) 拆分 @用戶 字串並加上樣式
  const renderContent = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[^\s]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={index}
            className="rounded bg-gray-100 p-1 font-medium text-blue-600"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Info: (20260428 - Julian) 原留言和回覆都沒有的話，直接不渲染
  if (isDeleted && !hasReplies) return null;

  const originalComment = isDeleted ? (
    // Info: (20260428 - Julian) 已刪除樣式
    <div className="group flex flex-col gap-5 rounded-3xl border border-gray-100 bg-white p-6 transition-all">
      <p className="text-gray-400 italic">這則留言已被原作者刪除。</p>
      {hasReplies && (
        <button
          type="button"
          onClick={toggleReplies}
          className="w-fit text-xs font-bold text-gray-400 transition-colors hover:text-orange-500"
        >
          查看留言
        </button>
      )}
    </div>
  ) : (
    <div className="group relative flex gap-5 rounded-3xl border border-gray-100 bg-white p-6 transition-all hover:border-orange-300">
      {isShowProTag}

      <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-600">
        {initial}
        {isShowVerifiedIcon}
      </div>

      <div className="relative flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-gray-900">
            {comment.authorName}
          </span>
          {isShowVerifiedTag}
          <span className="text-xs text-gray-400">
            {formatTime(comment.createdAt, now)}
          </span>
        </div>

        {isMyComment && (
          <button
            type="button"
            onClick={deleteClicker}
            className="absolute top-0 right-0 p-2 text-gray-400 transition-colors hover:text-orange-500"
          >
            <Trash2 size={16} />
          </button>
        )}

        <p className="pr-20 leading-relaxed text-gray-700">
          {renderContent(comment.content)}
        </p>
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={toggleReplies}
            className="text-xs font-bold text-gray-400 transition-colors hover:text-orange-500"
          >
            {t("ai_consultation_room.reply")}
            {hasReplies ? `(${comment.replies.length})` : ""}
          </button>
        </div>
      </div>

      {/* Info: (20260206 - Julian) Like/Dislike Buttons in bottom right */}
      <div className="absolute right-6 bottom-6 flex items-center gap-4">
        <button
          onClick={handleLike}
          disabled={!user}
          title={!user ? t("ai_consultation_room.login_to_react") : ""}
          className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
            reaction === "LIKE"
              ? "text-orange-500"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <ThumbsUp
            size={16}
            fill={reaction === "LIKE" ? "currentColor" : "none"}
          />
          <span>{likesCount}</span>
        </button>
        <button
          onClick={handleDislike}
          disabled={!user}
          title={!user ? t("ai_consultation_room.login_to_react") : ""}
          className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
            reaction === "DISLIKE"
              ? "text-orange-500"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <ThumbsDown
            size={16}
            fill={reaction === "DISLIKE" ? "currentColor" : "none"}
          />
          <span>{dislikesCount}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className={`space-y-4 ${isReply ? "ml-14" : ""}`}>
        {/* Info: (20260428 - Julian) 原始留言 */}
        {originalComment}

        {/* Info: (20260209 - Julian) input 與巢狀回覆 */}
        {showReplies && (
          <div className="space-y-4">
            {hasReplies && (
              <div className="space-y-4">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    isReply
                    onSuccess={onSuccess}
                  />
                ))}
              </div>
            )}
            <div className={isReply ? "" : "ml-14"}>
              <CommentPostInput
                isShowInput={showReplies}
                value={replyInput}
                onChange={setReplyInput}
                parentId={comment.id}
                onSuccess={() => onSuccess?.()}
              />
            </div>
          </div>
        )}
      </div>

      {/* Info: (20260428 - Julian) 確認刪除留言 modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t("刪除留言")}
        message={t("確定要刪除這則留言嗎？")}
        confirmText={t("是的，確認刪除")}
        cancelText={t("common.cancel")}
        onConfirm={handleDelete}
      />
    </>
  );
};
