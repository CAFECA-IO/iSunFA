"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import {
  UploadCloud,
  Loader2,
  RotateCcw,
  Wand2,
  File as FileIcon,
} from "lucide-react";
import { uploadFile, fileToBase64 } from "@/lib/file_operator";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

export default function JournalUploadView({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const { t } = useTranslation();
  const params = useParams();

  // Info: (20260309 - Julian) 從 URL 取得帳簿 ID
  const accountBookId = params?.account_book_id as string;

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<{
    file: File;
    previewUrl: string | null;
    hash: string;
    base64: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (uploadedFile?.previewUrl) {
        URL.revokeObjectURL(uploadedFile.previewUrl);
      }
    };
  }, [uploadedFile]);

  const processFile = async (file: File) => {
    setIsUploading(true);
    try {
      const [hashInfo, base64] = await Promise.all([
        new Promise<{ hash: string }>((resolve, reject) => {
          uploadFile(file, {
            onSuccess: (hash) => resolve({ hash }),
            onError: (error) => reject(error),
          });
        }),
        fileToBase64(file),
      ]);
      const { hash } = hashInfo;

      // Optionally handle success (e.g., switch to list view or show success message)
      setUploadedFile({
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
        hash,
        base64,
      });
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    try {
      const data = await request<IApiResponse<object>>(
        `/api/v1/account_book/${accountBookId}/journal`,
        {
          method: "POST",
          body: JSON.stringify({
            file: {
              hash: uploadedFile.hash,
              fileName: uploadedFile.file.name,
              mimeType: uploadedFile.file.type,
              base64: uploadedFile.base64,
            },
          }),
        },
      );

      if (data.code === ApiCode.SUCCESS) {
        onUploadComplete?.();
      }
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Info: (20260304 - Julian) Full screen loading overlay during AI analysis */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md backdrop-saturate-150 transition-all duration-300">
          <Loader2 className="mb-6 h-16 w-16 animate-spin text-orange-500 drop-shadow-md" />
          <p className="text-2xl font-bold tracking-wide text-slate-800 drop-shadow-sm">
            AI 正在為您分析憑證...
          </p>
          <p className="mt-3 text-base font-medium text-slate-500">
            這可能需要一點時間，請稍候
          </p>
        </div>
      )}

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={`flex h-full flex-col items-center justify-center rounded-2xl border-2 p-20 transition-colors lg:h-[calc(100vh-250px)] lg:p-[100px] ${
          uploadedFile
            ? "border-transparent bg-white shadow-[0_0_15px_rgba(0,0,0,0.05)]"
            : isDragging
              ? "border-dashed border-orange-500 bg-orange-50"
              : "border-dashed border-gray-300 bg-white hover:border-orange-400 hover:bg-gray-50"
        }`}
        onDragOver={!uploadedFile ? handleDragOver : undefined}
        onDragLeave={!uploadedFile ? handleDragLeave : undefined}
        onDrop={!uploadedFile ? handleDrop : undefined}
        onClick={!uploadedFile && !isUploading ? triggerFileInput : undefined}
        onKeyDown={(e) => {
          if (!uploadedFile && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            if (!isUploading) triggerFileInput();
          }
        }}
        role={!uploadedFile ? "button" : "presentation"}
        tabIndex={!uploadedFile ? 0 : -1}
        aria-label={
          !uploadedFile ? (t("ocr.click_or_drag") as string) : undefined
        }
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading || !!uploadedFile}
          aria-label="Upload file"
        />
        {uploadedFile ? (
          <div className="animate-in fade-in zoom-in flex w-full max-w-md flex-col items-center gap-6 p-8 duration-300">
            {/* File Preview */}
            <div className="flex w-full flex-col items-center gap-3">
              <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 shadow-inner">
                {uploadedFile.previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={uploadedFile.previewUrl}
                    alt={uploadedFile.file.name}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <FileIcon className="mb-2 h-16 w-16 text-gray-300" />
                    <span className="text-sm font-medium">
                      No Preview Available
                    </span>
                  </div>
                )}
              </div>
              <p
                className="w-full max-w-full truncate text-center text-sm font-medium text-gray-700"
                title={uploadedFile.file.name}
              >
                {uploadedFile.file.name}
              </p>
            </div>

            <div className="mt-2 flex w-full flex-col items-center">
              <h3 className="mb-5 text-lg font-semibold text-gray-900">
                {t("ocr.analyze_prompt")}
              </h3>

              <div className="flex w-full flex-col gap-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 hover:shadow focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {t("ocr.analyze_btn")}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 focus:ring-offset-2 focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("ocr.reupload_btn")}
                </button>
              </div>
            </div>
          </div>
        ) : isUploading ? (
          <div className="flex flex-col items-center gap-4 text-orange-600">
            <Loader2 className="h-12 w-12 animate-spin" />
            <p className="text-lg font-medium">{t("ocr.uploading")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-gray-500">
            <div className="rounded-full bg-orange-50 p-4 text-orange-500 transition-colors group-hover:bg-orange-100">
              <UploadCloud className="h-10 w-10" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-700">
                {t("ocr.click_or_drag")}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {t("ocr.single_file_only")}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
