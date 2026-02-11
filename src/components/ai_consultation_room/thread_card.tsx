"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThumbsUp, ThumbsDown, Share2 } from "lucide-react";
import { formatTime } from "@/lib/utils/common";
import { IThread } from "@/interfaces/ai_talk";
import { useTranslation } from "@/i18n/i18n_context";


export const ThreadCard = ({
  id,
  question,
  answer,
  authorId,
  tags,
  createdAt,
  countOfLike,
  countOfDislike,
  countOfShare,
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
      className="bg-white flex flex-col hover:scale-105 transition-all ease-in-out duration-300 hover:cursor-pointer hover:border-orange-400 size-[300px] rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md"
    >
      {/* Info: (20260206 - Julian) Q 區塊 (問題) */}
      <div className="p-6 flex-1 overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">
            {t("ai_consultation_room.q_label")}
          </span>
          <p className="text-gray-700 text-xs">
            {authorId}
            {displayedTime}
          </p>
        </div>
        <h3 className="font-bold text-gray-800 leading-snug line-clamp-3">
          {question}
        </h3>
      </div>

      {/* Info: (20260206 - Julian) A 區塊 (AI 回答摘要) */}
      <div className="bg-orange-50 flex-1 p-6 border-t border-orange-100 flex flex-col justify-between overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-1 bg-orange-200 text-orange-700 text-xs font-bold rounded">
              {t("ai_consultation_room.ai_label")}
            </span>
            <div className="flex gap-1">
              {tags.map((tag) => (
                <span key={tag} className="text-[10px] text-orange-400">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-orange-900 line-clamp-2 leading-relaxed">
            {answer}
          </p>
        </div>


        {/* Info: (20260206 - Julian) Toolbar */}
        <div className="flex items-center gap-4 pt-2 mt-2 border-t border-orange-100/50">
          <div className="flex items-center gap-1 text-orange-400 ">
            <ThumbsUp size={14} />
            <span className="text-xs">{countOfLike}</span>
          </div>
          <div className="flex items-center gap-1 text-orange-400 ">
            <ThumbsDown size={14} />
            <span className="text-xs">{countOfDislike}</span>
          </div>
          <div className="flex items-center gap-1 text-orange-400 ">
            <Share2 size={14} />
            <span className="text-xs">{countOfShare}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
