"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ThumbsUp,
  ThumbsDown,
  /* Share2, */ MessageSquare,
} from "lucide-react";
import { formatTime } from "@/lib/utils/common";
import { IThread } from "@/interfaces/ai_talk";
import { useTranslation } from "@/i18n/i18n_context";

export const ThreadCard = ({
  id,
  question,
  answer,
  authorName,
  tags,
  createdAt,
  countOfLike,
  countOfDislike,
  // countOfShare,
  countOfComment,
}: IThread) => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const linkPath = `${pathname}/${id}`;
  const [now] = useState(() => Date.now() / 1000);

  const displayedTime = (
    <span className="text-gray-400"> • {formatTime(createdAt, now)}</span>
  );

  return (
    <Link
      href={linkPath}
      className="flex size-[300px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 ease-in-out hover:scale-105 hover:cursor-pointer hover:border-orange-400 hover:shadow-md"
    >
      {/* Info: (20260206 - Julian) Q 區塊 (問題) */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
            {t("ai_consultation_room.q_label")}
          </span>
          <p className="text-xs text-gray-700">
            {authorName}
            {displayedTime}
          </p>
        </div>
        <h3 className="line-clamp-3 leading-snug font-bold text-gray-800">
          {question}
        </h3>
      </div>

      {/* Info: (20260206 - Julian) A 區塊 (AI 回答摘要) */}
      <div className="flex flex-1 flex-col justify-between overflow-hidden border-t border-orange-100 bg-orange-50 p-6">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-orange-200 px-2 py-1 text-xs font-bold text-orange-700">
              {t("ai_consultation_room.ai_label")}
            </span>
            <div className="flex gap-1">
              {tags?.map((tag) => (
                <span key={tag} className="text-[10px] text-orange-400">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-orange-900">
            {answer ?? ""}
          </p>
        </div>

        {/* Info: (20260206 - Julian) Toolbar */}
        <div className="mt-2 flex items-center gap-4 border-t border-orange-100/50 pt-2">
          <div className="flex items-center gap-1 text-orange-400">
            <ThumbsUp size={14} />
            <span className="text-xs">{countOfLike ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 text-orange-400">
            <ThumbsDown size={14} />
            <span className="text-xs">{countOfDislike ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 text-orange-400">
            <MessageSquare size={14} />
            <span className="text-xs">{countOfComment ?? 0}</span>
          </div>
          {/* ToDo: (20260302 - Julian) 實作分享功能 */}
          {/* <div className="flex items-center gap-1 text-orange-400 ">
            <Share2 size={14} />
            <span className="text-xs">{countOfShare ?? 0}</span>
          </div> */}
        </div>
      </div>
    </Link>
  );
};
