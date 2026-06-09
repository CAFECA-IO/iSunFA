"use client";

import { FileText, FileBox, Database } from "lucide-react";
import { useEffect, useState } from "react";

const getFileUrl = (path: string) => `/api/dpp-demo/files?action=serve&path=${encodeURIComponent(path)}`;

export interface IDppDemoPreviewPaneProps {
  selectedFilePath: string | null;
}

export function DppDemoPreviewPane({ selectedFilePath }: IDppDemoPreviewPaneProps) {
  const [jsonData, setJsonData] = useState<any>(null);

  useEffect(() => {
    if (selectedFilePath?.endsWith(".json")) {
      fetch(getFileUrl(selectedFilePath))
        .then(res => res.json())
        .then(data => setJsonData(data))
        .catch(err => console.error("Failed to parse JSON", err));
    } else {
      setJsonData(null);
    }
  }, [selectedFilePath]);

  const renderJsonView = (data: any) => {
    if (!data) return <div className="p-8 text-center text-slate-500">載入中...</div>;

    return (
      <div className="p-6 bg-white h-full overflow-y-auto custom-scrollbar text-sm text-slate-700">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
            <Database className="w-5 h-5 mr-2 text-indigo-500" />
            AI 跨年推估與視覺萃取結果
          </h2>
          <p className="text-slate-500">此為歷史基期回溯推估所產生的推估數據 (Time-Machine)。</p>
        </div>
        
        {Object.entries(data).map(([sectionKey, sectionData]) => (
          <div key={sectionKey} className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-3 capitalize">{sectionKey.replace(/([A-Z])/g, ' $1').trim()}</h3>
            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <tbody>
                  {typeof sectionData === 'object' && sectionData !== null ? (
                    Object.entries(sectionData).map(([key, value]) => (
                      <tr key={key} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 px-4 font-semibold text-slate-600 align-top w-1/3 bg-slate-50/50">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </td>
                        <td className="py-3 px-4 text-slate-800 break-words whitespace-pre-wrap">
                          {Array.isArray(value) ? value.join('\n') : String(value)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3 px-4 text-slate-800 whitespace-pre-wrap">{String(sectionData)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-slate-100 rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden relative z-20">
      {selectedFilePath ? (
        <div className="flex-1 flex flex-col h-full min-h-0">
          <div className="flex items-center p-3 border-b border-gray-200 bg-white sticky top-0 z-10 justify-between shrink-0">
            <div className="flex items-center">
              <FileText className="w-4 h-4 mr-2 text-orange-500" />
              <span className="text-sm font-bold text-slate-700">{selectedFilePath.split('/').pop()}</span>
            </div>
          </div>
          <div className="flex-1 p-0 bg-slate-200 min-h-0 overflow-hidden">
            {selectedFilePath.endsWith(".json") ? (
              renderJsonView(jsonData)
            ) : (
              <iframe title="Document Preview" src={getFileUrl(selectedFilePath)} className="w-full h-full border-0 bg-white" />
            )}
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
