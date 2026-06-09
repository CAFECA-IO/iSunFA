"use client";

import { FileText, FileBox, Database } from "lucide-react";
import { useEffect, useState } from "react";

const getFileUrl = (path: string) =>
  `/api/dpp-demo/files?action=serve&path=${encodeURIComponent(path)}`;

export interface IDppDemoPreviewPaneProps {
  selectedFilePath: string | null;
}

export function DppDemoPreviewPane({
  selectedFilePath,
}: IDppDemoPreviewPaneProps) {
  const [jsonData, setJsonData] = useState<Record<string, unknown> | null>(
    null,
  );

  useEffect(() => {
    if (selectedFilePath?.endsWith(".json")) {
      fetch(getFileUrl(selectedFilePath))
        .then((res) => res.json())
        .then((data) => setJsonData(data))
        .catch((err) => console.error("Failed to parse JSON", err));
    } else {
      setJsonData(null);
    }
  }, [selectedFilePath]);

  const renderJsonView = (data: Record<string, unknown> | null) => {
    if (!data)
      return <div className="p-8 text-center text-slate-500">載入中...</div>;

    return (
      <div className="custom-scrollbar h-full overflow-y-auto bg-white p-6 text-sm text-slate-700">
        <div className="mb-6">
          <h2 className="mb-2 flex items-center text-lg font-bold text-slate-800">
            <Database className="mr-2 h-5 w-5 text-indigo-500" />
            AI 跨年推估與視覺萃取結果
          </h2>
          <p className="text-slate-500">
            此為歷史基期回溯推估所產生的推估數據 (Time-Machine)。
          </p>
        </div>

        {Object.entries(data).map(([sectionKey, sectionData]) => (
          <div
            key={sectionKey}
            className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <h3 className="mb-3 font-bold text-slate-800 capitalize">
              {sectionKey.replace(/([A-Z])/g, " $1").trim()}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <tbody>
                  {typeof sectionData === "object" && sectionData !== null ? (
                    Object.entries(sectionData as Record<string, unknown>).map(
                      ([key, value]) => (
                        <tr
                          key={key}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="w-1/3 bg-slate-50/50 px-4 py-3 align-top font-semibold text-slate-600">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </td>
                          <td className="px-4 py-3 break-words whitespace-pre-wrap text-slate-800">
                            {Array.isArray(value)
                              ? value.join("\n")
                              : String(value)}
                          </td>
                        </tr>
                      ),
                    )
                  ) : (
                    <tr>
                      <td className="px-4 py-3 whitespace-pre-wrap text-slate-800">
                        {String(sectionData)}
                      </td>
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
    <div className="relative z-20 flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-slate-100 shadow-sm">
      {selectedFilePath ? (
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-gray-200 bg-white p-3">
            <div className="flex items-center">
              <FileText className="mr-2 h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold text-slate-700">
                {selectedFilePath.split("/").pop()}
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden bg-slate-200 p-0">
            {selectedFilePath.endsWith(".json") ? (
              renderJsonView(jsonData)
            ) : (
              <iframe
                title="Document Preview"
                src={getFileUrl(selectedFilePath)}
                className="h-full w-full border-0 bg-white"
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/50 p-8 text-center text-slate-500">
          <FileBox className="mb-4 h-16 w-16 text-slate-300" />
          <p className="text-lg font-bold text-slate-600">等待資料生成完畢</p>
          <p className="mt-2 text-sm text-slate-400">
            企業畫像 (Persona) 與報告將在此呈現
          </p>
        </div>
      )}
    </div>
  );
}
