"use client";

import { FileText, FileBox, Database, Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "@/i18n/i18n_context";

const getFileUrl = (path: string) =>
  `/api/dpp/files?action=serve&path=${encodeURIComponent(path)}`;

export interface IDppPreviewPaneProps {
  selectedFilePath: string | null;
  isGenerating?: boolean;
  onRegenerateFile?: (filePath: string) => void;
}

export function DppPreviewPane({
  selectedFilePath,
  isGenerating = false,
  onRegenerateFile = () => {},
}: IDppPreviewPaneProps) {
  const { t } = useTranslation();
  const [jsonData, setJsonData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [mdContent, setMdContent] = useState<string>("");
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    setFileError(null);
    setJsonData(null);
    setMdContent("");

    if (!selectedFilePath) {
      return;
    }

    fetch(getFileUrl(selectedFilePath))
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setFileError(errData.error || "File not found");
        } else {
          if (selectedFilePath.endsWith(".json")) {
            setJsonData(await res.json());
          } else if (selectedFilePath.endsWith(".md")) {
            setMdContent(await res.text());
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load file", err);
        setFileError("Network error");
      });
  }, [selectedFilePath]);

  const preprocessMarkdown = (md: string) => {
    return md.replace(/<img\s+src="([^"]+)"[^>]*>/g, (match, src) => {
      const cleanSrc = src.replace(/\s+/g, "");
      return `![image](${cleanSrc})`;
    });
  };

  const renderJsonValue = (
    value: unknown,
    level: number = 0,
  ): React.ReactNode => {
    if (value === null || value === undefined)
      return <span className="text-slate-400">null</span>;
    if (typeof value === "boolean") {
      return (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
            value
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {value ? "TRUE" : "FALSE"}
        </span>
      );
    }
    if (typeof value === "string") {
      // Info: (20260610 - Tzuhan) Check if it looks like an ISO date
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return <span className="font-medium text-indigo-600">{value}</span>;
      }
      return (
        <span className="break-words whitespace-pre-wrap text-slate-800">
          {value}
        </span>
      );
    }
    if (typeof value === "number") {
      return <span className="font-mono text-orange-600">{value}</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-slate-400">[]</span>;
      // Info: (20260610 - Tzuhan) If array of primitives
      if (typeof value[0] !== "object") {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((v, idx) => (
              <span
                key={idx}
                className="inline-block rounded border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-600"
              >
                {String(v)}
              </span>
            ))}
          </div>
        );
      }
      return (
        <div className="mt-1 flex flex-col gap-2">
          {value.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="mb-1 border-b border-slate-100 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Item {idx + 1}
              </div>
              {renderJsonValue(item, level + 1)}
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === "object") {
      return (
        <div className="flex w-full flex-col gap-1">
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <div
              key={k}
              className="flex flex-col border-b border-slate-50 py-1.5 last:border-0 sm:flex-row sm:items-start"
            >
              <span className="w-full shrink-0 pt-0.5 text-xs font-semibold text-slate-500 capitalize sm:w-1/3">
                {k.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <div className="min-w-0 flex-1">
                {renderJsonValue(v, level + 1)}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(value)}</span>;
  };

  const renderJsonView = (data: unknown) => {
    if (!data)
      return (
        <div className="p-8 text-center text-slate-500">
          {t("digital_product_passport.preview_extra.loading")}
        </div>
      );

    const isRootArray = Array.isArray(data);
    const rootData = isRootArray
      ? { list: data }
      : (data as Record<string, unknown>);

    return (
      <div className="custom-scrollbar h-full overflow-y-auto bg-slate-50 p-4 text-sm text-slate-700 md:p-6">
        <div className="mb-6">
          <h2 className="mb-2 flex items-center text-lg font-bold text-slate-800">
            <Database className="mr-2 h-5 w-5 text-indigo-500" />
            {t("digital_product_passport.preview_extra.json_title")}
          </h2>
          <p className="text-xs text-slate-500">
            {t("digital_product_passport.preview_extra.json_desc")}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {Object.entries(rootData).map(([sectionKey, sectionData]) => (
            <div
              key={sectionKey}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="mb-4 flex items-center border-b border-slate-100 pb-2 text-base font-bold text-slate-800 capitalize">
                <span className="mr-2 rounded bg-orange-100 p-1 text-orange-600">
                  <FileBox className="h-4 w-4" />
                </span>
                {sectionKey.replace(/([A-Z])/g, " $1").trim()}
              </h3>
              <div className="text-sm">{renderJsonValue(sectionData)}</div>
            </div>
          ))}
        </div>
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
            <div className="flex items-center gap-2">
              <a
                href={getFileUrl(selectedFilePath)}
                download={selectedFilePath.split("/").pop()}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-md bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-200"
              >
                <Download className="h-4 w-4" />
                {t("common.download") || "下載模擬資料"}
              </a>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden bg-slate-200 p-0">
            {isGenerating ? (
              <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/50 p-8 text-center text-slate-500">
                <RefreshCw className="mb-4 h-16 w-16 animate-spin text-blue-500" />
                <p className="text-lg font-bold text-slate-600">
                  {t(
                    "digital_product_passport.preview_extra.regenerating_title",
                  ) || "資料生成中..."}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {t(
                    "digital_product_passport.preview_extra.regenerating_desc",
                  ) || "AI 正在重新生成此資料，請稍候。"}
                </p>
              </div>
            ) : fileError ? (
              <div className="flex h-full flex-col items-center justify-center bg-slate-50 p-8 text-center">
                <FileBox className="mb-4 h-16 w-16 text-slate-300" />
                <p className="text-lg font-bold text-slate-700">
                  {t("digital_product_passport.preview_extra.file_not_found")}
                </p>
                <p className="mt-2 mb-6 text-sm text-slate-500">
                  {t(
                    "digital_product_passport.preview_extra.file_not_found_desc",
                  )}
                </p>
                {onRegenerateFile && (
                  <button
                    onClick={() => onRegenerateFile(selectedFilePath)}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t(
                      "digital_product_passport.preview_extra.regenerate_file",
                    )}
                  </button>
                )}
              </div>
            ) : selectedFilePath.endsWith(".json") ? (
              renderJsonView(jsonData)
            ) : selectedFilePath.endsWith(".md") ? (
              <div className="custom-scrollbar h-full overflow-y-auto bg-white p-6 md:p-8">
                <article className="prose prose-slate prose-sm sm:prose-base mx-auto w-full max-w-4xl break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    urlTransform={(value: string) => value}
                  >
                    {preprocessMarkdown(mdContent)}
                  </ReactMarkdown>
                </article>
              </div>
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
          <p className="text-lg font-bold text-slate-600">
            {t("digital_product_passport.preview_extra.waiting_title")}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {t("digital_product_passport.preview_extra.waiting_desc")}
          </p>
        </div>
      )}
    </div>
  );
}
