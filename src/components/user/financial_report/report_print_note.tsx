"use client";

import { Info } from "lucide-react";

export interface IReportNote {
  title: string;
  type: string;
  mainDesc: string;
  subDesc: string;
}

export default function ReportPrintNote({ notes }: { notes: IReportNote[] }) {
  return (
    <div
      id="report-print-note"
      className="hidden flex-col gap-6 rounded-2xl bg-blue-100 px-6 py-4 print:my-4 print:flex print:break-before-page"
    >
      <div className="flex items-center gap-2 text-lg font-bold">
        <Info size={24} className="text-blue-600" />
        <p className="text-slate-800">財務指標註解與判斷標準</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {notes.map((item) => (
          <div key={item.title} className="flex flex-col gap-1 text-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
              <p>{item.title}</p>
              <p className="rounded-md bg-blue-200 px-1.5 py-0.5 text-xs text-slate-600">
                {item.type}
              </p>
            </div>
            <span className="text-xs text-slate-700">{item.subDesc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
