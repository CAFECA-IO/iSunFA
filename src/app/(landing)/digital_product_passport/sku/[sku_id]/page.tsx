"use client";

import { useTranslation } from "@/i18n/i18n_context";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  UploadCloud,
  ShieldCheck,
  Factory,
  Loader2,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useState, useRef } from "react";
import useSWR from "swr";
import { DPP_SKU_STATUS } from "@/constants/status";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { uploadFile } from "@/lib/file_operator";

interface ISkuPayload {
  status: string;
  missingGaps?: { module: string; issue: string; impact: string }[];
  modulesData?: Record<string, { extracted: boolean }>;
}

const fetcher = (url: string) =>
  request<IApiResponse<ISkuPayload>>(url, { method: "GET" });

export default function SkuDiagnosticPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const skuId = params.sku_id as string;

  const { data: response, isLoading } = useSWR(
    skuId !== "demo-sku-12345" ? `/api/v1/user/dpp/sku/${skuId}` : null,
    fetcher,
  );

  const sku = response?.payload || null;

  // Info: (20260514 - Luphia) Supplementary Upload State
  const [uploadingGaps, setUploadingGaps] = useState<Record<number, boolean>>(
    {},
  );
  const [clearedGaps, setClearedGaps] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeGapIdx, setActiveGapIdx] = useState<number | null>(null);

  const handleTriggerUpload = (idx: number) => {
    setActiveGapIdx(idx);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || activeGapIdx === null)
      return;
    const file = e.target.files[0];
    const currentIdx = activeGapIdx;

    setUploadingGaps((prev) => ({ ...prev, [currentIdx]: true }));

    try {
      // Info: (20260514 - Luphia) Upload the file to IPFS
      await new Promise<string>((resolve, reject) => {
        uploadFile(file, {
          onSuccess: (hash) => resolve(hash),
          onError: (err) => reject(new Error(err)),
        });
      });

      // Info: (20260514 - Luphia) Simulate AI extraction complete & gap cleared
      setTimeout(() => {
        setClearedGaps((prev) => [...prev, currentIdx]);
        setUploadingGaps((prev) => ({ ...prev, [currentIdx]: false }));
      }, 1500); // Info: (20260514 - Luphia) Give a little visual feedback delay
    } catch (err) {
      console.error("Upload failed", err);
      setUploadingGaps((prev) => ({ ...prev, [currentIdx]: false }));
      alert(
        t("digital_product_passport.sku_creation.upload_error") ||
          "Failed to upload supplement document.",
      );
    } finally {
      setActiveGapIdx(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const originalGaps = sku?.missingGaps || [];
  const gaps = originalGaps.filter((_, idx) => !clearedGaps.includes(idx));
  const isReady = sku
    ? sku.status === DPP_SKU_STATUS.READY || gaps.length === 0
    : gaps.length === 0;
  const readinessScore = isReady ? 100 : 100 - gaps.length * 12.5; // Info: (20260513 - Luphia) Simplified calculation

  const modulesData = sku?.modulesData;
  const detectedModules = modulesData
    ? Object.keys(modulesData)
        .filter((key) => modulesData[key].extracted)
        .map((key) => key.replace(/_/g, " ").toUpperCase())
    : [];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/digital_product_passport`)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {t("digital_product_passport.sku_diagnostics.title")}
              </h1>
              <span
                className={`rounded-md px-2.5 py-1 text-xs font-bold tracking-wider uppercase ${isReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
              >
                {isReady
                  ? t("digital_product_passport.sku_diagnostics.status.READY")
                  : t(
                      "digital_product_passport.sku_diagnostics.status.AUDITING",
                    )}
              </span>
            </div>
            <p className="mt-1 font-mono text-sm text-gray-500">
              {t("digital_product_passport.sku_diagnostics.id")}
              {skuId}
            </p>
          </div>
        </div>

        {/* Info: (20260514 - Luphia) Hidden file input for supplementary uploads */}
        <label htmlFor="supplementary-upload" className="sr-only">
          {t("digital_product_passport.sku_diagnostics.upload_doc")}
        </label>
        <input
          id="supplementary-upload"
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          aria-label={
            t("digital_product_passport.sku_diagnostics.upload_doc") ||
            "Upload Supplementary Document"
          }
        />

        {isReady && (
          <button
            onClick={() =>
              router.push(`/digital_product_passport/sku/${skuId}/batch/create`)
            }
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            <Factory className="h-4 w-4" />{" "}
            {t("digital_product_passport.sku_diagnostics.issue_batch")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info: (20260513 - Luphia) Left Column: Readiness Seal & Summary */}
        <div className="space-y-6 lg:col-span-1">
          <div className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            {/* Info: (20260513 - Luphia) Background decoration */}
            <div
              className={`absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-10 ${isReady ? "bg-emerald-500" : "bg-amber-500"}`}
            ></div>

            {isReady ? (
              <div className="mb-6 rounded-full bg-emerald-50 p-6 text-emerald-500 ring-8 ring-emerald-50/50">
                <ShieldCheck className="h-16 w-16" />
              </div>
            ) : (
              <div className="relative mb-6 rounded-full bg-amber-50 p-6 text-amber-500 ring-8 ring-amber-50/50">
                <AlertTriangle className="h-16 w-16" />
              </div>
            )}

            <h2 className="mb-2 text-2xl font-black text-gray-900">
              {isReady
                ? t("digital_product_passport.sku_diagnostics.ready_title")
                : t(
                    "digital_product_passport.sku_diagnostics.action_required_title",
                  )}
            </h2>
            <p className="mb-8 text-sm text-gray-500">
              {isReady
                ? t("digital_product_passport.sku_diagnostics.ready_desc")
                : t(
                    "digital_product_passport.sku_diagnostics.action_required_desc",
                  )}
            </p>

            <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-3 rounded-full transition-all duration-1000 ${isReady ? "bg-emerald-500" : "bg-amber-500"}`}
                style={{ width: `${readinessScore}%` }}
              ></div>
            </div>
            <div className="flex w-full justify-between text-xs font-semibold tracking-widest text-gray-500 uppercase">
              <span>
                {t("digital_product_passport.sku_diagnostics.readiness")}
              </span>
              <span className={isReady ? "text-emerald-600" : "text-amber-600"}>
                {readinessScore}%
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wider text-gray-900 uppercase">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />{" "}
              {t(
                "digital_product_passport.sku_diagnostics.successfully_extracted",
              )}
            </h3>
            <ul className="space-y-3">
              {detectedModules.map((mod, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"></span>
                  {mod}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Info: (20260513 - Luphia) Right Column: Gap Analysis Dashboard */}
        <div className="lg:col-span-2">
          <div className="h-full rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <FileWarning className="h-5 w-5 text-amber-500" />{" "}
                  {t("digital_product_passport.sku_diagnostics.gap_analysis")}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t("digital_product_passport.sku_diagnostics.gap_desc")}
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                {gaps.length}{" "}
                {t("digital_product_passport.sku_diagnostics.issues_found")}
              </span>
            </div>

            <div className="space-y-4">
              {gaps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-emerald-50 p-4 text-emerald-500">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">
                    {t("digital_product_passport.sku_diagnostics.no_gaps")}
                  </h4>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("digital_product_passport.sku_diagnostics.no_gaps_desc")}
                  </p>
                </div>
              ) : (
                originalGaps.map(
                  (
                    gap: { module: string; issue: string; impact: string },
                    idx: number,
                  ) => {
                    const isCleared = clearedGaps.includes(idx);
                    const isUploading = uploadingGaps[idx];

                    if (isCleared) return null;

                    return (
                      <div
                        key={idx}
                        className="group rounded-2xl border border-amber-200 bg-amber-50/30 p-5 transition hover:border-amber-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase">
                                {gap.impact}
                              </span>
                              <h4 className="font-bold text-gray-900">
                                {gap.module}
                              </h4>
                            </div>
                            <p className="mb-4 text-sm text-gray-600">
                              {gap.issue}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end border-t border-amber-200/50 pt-4">
                          <button
                            onClick={() => handleTriggerUpload(idx)}
                            disabled={isUploading}
                            className="flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-200 disabled:opacity-50"
                          >
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UploadCloud className="h-4 w-4" />
                            )}
                            {isUploading
                              ? t(
                                  "digital_product_passport.sku_creation.uploading",
                                )
                              : t(
                                  "digital_product_passport.sku_diagnostics.upload_doc",
                                )}
                          </button>
                        </div>
                      </div>
                    );
                  },
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
