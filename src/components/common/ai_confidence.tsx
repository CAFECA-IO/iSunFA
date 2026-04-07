"use client";

import { Sparkles } from "lucide-react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useTranslation } from "@/i18n/i18n_context";

interface IAiConfidenceProps {
  confidence: number;
  note?: string;
  barOnly?: boolean;
}

export default function AiConfidence({
  confidence,
  note,
  barOnly,
}: IAiConfidenceProps) {
  const { t } = useTranslation();
  const hasNote = note && note.trim().length > 0;

  const progessBar = (
    <div className="flex items-center justify-center gap-2 text-sm font-bold">
      {/* Info: (20260325 - Julian) Progress Bar */}
      <div className="hidden sm:block h-2 w-20 shrink-0 overflow-hidden rounded-full bg-slate-200">
        <div
          // Info: (20260325 - Julian) 85 以上為綠色
          className={`h-full rounded-full ${confidence >= 85 ? "bg-emerald-400" : "bg-orange-500"}`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <p className="whitespace-nowrap text-slate-700">{confidence}%</p>
    </div>
  );

  // Info: (20260325 - Julian) Only show progress bar
  if (barOnly) return progessBar;

  const formattedNote = note?.replaceAll(/\n/g, "<br>")?.replaceAll(/-\s(\S+：)/g, "<li class='text-slate-800 font-bold'>$1</li>")
    .replaceAll("<li", "<ul class='list-disc list-inside'><li")
    .replace("</li>", "</li></ul>")
    ?? ''

  return (
    <div className="flex items-center gap-2">
      {/* Info: (20260325 - Julian) AI 信心度 Progress Bar */}
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
        <p className="text-xs font-bold text-slate-500">
          {t("common.ai_confidence.title")}
        </p>
        {progessBar}
      </div>

      {/* Info: (20260325 - Julian) AI 備註 Button */}
      <Popover className="relative">
        {({ open }) => (
          <>
            {/* Info: (20260325 - Julian) Button */}
            <PopoverButton
              disabled={!hasNote}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-bold shadow-sm transition-colors outline-none disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500 ${open
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                }`}
            >
              {hasNote && (
                <Sparkles
                  size={14}
                  className={open ? "text-blue-500" : "text-blue-400"}
                />
              )}
              <span>
                {hasNote
                  ? t("common.ai_confidence.note")
                  : t("common.ai_confidence.no_note")}
              </span>
            </PopoverButton>

            {/* Info: (20260325 - Julian) Note Panel */}
            {hasNote && (
              <PopoverPanel
                transition
                anchor="bottom start"
                className="z-201 flex w-[85vw] max-w-[320px] flex-col rounded-xl border border-blue-100 bg-white p-4 shadow-xl ring-1 ring-black/5 transition duration-200 ease-out outline-none data-closed:scale-95 data-closed:opacity-0 sm:w-[350px] sm:max-w-none"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-500" />
                  <h4 className="text-sm font-bold text-blue-900">
                    {t("common.ai_confidence.note_title")}
                  </h4>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-600">
                  <article dangerouslySetInnerHTML={{ __html: formattedNote }} />
                </div>
              </PopoverPanel>
            )}
          </>
        )}
      </Popover>
    </div>
  );
}
