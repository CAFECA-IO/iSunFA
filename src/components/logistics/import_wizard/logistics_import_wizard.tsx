"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";
import * as xlsx from "xlsx";
import { useTranslation } from "@/i18n/i18n_context";
interface ILogisticsImportWizardProps {
  accountBookId: string;
  onComplete: () => void;
}

interface IPreviewError {
  index: number;
  row: unknown;
  issues: string[];
}

interface IPreviewResult {
  valid: boolean;
  errors: IPreviewError[];
  successCount: number;
}

export const LogisticsImportWizard: React.FC<ILogisticsImportWizardProps> = ({
  accountBookId,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);

  // Info: (20260618 - Tzuhan) Mapping state: System Field -> Excel Header
  const [mapping, setMapping] = useState<{ [key: string]: string }>({
    origin: "",
    destination: "",
    weightKg: "",
    transportationMode: "",
  });

  const [previewResult, setPreviewResult] = useState<IPreviewResult | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const { t } = useTranslation();

  const systemFields = [
    { key: "origin", label: t("logistics.import_wizard.origin") },
    { key: "destination", label: t("logistics.import_wizard.destination") },
    { key: "weightKg", label: t("logistics.import_wizard.weight") },
    {
      key: "transportationMode",
      label: t("logistics.import_wizard.transportation_mode"),
    },
  ];

  // Info: (20260618 - Tzuhan) Step 1: Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Info: (20260618 - Tzuhan) Parse file locally to get headers and raw data
      const reader = new FileReader();
      reader.onload = (evt) => {
        const buffer = evt.target?.result;
        if (buffer) {
          const workbook = xlsx.read(buffer, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const data = xlsx.utils.sheet_to_json(sheet, {
            header: 1,
          }) as unknown[][];

          if (data.length > 0) {
            const h = data[0] as string[];
            setHeaders(h);
            const objects = xlsx.utils.sheet_to_json(sheet) as Record<
              string,
              unknown
            >[];
            setRawData(objects);
            setStep(2);
          }
        }
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  // Info: (20260618 - Tzuhan) Step 2: Handle Mapping Submit
  const handleMappingSubmit = async () => {
    setErrorMsg("");
    // Check required mappings
    if (
      !mapping.origin ||
      !mapping.destination ||
      !mapping.weightKg ||
      !mapping.transportationMode
    ) {
      setErrorMsg(t("logistics.import_wizard.mapping_incomplete"));
      return;
    }

    setIsProcessing(true);
    // Info: (20260618 - Tzuhan) Transform raw data based on mapping
    const mappedRows = rawData.map((row) => ({
      origin: row[mapping.origin],
      destination: row[mapping.destination],
      weightKg: row[mapping.weightKg],
      transportationMode: row[mapping.transportationMode],
      waypoints: [], // Info: (20260618 - Tzuhan) Optional advanced mapping can be added later
    }));

    // Info: (20260618 - Tzuhan) Call API to preview/validate
    try {
      const res = await fetch(
        `/api/v1/user/account_book/${accountBookId}/logistics/import/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: mappedRows }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setPreviewResult(data.payload);
        setStep(3);
      } else {
        setErrorMsg(
          t("logistics.import_wizard.preview_error") + ": " + data.message,
        );
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t("logistics.import_wizard.preview_error"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Info: (20260618 - Tzuhan) Step 3: Handle Execute Import (Chunking)
  const handleExecuteImport = async () => {
    setIsProcessing(true);

    // Info: (20260618 - Tzuhan) Get valid rows
    const mappedRows = rawData.map((row) => ({
      origin: String(row[mapping.origin] || ""),
      destination: String(row[mapping.destination] || ""),
      weightKg: Number(row[mapping.weightKg] || 0),
      transportationMode: String(row[mapping.transportationMode] || ""),
      waypoints: [],
    }));

    // Info: (20260618 - Tzuhan) For simplicity, we filter out rows that failed preview validation
    const validRows = mappedRows.filter(
      (_, idx) => !previewResult?.errors.find((e) => e.index === idx),
    );

    const chunkSize = 500;

    try {
      for (let i = 0; i < validRows.length; i += chunkSize) {
        const chunk = validRows.slice(i, i + chunkSize);

        const res = await fetch(
          `/api/v1/user/account_book/${accountBookId}/logistics/import/execute`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: chunk }),
          },
        );

        const data = await res.json();
        if (data.success) {
          setProgress(
            Math.round(((i + chunk.length) / validRows.length) * 100),
          );
        } else {
          throw new Error(data.message);
        }
      }
      setStep(4);
    } catch (err) {
      console.error(err);
      setErrorMsg(t("logistics.import_wizard.import_error"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {/* Info: (20260618 - Tzuhan) Stepper Header */}
      <div className="mb-8 flex items-center justify-between border-b pb-4">
        {[
          { id: 1, title: t("logistics.import_wizard.step_upload") },
          { id: 2, title: t("logistics.import_wizard.step_mapping") },
          { id: 3, title: t("logistics.import_wizard.step_preview") },
          { id: 4, title: t("logistics.import_wizard.step_complete") },
        ].map((s) => (
          <div
            key={s.id}
            className={`flex items-center ${step === s.id ? "font-semibold text-blue-600" : step > s.id ? "text-green-500" : "text-gray-400"}`}
          >
            <div
              className={`mr-2 flex h-8 w-8 items-center justify-center rounded-full border-2 ${step === s.id ? "border-blue-600 bg-blue-50" : step > s.id ? "border-green-500 bg-green-50" : "border-gray-300"}`}
            >
              {step > s.id ? <CheckCircle size={16} /> : s.id}
            </div>
            {s.title}
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-600">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Info: (20260618 - Tzuhan) Step 1: Upload */}
      {step === 1 && (
        <div className="relative rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center transition hover:bg-gray-100">
          <UploadCloud className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">
            {t("logistics.import_wizard.upload_title")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("logistics.import_wizard.upload_desc")}
          </p>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      )}

      {/* Info: (20260618 - Tzuhan) Step 2: Mapping */}
      {step === 2 && (
        <div>
          <div className="mb-6 flex items-center rounded-lg bg-blue-50 p-4 text-blue-800">
            <FileSpreadsheet className="mr-3" />
            <div>
              <p className="font-medium">
                {t("logistics.import_wizard.file_read")} {file?.name}
              </p>
              <p className="text-sm">
                {t("logistics.import_wizard.found_rows", {
                  count: rawData.length,
                })}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {systemFields.map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <span className="font-medium text-gray-700">{field.label}</span>
                <select
                  className="w-1/2 rounded-md border p-2 focus:ring-2 focus:ring-blue-500"
                  value={mapping[field.key]}
                  onChange={(e) =>
                    setMapping({ ...mapping, [field.key]: e.target.value })
                  }
                >
                  <option value="">
                    {t("logistics.import_wizard.select_column")}
                  </option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button
              onClick={() => setStep(1)}
              className="rounded-md border px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              {t("logistics.import_wizard.prev_step")}
            </button>
            <button
              onClick={handleMappingSubmit}
              disabled={isProcessing}
              className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing
                ? t("logistics.import_wizard.validating")
                : t("logistics.import_wizard.next_preview")}{" "}
              <ArrowRight size={16} className="ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Info: (20260618 - Tzuhan) Step 3: Preview */}
      {step === 3 && previewResult && (
        <div>
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <h4 className="mb-1 font-semibold text-green-800">
                {t("logistics.import_wizard.importable_count")}
              </h4>
              <p className="text-3xl text-green-600">
                {previewResult.successCount}
              </p>
            </div>
            <div
              className={`rounded-lg border p-4 ${previewResult.errors.length > 0 ? "border-red-200 bg-red-50" : "bg-gray-50"}`}
            >
              <h4
                className={`${previewResult.errors.length > 0 ? "text-red-800" : "text-gray-600"} mb-1 font-semibold`}
              >
                {t("logistics.import_wizard.error_count")}
              </h4>
              <p
                className={`text-3xl ${previewResult.errors.length > 0 ? "text-red-600" : "text-gray-400"}`}
              >
                {previewResult.errors.length}
              </p>
            </div>
          </div>

          {previewResult.errors.length > 0 && (
            <div className="mb-6 max-h-64 overflow-y-auto rounded-lg border">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="sticky top-0 bg-gray-100 text-xs text-gray-700 uppercase">
                  <tr>
                    <th className="px-4 py-3">
                      {t("logistics.import_wizard.excel_row")}
                    </th>
                    <th className="px-4 py-3">
                      {t("logistics.import_wizard.error_reason")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.errors.map((err, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3 font-medium">
                        {t("logistics.import_wizard.row_num", {
                          line: err.index + 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-red-500">
                        {err.issues.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mb-8 flex items-start rounded-lg bg-yellow-50 p-4 text-yellow-800">
            <AlertTriangle className="mt-1 mr-3 flex-shrink-0" size={20} />
            <p className="text-sm">
              {t("logistics.import_wizard.skip_warning")}
            </p>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button
              onClick={() => setStep(2)}
              className="rounded-md border px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              {t("logistics.import_wizard.re_map")}
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={isProcessing || previewResult.successCount === 0}
              className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing
                ? t("logistics.import_wizard.writing", { progress })
                : t("logistics.import_wizard.confirm_execute")}{" "}
              <CheckCircle size={16} className="ml-2" />
            </button>
          </div>

          {isProcessing && (
            <div className="mt-4 h-2.5 w-full rounded-full bg-gray-200">
              <div
                className="h-2.5 rounded-full bg-blue-600"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Info: (20260618 - Tzuhan) Step 4: Complete */}
      {step === 4 && (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-gray-900">
            {t("logistics.import_wizard.import_success")}
          </h3>
          <p className="mb-8 text-gray-600">
            {t("logistics.import_wizard.success_desc")}
          </p>
          <button
            onClick={onComplete}
            className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            {t("logistics.import_wizard.back_to_list")}
          </button>
        </div>
      )}
    </div>
  );
};
