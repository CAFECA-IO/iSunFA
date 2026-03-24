"use client";

import { Info } from "lucide-react";

export default function AiNote({ note }: { note: string }) {
  return (
    <div className="relative flex flex-col">
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg bg-blue-400 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-500"
      >
        <Info size={16} strokeWidth={2.5} />
        <span>查看 AI 備註</span>
      </button>

      <div className="absolute top-8 z-10 w-[300px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm leading-relaxed shadow-2xl">
        {note}
      </div>
    </div>
  );
}
