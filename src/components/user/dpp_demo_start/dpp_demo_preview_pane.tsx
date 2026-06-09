import { FileText, FileBox } from "lucide-react";

const getFileUrl = (path: string) => `/api/dpp-demo/files?action=serve&path=${encodeURIComponent(path)}`;
export interface IDppDemoPreviewPaneProps {
  selectedFilePath: string | null;
}

export function DppDemoPreviewPane({ selectedFilePath }: IDppDemoPreviewPaneProps) {
  return (
    <div className="flex-1 bg-slate-100 rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden relative z-20">
      {selectedFilePath ? (
        <div className="flex-1 flex flex-col h-full">
          <div className="flex items-center p-3 border-b border-gray-200 bg-white sticky top-0 z-10 justify-between">
            <div className="flex items-center">
              <FileText className="w-4 h-4 mr-2 text-orange-500" />
              <span className="text-sm font-bold text-slate-700">{selectedFilePath.split('/').pop()}</span>
            </div>
          </div>
          <div className="flex-1 p-0 bg-slate-200">
            <iframe title="Document Preview" src={getFileUrl(selectedFilePath)} className="w-full h-full border-0 bg-white" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-500 p-8 text-center bg-slate-50/50">
          <FileBox className="w-16 h-16 text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-600">等待資料生成完畢</p>
          <p className="text-sm text-slate-400 mt-2">企業畫像 (Persona) 與報告將在此呈現</p>
        </div>
      )}
    </div>
  );
}
