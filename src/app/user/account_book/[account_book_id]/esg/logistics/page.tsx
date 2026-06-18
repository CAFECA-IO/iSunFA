"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Plus, DownloadCloud, ArrowLeft, FileSpreadsheet } from "lucide-react";
import { LogisticsImportWizard } from "@/components/logistics/import_wizard/logistics_import_wizard";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import { useTranslation } from "@/i18n/i18n_context";

interface ILogisticsRecordDisplay {
  origin: string;
  destination: string;
  weightKg: number;
  transportationMode: string;
  status: string;
  id?: string;
}

export default function LogisticsPage({
  params,
}: {
  params: Promise<{ account_book_id: string }>;
}) {
  const unwrappedParams = use(params);
  const accountBookId = unwrappedParams.account_book_id;

  const { t } = useTranslation();

  const [showWizard, setShowWizard] = useState(false);
  const [records, setRecords] = useState<ILogisticsRecordDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/v1/user/account_book/${accountBookId}/logistics`,
      );
      const data = await res.json();
      if (data.success) {
        setRecords(data.payload || []);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [accountBookId]);

  useEffect(() => {
    if (!showWizard) {
      fetchRecords();
    }
  }, [showWizard, fetchRecords]);

  const columns: IDataTableColumn<ILogisticsRecordDisplay>[] = [
    { key: "origin", label: t("logistics.page.origin") },
    { key: "destination", label: t("logistics.page.destination") },
    { key: "weightKg", label: t("logistics.page.weight") },
    {
      key: "transportationMode",
      label: t("logistics.page.transportation_mode"),
    },
    {
      key: "status",
      label: t("logistics.page.status"),
      render: (row) => (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
          {row.status}
        </span>
      ),
    },
  ];

  if (showWizard) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <button
          onClick={() => setShowWizard(false)}
          className="mb-6 flex items-center text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={16} className="mr-2" /> {t("logistics.page.back")}
        </button>
        <LogisticsImportWizard
          accountBookId={accountBookId}
          onComplete={() => setShowWizard(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("logistics.page.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("logistics.page.desc")}
          </p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-50">
            <DownloadCloud size={16} className="mr-2" />
            {t("logistics.page.download_example")}
          </button>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={16} className="mr-2" />
            {t("logistics.page.batch_import")}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            {t("logistics.page.loading")}
          </div>
        ) : records.length > 0 ? (
          <DataTable
            columns={columns}
            data={records}
            rowKey={(row) =>
              row.id || `${row.origin}-${row.destination}-${row.weightKg}`
            }
          />
        ) : (
          <div className="p-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <FileSpreadsheet className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-1 text-lg font-medium text-gray-900">
              {t("logistics.page.no_records")}
            </h3>
            <p className="mb-6 text-gray-500">
              {t("logistics.page.start_import_desc")}
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              {t("logistics.page.start_import")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
