"use client";

import { Info } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

export interface IReportNote {
  title: string;
  type: string;
  mainDesc: string;
  subDesc: string;
  fullWidth?: boolean;
}

export interface IReportPrintNoteProps {
  notes: IReportNote[];
  footerNote?: string;
}

export default function ReportPrintNote({
  notes,
  footerNote = undefined,
}: IReportPrintNoteProps) {
  const { t } = useTranslation();

  if (!notes || notes.length === 0) return null;

  return (
    <div
      id="report-print-note"
      className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 md:p-8 lg:p-6 print:my-4 print:break-inside-avoid print:p-6"
    >
      <div className="mb-2 flex items-center gap-2 text-[17px] font-bold text-gray-800 lg:mb-6">
        <Info size={18} className="text-blue-500" />
        <p className="tracking-wide">{t("report_view.print_note_title")}</p>
      </div>

      <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2 lg:gap-y-8 print:grid-cols-2">
        {notes.map((item) => (
          <div
            key={item.title}
            className={`flex flex-col gap-px lg:gap-2 ${item.fullWidth ? "md:col-span-2 print:col-span-2" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 lg:text-base">
                {item.title}
              </span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                {item.type}
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-gray-500 lg:text-xs print:text-xs">
              {item.mainDesc} {item.subDesc}
            </p>
          </div>
        ))}
      </div>

      {footerNote && (
        <div className="mt-8 border-t border-gray-100 pt-4">
          <p className="text-[10px] text-gray-400 italic">{footerNote}</p>
        </div>
      )}
    </div>
  );
}
