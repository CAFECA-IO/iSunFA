import { User, Send } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

export const CommentPostInput = ({
  isShowInput,
  value,
  onChange,
}: {
  isShowInput: boolean;
  value: string;
  onChange: (val: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`transition-all duration-300 overflow-hidden ${isShowInput ? "max-h-60 opacity-100 mb-6" : "max-h-0 opacity-0 mb-0"}`}
    >
      <div className="flex gap-4 p-6 rounded-4xl bg-orange-50/50 border border-orange-100 shadow-inner">
        <div className="w-12 h-12 bg-white rounded-2xl shrink-0 flex items-center justify-center text-orange-200 border border-orange-50 shadow-sm">
          <User size={24} />
        </div>
        <div className="flex-1 space-y-3">
          <textarea
            id="ai-comment-input"
            aria-label={t("ai_consultation_room.submit_comment")}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("ai_consultation_room.comment_placeholder")}
            className="w-full bg-white border border-orange-100 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500 transition-all placeholder:text-gray-300 min-h-[100px] resize-none shadow-sm"
          />
          <div className="flex justify-end">
            <button
              disabled={!value.trim()}
              className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 enabled:hover:bg-orange-500 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-md shadow-orange-200"
            >
              <Send size={16} />
              <span>{t("ai_consultation_room.submit_comment")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

