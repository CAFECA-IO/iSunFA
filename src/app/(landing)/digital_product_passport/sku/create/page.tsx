"use client";

import { useTranslation } from "@/i18n/i18n_context";
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Circle,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import ConfirmModal from "@/components/common/confirm_modal";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { uploadFile } from "@/lib/file_operator";
import { IAccountBook } from "@/interfaces/account_book";

export default function SkuCreatePage() {
  const { t } = useTranslation();
  const router = useRouter();

  const DPP_MODULES = [
    t("digital_product_passport.sku_creation.modules.m1"),
    t("digital_product_passport.sku_creation.modules.m2"),
    t("digital_product_passport.sku_creation.modules.m3"),
    t("digital_product_passport.sku_creation.modules.m4"),
    t("digital_product_passport.sku_creation.modules.m5"),
    t("digital_product_passport.sku_creation.modules.m6"),
    t("digital_product_passport.sku_creation.modules.m7"),
    t("digital_product_passport.sku_creation.modules.m8"),
    t("digital_product_passport.sku_creation.modules.m9"),
  ];

  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [currentModuleIdx, setCurrentModuleIdx] = useState(-1);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [accountBooks, setAccountBooks] = useState<IAccountBook[]>([]);
  const [selectedAccountBookId, setSelectedAccountBookId] = useState("");

  useEffect(() => {
    const fetchAccountBooks = async () => {
      try {
        const res = await request<IApiResponse<IAccountBook[]>>(
          "/api/v1/user/account_book",
        );
        if (res.success && res.payload) {
          setAccountBooks(res.payload);
          if (res.payload.length > 0) {
            setSelectedAccountBookId(res.payload[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch account books", err);
      }
    };
    fetchAccountBooks();
  }, []);

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setIsAlertOpen(true);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSimulateUpload = async () => {
    if (files.length === 0) return;
    if (!selectedAccountBookId) {
      showAlert(
        t("common.notification"),
        t("account_book_selection.empty_title"),
      );
      return;
    }
    setIsUploading(true);

    try {
      // Info: (20260514 - Luphia) Upload each file via file_operator to IPFS
      const uploadPromises = files.map((file) => {
        return new Promise<string>((resolve, reject) => {
          uploadFile(file, {
            onSuccess: (hash) => resolve(hash),
            onError: (err) => reject(new Error(err)),
          });
        });
      });

      const fileIds = await Promise.all(uploadPromises);

      const responseData = await request<IApiResponse<{ id: string }>>(
        "/api/v1/user/dpp/sku",
        {
          method: "POST",
          body: JSON.stringify({
            accountBookId: selectedAccountBookId,
            fileIds,
          }),
        },
      );

      setIsUploading(false);

      if (responseData.success && responseData.payload) {
        setIsProcessing(true);
        simulateAIProcessing(responseData.payload.id);
      } else {
        showAlert(
          t("common.notification"),
          t("digital_product_passport.sku_creation.upload_failed") +
            responseData.message,
        );
      }
    } catch (err) {
      setIsUploading(false);
      console.error(err);
      showAlert(
        t("common.notification"),
        t("digital_product_passport.sku_creation.upload_error"),
      );
    }
  };

  const simulateAIProcessing = (newSkuId: string) => {
    let idx = 0;
    const interval = setInterval(() => {
      setCurrentModuleIdx(idx);
      idx++;
      if (idx > DPP_MODULES.length) {
        clearInterval(interval);
        setTimeout(() => {
          router.push(`/digital_product_passport/sku/${newSkuId}`);
        }, 1000);
      }
    }, 800);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="mb-2 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("digital_product_passport.sku_creation.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("digital_product_passport.sku_creation.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Info: (20260513 - Luphia) Left Column: Upload Area */}
        <div className="space-y-6 lg:col-span-2">
          {/* Info: (20260514 - Luphia) Account Book Selector */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <label
              htmlFor="account_book_select"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              {t("account_book_selection.title")}
            </label>
            <select
              id="account_book_select"
              value={selectedAccountBookId}
              onChange={(e) => setSelectedAccountBookId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="" disabled>
                ---
              </option>
              {accountBooks.map((ab) => (
                <option key={ab.id} value={ab.id}>
                  {ab.name} ({ab.teamName})
                </option>
              ))}
            </select>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="File upload drop zone"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                document.getElementById("file-upload")?.click();
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed ${files.length > 0 ? "border-emerald-300 bg-emerald-50/20" : "border-gray-300 bg-gray-50/50"} p-16 transition-all hover:border-blue-400 hover:bg-blue-50/30`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-500" />
                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  {t("digital_product_passport.sku_creation.ai_analyzing")}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("digital_product_passport.sku_creation.ai_analyzing_desc")}
                </p>
              </div>
            ) : files.length > 0 ? (
              <div className="flex w-full flex-col items-center">
                <div className="mb-6 flex flex-wrap justify-center gap-3">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm"
                    >
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="max-w-[150px] truncate text-sm font-medium text-gray-700">
                        {f.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFiles(files.filter((_, idx) => idx !== i))
                        }
                        className="ml-2"
                      >
                        <X className="h-4 w-4 cursor-pointer text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSimulateUpload}
                  disabled={isUploading}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  {isUploading
                    ? t("digital_product_passport.sku_creation.uploading")
                    : t(
                        "digital_product_passport.sku_creation.start_extraction",
                      )}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 text-blue-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
                  <UploadCloud className="h-10 w-10" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  {t("digital_product_passport.sku_creation.drag_drop")}
                </h3>
                <p className="max-w-md text-center text-sm text-gray-500">
                  {t("digital_product_passport.sku_creation.upload_desc")}
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <div className="h-px w-12 bg-gray-200"></div>
                  <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    {t("digital_product_passport.sku_creation.or")}
                  </span>
                  <div className="h-px w-12 bg-gray-200"></div>
                </div>
                <label
                  htmlFor="file-upload"
                  className="mt-6 cursor-pointer rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  {t("digital_product_passport.sku_creation.browse_files")}
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    aria-label="Browse Files"
                    className="hidden"
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Info: (20260513 - Luphia) Right Column: AI Extraction Progress (Chapter Detector) */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="relative flex h-3 w-3">
                {isProcessing && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex h-3 w-3 rounded-full ${isProcessing ? "bg-blue-500" : "bg-gray-300"}`}
                ></span>
              </span>
              {t("digital_product_passport.sku_creation.ai_status")}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {t("digital_product_passport.sku_creation.mapping_desc")}
            </p>
          </div>

          <div className="space-y-4">
            {DPP_MODULES.map((module, idx) => {
              const isDone = currentModuleIdx > idx;
              const isCurrent = currentModuleIdx === idx;
              const isPending = currentModuleIdx < idx;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 transition-opacity duration-300 ${isPending && currentModuleIdx !== -1 ? "opacity-40" : "opacity-100"}`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                  <span
                    className={`text-sm font-medium ${isCurrent ? "text-blue-600" : isDone ? "text-gray-900" : "text-gray-500"}`}
                  >
                    {module}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        title={alertTitle}
        message={alertMessage}
      />
    </div>
  );
}
