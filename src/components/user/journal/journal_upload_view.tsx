"use client";

import { useState, useRef, useEffect, MouseEvent, DragEvent, ChangeEvent } from 'react';

import { useParams } from "next/navigation";
import Image from "next/image";
import { useTranslation } from "@/i18n/i18n_context";
import {
  UploadCloud,
  Loader2,
  RotateCcw,
  Wand2,
  File as FileIcon,
  X,
  Plus,
} from "lucide-react";
import PaymentConfirmModal from "@/components/common/payment_confirm_modal";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { uploadFile, fileToBase64 } from "@/lib/file_operator";
import { ApiCode } from "@/lib/utils/status";
import {
  useOrderTransaction,
  IOrderPayload,
} from "@/hooks/use_order_transaction";
import { getAnalysisCost } from "@/lib/analysis/pricing";

type UploadedFileData = {
  id: string;
  file: File;
  previewUrl: string | null;
  hash: string;
  base64: string;
};

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
  const [analyzedCount, setAnalyzedCount] = useState(0);

  // Info: (20260408 - Luphia) Payment workflow states
  const {
    workflowStatus,
    errorMessage,
    txHash,
    resetTransaction,
    executeOrderTransaction,
  } = useOrderTransaction();
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      // Info: (20260321 - Julian) 清除 ObjectURLs 防記憶體耗盡
      uploadedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [uploadedFiles]);

  const processFiles = async (files: File[]) => {
    setIsUploading(true);
    try {
      const newUploads: UploadedFileData[] = [];
      // Info: (20260321 - Julian) 批次平行上傳至雲端儲存
      await Promise.all(
        files.map(async (file) => {
          const [hashInfo, base64] = await Promise.all([
            new Promise<{ hash: string }>((resolve, reject) => {
              uploadFile(file, {
                onSuccess: (hash) => resolve({ hash }),
                onError: (error) => reject(error),
              });
            }),
            fileToBase64(file),
          ]);
          newUploads.push({
            id: crypto.randomUUID(),
            file: {
              ...file,
              name: file.name,
              type: file.type,
            },
            previewUrl: file.type.startsWith("image/")
              ? URL.createObjectURL(file)
              : null,
            hash: hashInfo.hash,
            base64,
          });
        }),
      );
      setUploadedFiles((prev) => [...prev, ...newUploads]);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyzeAll = async () => {
    if (uploadedFiles.length === 0) return;

    const costPerFile = getAnalysisCost({
      category: "journal_upload",
      periodType: "daily",
      year: new Date().getFullYear(),
      periodValue: "",
    });
    const totalCost = costPerFile * uploadedFiles.length;

    const payload: IOrderPayload = {
      category: "journal_upload",
      periodType: "daily",
      periodValue: new Date().toISOString().split("T")[0],
      year: new Date().getFullYear(),
      items: [
        {
          name: "AI Journal OCR scan (Upload)",
          unitPrice: costPerFile,
          quantity: uploadedFiles.length,
        },
      ],
    };

    await executeOrderTransaction(payload, totalCost, async (authData) => {
      setShowConfirmModal(false);
      setIsAnalyzing(true);
      setAnalyzedCount(0);
      for (let i = 0; i < uploadedFiles.length; i++) {
        const fileData = uploadedFiles[i];
        const response = await request<IApiResponse<object>>(
          `/api/v1/user/account_book/${accountBookId}/ai_analysis`,
          {
            method: "POST",
            body: JSON.stringify({
              file: fileData,
              authentication: authData,
            }),
          },
        );
        if (response.code === ApiCode.SUCCESS) {
          setAnalyzedCount((prev) => prev + 1);
        }
      }
      onUploadComplete?.();
    });

    setIsAnalyzing(false);
  };

  const removeFile = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = "";
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
            {t("ocr.analyzing")}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-2xl font-black tracking-tight text-orange-600">
              {analyzedCount}
            </span>
            <span className="text-xl font-bold text-slate-400">/</span>
            <span className="text-2xl font-bold tracking-tight text-slate-600">
              {uploadedFiles.length}
            </span>
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-500">
            {t("ocr.please_wait")}
          </p>
        </div>
      )}

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={`flex h-full flex-col rounded-2xl border-2 transition-colors sm:min-h-[500px] lg:h-[calc(100vh-250px)] ${
          uploadedFiles.length > 0
            ? "border-transparent bg-white p-4 shadow-[0_0_15px_rgba(0,0,0,0.05)] sm:p-6 lg:p-10"
            : isDragging
              ? "items-center justify-center border-dashed border-orange-500 bg-orange-50 p-10 sm:p-20 lg:p-[100px]"
              : "items-center justify-center border-dashed border-slate-300 bg-white p-10 hover:border-orange-400 hover:bg-slate-50 sm:p-20 lg:p-[100px]"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={
          uploadedFiles.length === 0 && !isUploading
            ? triggerFileInput
            : undefined
        }
        onKeyDown={(e) => {
          if (
            uploadedFiles.length === 0 &&
            (e.key === "Enter" || e.key === " ")
          ) {
            e.preventDefault();
            if (!isUploading) triggerFileInput();
          }
        }}
        role={uploadedFiles.length === 0 ? "button" : "presentation"}
        tabIndex={uploadedFiles.length === 0 ? 0 : -1}
      >
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
          aria-label="Upload multiple files"
        />

        {uploadedFiles.length > 0 ? (
          <div className="animate-in fade-in zoom-in flex h-full w-full flex-col duration-300">
            {/* Info: (20260321 - Luphia) Action Bar */}
            <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {t("ocr.prepared_files_prefix")}
                  {uploadedFiles.length}
                  {t("ocr.prepared_files_suffix")}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {t("ocr.add_more_or_analyze")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFiles([]);
                  }}
                  disabled={isAnalyzing}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("ocr.clear_all_btn")}
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-600 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-100 focus:ring-2 focus:ring-orange-200 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFileInput();
                  }}
                  disabled={isUploading || isAnalyzing}
                >
                  <Plus className="h-4 w-4" />
                  {t("ocr.add_more_btn")}
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-orange-600 hover:shadow focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirmModal(true);
                  }}
                  disabled={isAnalyzing || isUploading}
                >
                  <Wand2 className="h-4 w-4" />
                  {t("ocr.analyze_all_btn")}
                </button>
              </div>
            </div>

            {/* Info: (20260321 - Luphia) Grid display for uploaded files */}
            <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 grid flex-1 auto-rows-max grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {uploadedFiles.map((fileData) => (
                <div
                  key={fileData.id}
                  className="group relative flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-orange-300 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={(e) => removeFile(fileData.id, e)}
                    className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 opacity-0 shadow-sm ring-1 ring-slate-200 transition-all group-hover:opacity-100 hover:text-red-500 hover:shadow hover:ring-red-200 focus:outline-none"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-50 transition-colors group-hover:bg-orange-50/50">
                    {fileData.previewUrl ? (
                      <Image
                        src={fileData.previewUrl}
                        alt={fileData.file.name}
                        fill
                        className="object-cover"
                        unoptimized={true}
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 group-hover:text-orange-400">
                        <FileIcon className="mb-2 h-8 w-8 text-current" />
                        <span className="text-xs font-semibold">
                          {t("ocr.no_image")}
                        </span>
                      </div>
                    )}
                  </div>
                  <p
                    className="w-full truncate text-center text-xs font-semibold text-slate-600 group-hover:text-slate-900"
                    title={fileData.file.name}
                  >
                    {fileData.file.name}
                  </p>
                </div>
              ))}

              {isUploading && (
                <div className="flex h-[182px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-orange-300 bg-orange-50/50 p-4 text-orange-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm font-bold">
                    {t("ocr.uploading")}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : isUploading ? (
          <div className="flex flex-col items-center gap-4 text-orange-600">
            <Loader2 className="h-12 w-12 animate-spin" />
            <p className="text-xl font-bold">{t("ocr.uploading")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 text-slate-500">
            <div className="rounded-full bg-orange-50 p-5 text-orange-500 transition-colors group-hover:bg-orange-100">
              <UploadCloud className="h-12 w-12" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-700">
                {t("ocr.click_or_drag")}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {t("ocr.multiple_files_supported")}
              </p>
            </div>
          </div>
        )}
      </div>

      <PaymentConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          if (
            workflowStatus === "error" ||
            workflowStatus === "payment_success"
          ) {
            resetTransaction();
            setShowConfirmModal(false);
          } else if (workflowStatus === "idle") {
            setShowConfirmModal(false);
          }
        }}
        onConfirm={handleAnalyzeAll}
        cost={
          uploadedFiles.length *
          getAnalysisCost({
            category: "journal_upload",
            periodType: "daily",
            year: new Date().getFullYear(),
            periodValue: "",
          })
        }
        title={t("ocr.confirm_analyze_title")}
        description={t("ocr.confirm_analyze_desc")}
        confirmBtnText={t("ocr.confirm_btn")}
        items={[
          {
            label: t("ocr.analysis_type"),
            value: t("ocr.multiple_page_upload"),
          },
          {
            label: t("ocr.page_count"),
            value: `${uploadedFiles.length} ${t("ocr.page_unit")}`,
          },
        ]}
        isLoading={
          workflowStatus !== "idle" &&
          workflowStatus !== "payment_success" &&
          workflowStatus !== "error"
        }
        status={workflowStatus}
        errorMessage={errorMessage}
        txHash={txHash}
      />
    </>
  );
}
