import { useState } from "react";
import { ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";
import { formatTime } from "@/lib/utils/common";
import { IComment } from "@/interfaces/ai_talk";
import { CommentPostInput } from "@/components/ai_consultation_room/comment_post_input";
import { useTranslation } from "@/i18n/i18n_context";

export const CommentItem = ({
  comment,
  isReply = false,
}: {
  comment: IComment;
  isReply?: boolean;
}) => {
  const { t } = useTranslation();
  const [liked, setLiked] = useState<boolean>(false);
  const [disliked, setDisliked] = useState<boolean>(false);
  const [showReplies, setShowReplies] = useState<boolean>(false);
  const [replyInput, setReplyInput] = useState<string>("");
  const [now] = useState(() => Date.now() / 1000);

  const initial = comment.authorId.slice(0, 1).toUpperCase();

  const isShowProTag = comment.isProfessional && (
    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
      <span className="text-xs text-gray-400">
        {t("ai_consultation_room.pro_feedback")}
      </span>
    </div>
  );

  const isShowVerifiedTag = comment.isVerified && (
    <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
      {t("ai_consultation_room.certified")}
    </span>
  );

  const isShowVerifiedIcon = comment.isVerified && (
    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full border border-gray-50">
      <CheckCircle2 size={16} className="text-blue-500" fill="currentColor" />
    </div>
  );

  const handleLike = () => {
    if (liked) {
      setLiked(false);
    } else {
      setLiked(true);
      setDisliked(false);
    }
  };

  const handleDislike = () => {
    if (disliked) {
      setDisliked(false);
    } else {
      setDisliked(true);
      setLiked(false);
    }
  };

  const toggleReplies = () => {
    if (showReplies) setReplyInput("");
    setShowReplies(!showReplies);
  };

  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={`space-y-4 ${isReply ? "ml-14" : ""}`}>
      <div className="group relative flex gap-5 p-6 rounded-3xl bg-white border border-gray-100 hover:border-orange-300 transition-all">
        {isShowProTag}

        <div className="w-14 h-14 bg-blue-100 rounded-2xl shrink-0 flex items-center justify-center text-blue-600 font-bold text-xl relative">
          {initial}
          {isShowVerifiedIcon}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-gray-900">
              {comment.authorId}
            </span>
            {isShowVerifiedTag}
            <span className="text-xs text-gray-400">
              {formatTime(comment.createdAt, now)}
            </span>
          </div>
          <p className="text-gray-700 leading-relaxed pr-20">
            {comment.replyToUserId && (
              <span className="text-blue-500 font-medium mr-1">
                @{comment.replyToUserId}
              </span>
            )}
            {comment.content}
          </p>
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={toggleReplies}
              className="text-xs font-bold text-gray-400 hover:text-orange-500 transition-colors"
            >
              {t("ai_consultation_room.reply")}
              {hasReplies ? `(${comment.replies.length})` : ""}
            </button>
          </div>
        </div>

        {/* Info: (20260206 - Julian) Like/Dislike Buttons in bottom right */}
        <div className="absolute bottom-6 right-6 flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 ${
              liked ? "text-orange-500" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <ThumbsUp size={16} fill={liked ? "currentColor" : "none"} />
            <span>{comment.likes + (liked ? 1 : 0)}</span>
          </button>
          <button
            onClick={handleDislike}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 ${
              disliked ? "text-orange-500" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <ThumbsDown size={16} fill={disliked ? "currentColor" : "none"} />
            <span>{comment.dislikes + (disliked ? 1 : 0)}</span>
          </button>
        </div>
      </div>

      {/* Reply Input & Nested Replies */}
      {showReplies && (
        <div className="space-y-4">
          <div className={isReply ? "" : "ml-14"}>
            <CommentPostInput
              isShowInput={showReplies}
              value={replyInput}
              onChange={setReplyInput}
            />
          </div>
          {hasReplies && (
            <div className="space-y-4">
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} isReply />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

