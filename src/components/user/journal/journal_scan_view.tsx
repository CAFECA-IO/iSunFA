"use client";

import { useEffect, useRef, useState, useCallback, MouseEvent } from "react";
import Image from "next/image";
import { Loader2, X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import PaymentConfirmModal from "@/components/common/payment_confirm_modal";
import { useParams } from "next/navigation";
import { uploadFile, fileToBase64 } from "@/lib/file_operator";
import { useAnalysisPayment } from "@/hooks/use_analysis_payment";

import {
  useJournalAnalysis,
  UploadedFileData,
} from "@/hooks/use_journal_analysis";
import DocumentScanner from "@/components/common/document_scanner";

export default function JournalScanView({
  onScanComplete,
}: {
  onScanComplete: () => void;
}) {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [capturedFiles, setCapturedFiles] = useState<UploadedFileData[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Info: (20260813 - Luphia) 統一付款入口（設計書 §5.6）：團隊額度 / 個人點數兩種來源
  const {
    workflowStatus,
    errorMessage,
    txHash,
    reset: resetPayment,
    pay,
    paymentSourceNode,
    paysWithTeamQuota,
  } = useAnalysisPayment();

  const {
    isAnalyzing,
    analyzedCount,
    showConfirmModal,
    setShowConfirmModal,
    handleAnalyzeAll,
  } = useJournalAnalysis({
    accountBookId,
    executeOrderTransaction: pay,
    itemName: "AI Journal OCR scan",
    onComplete: onScanComplete,
  });

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const capturedFilesRef = useRef<UploadedFileData[]>([]);
  useEffect(() => {
    capturedFilesRef.current = capturedFiles;
  }, [capturedFiles]);

  useEffect(() => {
    return () => {
      // Info: (20260402 - Luphia) Only revoke on component unmount, not on every re-render
      capturedFilesRef.current.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

  const uploadCapturedImage = useCallback(async (blob: Blob) => {
    try {
      const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
      const hash = await new Promise<string>((resolve, reject) => {
        uploadFile(file, {
          onSuccess: (h) => resolve(h),
          onError: (e) => reject(e),
        });
      });
      const base64 = await fileToBase64(file);
      const fileData: UploadedFileData = {
        id: crypto.randomUUID(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        hash,
        base64,
      };

      setCapturedFiles((prev) => [...prev, fileData]);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const onAnalyzeClick = () => {
    handleAnalyzeAll(capturedFiles);
  };

  const removeFile = (id: string, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setCapturedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file && file.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  return (
    <div className="relative flex h-full min-h-[500px] flex-col overflow-hidden rounded-2xl bg-black lg:h-[calc(100vh-250px)]">
      <DocumentScanner
        onCapture={uploadCapturedImage}
        disabled={isAnalyzing || capturedFiles.length >= 100}
      />
      {isAnalyzing && (
        <div className="absolute inset-0 z-100 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md backdrop-saturate-150 transition-all duration-300">
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
              {capturedFiles.length}
            </span>
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-500">
            {t("ocr.please_wait")}
          </p>
        </div>
      )}

      <div className="absolute right-0 bottom-0 left-0 z-30 flex min-h-[120px] flex-col justify-end bg-linear-to-t from-black/80 to-transparent p-4 pb-6">
        {capturedFiles.length > 0 && (
          <div className="scrollbar-none mb-4 flex gap-3 overflow-x-auto pb-2">
            {capturedFiles.map((fileData, index) => (
              <div
                key={fileData.id}
                className="relative h-16 w-12 shrink-0 cursor-pointer overflow-hidden rounded-md ring-2 ring-white/50 transition-all hover:ring-white"
                onClick={() => setPreviewIndex(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setPreviewIndex(index);
                }}
              >
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={(e) => removeFile(fileData.id, e)}
                  className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 focus:outline-none"
                >
                  <X className="h-3 w-3" />
                </button>
                <Image
                  src={fileData.previewUrl || ""}
                  alt="Scan"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
        <div className="pointer-events-none flex items-center justify-end px-2">
          <div className="flex w-1/3 justify-end">
            {capturedFiles.length > 0 && (
              <button
                className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-orange-600 disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirmModal(true);
                }}
                disabled={isAnalyzing}
              >
                <span>
                  {t("ocr.analyze_btn_with_count", {
                    count: capturedFiles.length,
                  })}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info: (20260402 - Luphia) Image Preview Modal */}
      {previewIndex !== null && capturedFiles[previewIndex] && (
        <div
          role="presentation"
          className="fixed inset-0 z-200 flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          onClick={() => setPreviewIndex(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setPreviewIndex(null);
          }}
          onTouchStart={(e) => {
            touchStartX.current = e.targetTouches[0].clientX;
          }}
          onTouchMove={(e) => {
            touchEndX.current = e.targetTouches[0].clientX;
          }}
          onTouchEnd={() => {
            const diff = touchStartX.current - touchEndX.current;
            // Info: (20260402 - Luphia) Require at least 50px swipe
            if (diff > 50 && previewIndex < capturedFiles.length - 1) {
              setPreviewIndex(previewIndex + 1); // Info: (20260402 - Luphia) Swipe left -> Next
            } else if (diff < -50 && previewIndex > 0) {
              setPreviewIndex(previewIndex - 1); // Info: (20260402 - Luphia) Swipe right -> Prev
            }
            // Info: (20260402 - Luphia) Reset touch ref
            touchStartX.current = 0;
            touchEndX.current = 0;
          }}
        >
          {/* Info: (20260402 - Luphia) Header actions */}
          <div
            role="presentation"
            className="absolute top-4 right-4 flex gap-4"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              className="rounded-full bg-red-500/80 p-2 text-white transition hover:bg-red-500"
              onClick={() => {
                const currentId = capturedFiles[previewIndex].id;
                removeFile(currentId);
                if (capturedFiles.length <= 1) {
                  setPreviewIndex(null);
                } else if (previewIndex === capturedFiles.length - 1) {
                  setPreviewIndex(previewIndex - 1);
                }
              }}
            >
              <Trash2 className="h-6 w-6" />
            </button>
            <button
              className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/40"
              onClick={() => setPreviewIndex(null)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Info: (20260402 - Luphia) Navigation Indicators */}
          <div
            role="presentation"
            className="absolute top-6 left-6 rounded-md bg-black/50 px-3 py-1 font-mono text-sm font-bold text-white shadow-sm"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {previewIndex + 1} / {capturedFiles.length}
          </div>

          <div
            role="presentation"
            className="relative flex h-full max-h-[85vh] w-full max-w-3xl items-center justify-center overflow-hidden rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* Info: (20260402 - Luphia) Desktop Nav Buttons */}
            {previewIndex > 0 && (
              <button
                className="absolute left-4 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/80 sm:flex"
                onClick={() => setPreviewIndex(previewIndex - 1)}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
            )}

            <Image
              key={capturedFiles[previewIndex].id}
              src={capturedFiles[previewIndex].previewUrl || ""}
              alt="Enlarged preview"
              fill
              unoptimized
              className="animate-in fade-in object-contain duration-300"
              draggable={false}
            />

            {previewIndex < capturedFiles.length - 1 && (
              <button
                className="absolute right-4 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/80 sm:flex"
                onClick={() => setPreviewIndex(previewIndex + 1)}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            )}
          </div>
        </div>
      )}

      <PaymentConfirmModal
        extraContent={paymentSourceNode}
        paidByTeamQuota={paysWithTeamQuota}
        isOpen={showConfirmModal}
        onClose={() => {
          if (
            workflowStatus === "error" ||
            workflowStatus === "payment_success"
          ) {
            resetPayment();
            setShowConfirmModal(false);
          } else if (workflowStatus === "idle") {
            setShowConfirmModal(false);
          }
        }}
        onConfirm={onAnalyzeClick}
        cost={capturedFiles.length}
        title={t("ocr.confirm_analyze_title")}
        description={t("ocr.confirm_analyze_desc")}
        confirmBtnText={t("ocr.confirm_btn")}
        items={[
          { label: t("ocr.analysis_type"), value: t("ocr.multiple_page_scan") },
          {
            label: t("ocr.page_count"),
            value: `${capturedFiles.length} ${t("ocr.page_unit")}`,
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
    </div>
  );
}
