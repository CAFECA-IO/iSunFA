"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  UploadCloud,
  Loader2,
  RotateCcw,
  Wand2,
  File as FileIcon,
} from "lucide-react";
import { uploadFile } from "@/lib/file_operator";

export default function JournalUploadView() {
  const { t } = useTranslation();

  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<{
    file: File;
    previewUrl: string | null;
    hash: string;
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
      const { hash } = await new Promise<{ hash: string }>(
        (resolve, reject) => {
          uploadFile(file, {
            onSuccess: (hash) => resolve({ hash }),
            onError: (error) => reject(error),
          });
        },
      );
      // Optionally handle success (e.g., switch to list view or show success message)
      setUploadedFile({
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
        hash,
      });
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
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
    <div
      className={`flex size-full flex-col items-center justify-center rounded-2xl border-2 transition-colors ${
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
                onClick={(e) => {
                  e.stopPropagation();
                  /* handle AI analysis */
                  console.log("Analyzing file:", uploadedFile.hash);
                  // Optionally setActiveTab("list") or trigger processing states
                }}
              >
                <Wand2 className="h-4 w-4" />
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
  );
}
