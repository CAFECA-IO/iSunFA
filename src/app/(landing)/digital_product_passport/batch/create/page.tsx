"use client";

import { useTranslation } from "@/i18n/i18n_context";
import {
  ArrowLeft,
  Save,
  Loader2,
  UploadCloud,
  FileText,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import ConfirmModal from "@/components/common/confirm_modal";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IDigitalProductPassportSku } from "@/interfaces/dpp";
import { uploadFile } from "@/lib/file_operator";

export default function GenericBatchCreatePage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [skus, setSkus] = useState<IDigitalProductPassportSku[]>([]);
  const [selectedSkuId, setSelectedSkuId] = useState("");

  const [formData, setFormData] = useState({
    batchNumber: "",
    manufactureDate: "",
    facilitySite: "",
    serialRange: "",
  });

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [onConfirmAction, setOnConfirmAction] = useState<
    (() => void) | undefined
  >();

  // AI Upload States
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchSkus = async () => {
      try {
        const res = await request<IApiResponse<IDigitalProductPassportSku[]>>(
          "/api/v1/user/dpp/sku",
        );
        if (res.success && res.payload) {
          setSkus(res.payload);
          if (res.payload.length > 0) {
            setSelectedSkuId(res.payload[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch SKUs", e);
      }
    };
    fetchSkus();
  }, []);

  const showAlert = (
    title: string,
    message: string,
    onConfirm?: () => void,
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setOnConfirmAction(() => onConfirm);
    setIsAlertOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedSkuId) {
      showAlert(
        t("common.notification"),
        t("digital_product_passport.select_sku_for_batch"),
      );
      return;
    }

    if (
      !formData.batchNumber ||
      !formData.manufactureDate ||
      !formData.facilitySite
    ) {
      showAlert(
        t("common.notification"),
        t("digital_product_passport.batch_creation.fill_required"),
      );
      return;
    }

    setIsLoading(true);
    try {
      const data = await request<IApiResponse<null>>(
        `/api/v1/user/dpp/sku/${selectedSkuId}/batch`,
        {
          method: "POST",
          body: JSON.stringify(formData),
        },
      );
      if (data.success) {
        showAlert(
          t("common.notification"),
          t("digital_product_passport.batch_creation.success"),
          () => {
            router.push(`/digital_product_passport`);
          },
        );
      } else {
        showAlert(
          t("common.notification"),
          data.message || t("digital_product_passport.batch_creation.failed"),
        );
      }
    } catch (error) {
      console.error(error);
      showAlert(
        t("common.notification"),
        t("digital_product_passport.batch_creation.error"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSimulateUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);

    try {
      const uploadPromises = files.map((file) => {
        return new Promise<string>((resolve, reject) => {
          uploadFile(file, {
            onSuccess: (hash) => resolve(hash),
            onError: (err) => reject(new Error(err)),
          });
        });
      });

      await Promise.all(uploadPromises);

      setIsUploading(false);
      setIsProcessing(true);

      // Simulate AI extraction delay
      setTimeout(() => {
        setIsProcessing(false);
        setFormData({
          batchNumber: `BATCH-AI-${Math.floor(Math.random() * 1000)}`,
          manufactureDate: new Date().toISOString().split("T")[0],
          facilitySite: "AI Recognized Factory",
          serialRange: "SN2000-SN2999",
        });
        showAlert(
          t("common.notification"),
          "AI extraction complete. Form populated.",
        );
      }, 3000);
    } catch (err) {
      setIsUploading(false);
      console.error(err);
      showAlert(
        t("common.notification"),
        t("digital_product_passport.sku_creation.upload_error"),
      );
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("digital_product_passport.batch_creation.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("digital_product_passport.batch_creation.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Form & SKU selection */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-gray-800 shadow-sm">
            <div className="flex flex-col gap-6">
              <div>
                <label
                  htmlFor="sku_select"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  {t("digital_product_passport.sku_name", {
                    defaultValue: "SKU",
                  })}
                </label>
                <select
                  id="sku_select"
                  value={selectedSkuId}
                  onChange={(e) => setSelectedSkuId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="" disabled>
                    ---
                  </option>
                  {skus.map((sku) => (
                    <option key={sku.id} value={sku.id}>
                      {sku.name} ({sku.gtin})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="batch_number"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  {t("digital_product_passport.batch_creation.batch_number")}
                </label>
                <input
                  aria-label={t(
                    "digital_product_passport.batch_creation.batch_number",
                  )}
                  id="batch_number"
                  type="text"
                  placeholder={t(
                    "digital_product_passport.batch_creation.batch_number_ph",
                  )}
                  value={formData.batchNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, batchNumber: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="manufacture_date"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  {t(
                    "digital_product_passport.batch_creation.manufacture_date",
                  )}
                </label>
                <input
                  aria-label={t(
                    "digital_product_passport.batch_creation.manufacture_date",
                  )}
                  id="manufacture_date"
                  type="date"
                  value={formData.manufactureDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      manufactureDate: e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="facility_site"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  {t("digital_product_passport.batch_creation.facility_site")}
                </label>
                <input
                  aria-label={t(
                    "digital_product_passport.batch_creation.facility_site",
                  )}
                  id="facility_site"
                  type="text"
                  placeholder={t(
                    "digital_product_passport.batch_creation.facility_site_ph",
                  )}
                  value={formData.facilitySite}
                  onChange={(e) =>
                    setFormData({ ...formData, facilitySite: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="serial_range"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  {t("digital_product_passport.batch_creation.serial_range")}
                </label>
                <input
                  aria-label={t(
                    "digital_product_passport.batch_creation.serial_range",
                  )}
                  id="serial_range"
                  type="text"
                  placeholder={t(
                    "digital_product_passport.batch_creation.serial_range_ph",
                  )}
                  value={formData.serialRange}
                  onChange={(e) =>
                    setFormData({ ...formData, serialRange: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {t("digital_product_passport.batch_creation.generate")}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Upload */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {t("digital_product_passport.sku_creation.ai_status", {
                defaultValue: "AI Extraction Status",
              })}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {t("digital_product_passport.sku_creation.mapping_desc", {
                defaultValue: "Mapping documents to schema",
              })}
            </p>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="File upload drop zone"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                document.getElementById("batch-file-upload")?.click();
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed ${files.length > 0 ? "border-emerald-300 bg-emerald-50/20" : "border-gray-300 bg-gray-50/50"} min-h-[300px] p-8 transition-all hover:border-blue-400 hover:bg-blue-50/30`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center text-center">
                <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-500" />
                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  {t("digital_product_passport.sku_creation.ai_analyzing")}
                </h3>
                <p className="text-sm text-gray-500">
                  Extracting batch information...
                </p>
              </div>
            ) : files.length > 0 ? (
              <div className="flex w-full flex-col items-center">
                <div className="mb-6 flex w-full flex-col gap-3">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                        <span className="truncate text-sm font-medium text-gray-700">
                          {f.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFiles(files.filter((_, idx) => idx !== i))
                        }
                        className="shrink-0"
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
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 text-blue-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
                  <UploadCloud className="h-10 w-10" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  {t("digital_product_passport.sku_creation.drag_drop")}
                </h3>
                <p className="max-w-[200px] text-xs text-gray-500">
                  Upload manufacturing documents for AI extraction
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="h-px w-8 bg-gray-200"></div>
                  <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    {t("digital_product_passport.sku_creation.or")}
                  </span>
                  <div className="h-px w-8 bg-gray-200"></div>
                </div>
                <label
                  htmlFor="batch-file-upload"
                  className="mt-6 cursor-pointer rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  {t("digital_product_passport.sku_creation.browse_files")}
                  <input
                    id="batch-file-upload"
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
      </div>

      <ConfirmModal
        isOpen={isAlertOpen}
        onClose={() => {
          setIsAlertOpen(false);
          if (onConfirmAction) {
            onConfirmAction();
          }
        }}
        title={alertTitle}
        message={alertMessage}
      />
    </div>
  );
}
