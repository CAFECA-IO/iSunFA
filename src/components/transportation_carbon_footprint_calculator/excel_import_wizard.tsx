"use client";

import { useState, useRef } from "react";
import * as xlsx from "xlsx";
import {
  UploadCloud,
  FileText,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { RouteMode } from "@/constants/analysis";
import { IMileageItem } from "@/components/transportation_carbon_footprint_calculator/mileage_calculator";
import DataTable from "@/components/common/data_table";

interface IExcelImportWizardProps {
  onComplete: (items: IMileageItem[]) => void;
  onCancel: () => void;
}

const REQUIRED_FIELDS = [
  { key: "origin", labelKey: "logistics.page.origin" },
  { key: "dest", labelKey: "logistics.page.destination" },
];

const OPTIONAL_FIELDS: { key: string; labelKey: string }[] = [];

export function ExcelImportWizard({
  onComplete,
  onCancel,
}: IExcelImportWizardProps) {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);

  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsedItems, setParsedItems] = useState<IMileageItem[]>([]);
  const [errorCount, setErrorCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];

        // Info: (20260618 - Tzuhan) Extract headers
        const h = xlsx.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0];
        if (h && Array.isArray(h)) {
          setHeaders(h);
          const objects = xlsx.utils.sheet_to_json(sheet) as Record<
            string,
            unknown
          >[];
          setRawData(objects);

          // Info: (20260618 - Tzuhan) Auto-mapping heuristics
          const initialMap: Record<string, string> = {};
          h.forEach((header) => {
            const lower = header.toLowerCase();
            if (
              lower.includes("起") ||
              lower.includes("origin") ||
              lower.includes("出發")
            )
              initialMap["origin"] = header;
            else if (
              lower.includes("迄") ||
              lower.includes("dest") ||
              lower.includes("目的")
            )
              initialMap["dest"] = header;
          });
          setMapping(initialMap);

          setStep(2);
        }
      } catch (err) {
        console.error("Failed to parse file", err);
      }
    };
    reader.readAsBinaryString(f);
  };

  const handlePreview = () => {
    // Info: (20260618 - Tzuhan) Process local preview
    const items: IMileageItem[] = [];
    let errCnt = 0;

    rawData.forEach((row) => {
      const origin = String(row[mapping["origin"]] || "").trim();
      const dest = String(row[mapping["dest"]] || "").trim();
      const modeRaw = String(row[mapping["mode"]] || "")
        .trim()
        .toUpperCase();

      // Info: (20260618 - Tzuhan) Auto-detect mode if valid
      let mode: RouteMode | undefined = undefined;
      if (
        modeRaw.includes("LAND") ||
        modeRaw.includes("陸運") ||
        modeRaw.includes("卡車")
      )
        mode = "LAND";
      else if (
        modeRaw.includes("SEA") ||
        modeRaw.includes("海運") ||
        modeRaw.includes("船")
      )
        mode = "SEA_LAND";
      else if (
        modeRaw.includes("AIR") ||
        modeRaw.includes("空運") ||
        modeRaw.includes("飛機")
      )
        mode = "AIR_LAND";

      if (origin && dest && origin !== "undefined" && dest !== "undefined") {
        items.push({
          id: crypto.randomUUID(),
          origin,
          dest,
          mode,
        });
      } else {
        errCnt++;
      }
    });

    setParsedItems(items);
    setErrorCount(errCnt);
    setStep(3);
  };

  const isMappingValid = REQUIRED_FIELDS.every((f) => !!mapping[f.key]);

  return (
    <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
      {/* Info: (20260618 - Tzuhan) Steps Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${step >= 1 ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-400"}`}
          >
            1
          </div>
          <span
            className={`font-medium ${step >= 1 ? "text-gray-900" : "text-gray-400"}`}
          >
            {t("logistics.import_wizard.step_upload")}
          </span>
          <ArrowRight className="h-4 w-4 text-gray-300" />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${step >= 2 ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-400"}`}
          >
            2
          </div>
          <span
            className={`font-medium ${step >= 2 ? "text-gray-900" : "text-gray-400"}`}
          >
            {t("logistics.import_wizard.step_mapping")}
          </span>
          <ArrowRight className="h-4 w-4 text-gray-300" />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${step >= 3 ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-400"}`}
          >
            3
          </div>
          <span
            className={`font-medium ${step >= 3 ? "text-gray-900" : "text-gray-400"}`}
          >
            {t("logistics.import_wizard.step_preview")}
          </span>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-500 transition-colors hover:text-gray-900"
        >
          {t("common.cancel")}
        </button>
      </div>

      {step === 1 && (
        <div
          className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-12 text-center transition-all hover:border-orange-500 hover:bg-orange-50"
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") fileInputRef.current?.click();
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx,.xls,.csv,.numbers"
            onChange={handleFileUpload}
          />
          <UploadCloud className="mx-auto mb-4 h-12 w-12 text-orange-500" />
          <h3 className="mb-2 text-lg font-bold text-gray-900">
            {t("logistics.import_wizard.upload_title")}
          </h3>
          <p className="mb-6 text-sm text-gray-500">
            {t("logistics.import_wizard.upload_desc")}
          </p>
          <span className="rounded-lg bg-gray-900 px-6 py-2 font-semibold text-white transition-colors hover:bg-gray-800">
            {t("logistics.import_wizard.step_upload")}
          </span>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-lg bg-orange-50 p-4">
            <FileText className="mt-0.5 h-5 w-5 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-900">{file?.name}</p>
              <p className="text-sm text-orange-700">
                {t("logistics.import_wizard.found_rows", {
                  count: rawData.length,
                })}
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="ml-auto flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-800"
            >
              <Trash2 className="h-4 w-4" />{" "}
              {t("logistics.import_wizard.re_map")}
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  {t("logistics.import_wizard.system_field")}
                  {t(field.labelKey)}{" "}
                  {REQUIRED_FIELDS.includes(field) && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <div className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                  <ArrowRight className="h-3 w-3" />
                  {t("logistics.import_wizard.mapping_hint")}
                </div>
                <select
                  value={mapping[field.key] || ""}
                  onChange={(e) =>
                    setMapping({ ...mapping, [field.key]: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-orange-500 focus:ring-orange-500"
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

          <div className="flex justify-end pt-4">
            <button
              onClick={handlePreview}
              disabled={!isMappingValid}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-2 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("logistics.import_wizard.next_preview")}{" "}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          {errorCount > 0 && (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-red-800">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-bold">
                  {t("logistics.import_wizard.error_count")}: {errorCount}
                </p>
                <p className="text-sm">
                  {t("logistics.import_wizard.skip_warning")}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 text-green-800">
            <CheckCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-bold">
                {t("logistics.import_wizard.importable_count")}:{" "}
                {parsedItems.length}
              </p>
              <p className="text-sm">
                {t("logistics.import_wizard.import_success")}
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h4 className="text-sm font-bold text-gray-800">
                {t("logistics.import_wizard.preview_data_title")}
              </h4>
            </div>
            <DataTable
              data={parsedItems.slice(0, 5)}
              columns={[
                { key: "origin", label: t("logistics.page.origin") },
                { key: "dest", label: t("logistics.page.destination") },
                {
                  key: "mode",
                  label: t("logistics.page.transportation_mode"),
                  render: (row) =>
                    (row as IMileageItem).mode ||
                    t("logistics.import_wizard.auto_detect"),
                },
              ]}
              rowKey={(row) => JSON.stringify(row)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t("logistics.import_wizard.prev_step")}
            </button>
            <button
              onClick={() => onComplete(parsedItems)}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2 font-semibold text-white transition-colors hover:bg-gray-800"
            >
              {t("logistics.import_wizard.confirm_execute")}{" "}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
