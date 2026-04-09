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

export default function ReportPrintNote({ notes, footerNote }: IReportPrintNoteProps) {
  const { t } = useTranslation();

  if (!notes || notes.length === 0) return null;

  return (
    <div
      id="report-print-note"
      className="flex flex-col rounded-2xl bg-white p-6 md:p-8 print:p-6 print:my-4 print:break-inside-avoid border border-gray-200 "
    >
      <div className="flex items-center gap-2 text-[17px] font-bold text-gray-800 mb-6">
        <Info size={18} className="text-blue-500" />
        <p className="tracking-wide">{t("report_view.print_note_title")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 print:grid-cols-2">
        {notes.map((item) => (
          <div key={item.title} className={`flex flex-col gap-2 ${item.fullWidth ? "md:col-span-2 print:col-span-2" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-blue-600">{item.title}</span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                {item.type}
              </span>
            </div>
            <p className="text-[13px] text-gray-500 leading-relaxed print:text-xs">
              {item.mainDesc} {item.subDesc}
            </p>
          </div>
        ))}
      </div>

      {footerNote && (
        <div className="mt-8 border-t border-gray-100 pt-4">
          <p className="text-[11px] italic text-gray-400">{footerNote}</p>
        </div>
      )}
    </div>
  );
}
