"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import JournalUploadView from "@/components/user/ocr/journal_upload_view";
import JournalListView from "@/components/user/ocr/journal_list_view";

export default function OcrView() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"upload" | "list">("upload");

  const renderView = () => {
    switch (activeTab) {
      case "upload":
        return (
          <JournalUploadView onUploadComplete={() => setActiveTab("list")} />
        );
      case "list":
        return <JournalListView />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Info: (20260304 - Julian) Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("ocr.title")}</h1>
      </div>

      <div className="flex items-center">
        {/* Info: (20260304 - Julian) Tabs */}
        <div className="flex flex-col gap-2 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab("upload")}
            className={`${
              activeTab === "upload" ? "bg-white shadow-sm" : "hover:bg-gray-50"
            } rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
          >
            {t("ocr.upload")}
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`${
              activeTab === "list" ? "bg-white shadow-sm" : "hover:bg-gray-50"
            } rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
          >
            {t("ocr.list")}
          </button>
        </div>

        {/* Info: (20260304 - Julian) Main View */}
        <div className="h-[500px] w-[calc(100vw-250px)] px-4">
          {renderView()}
        </div>
      </div>
    </div>
  );
}
