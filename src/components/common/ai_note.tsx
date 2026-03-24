"use client";

import { Sparkles } from "lucide-react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";

export default function AiNote({ note }: { note?: string | null }) {
  if (!note) return null;

  return (
    <Popover className="relative flex flex-col items-center">
      {({ open }) => (
        <>
          <PopoverButton
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-sm outline-none transition-colors ${
              open
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            <Sparkles
              size={14}
              className={open ? "text-blue-500" : "text-blue-400"}
            />
            <span>AI 備註</span>
          </PopoverButton>

          <PopoverPanel
            transition
            className="absolute top-full z-50 mt-2 w-[320px] origin-top-right rounded-xl border border-blue-100 bg-white p-4 shadow-xl ring-1 ring-black/5 outline-none transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
          >
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-500" />
              <h4 className="text-sm font-bold text-blue-900">AI 解析備註</h4>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {note}
            </p>
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}
