"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import JournalUploadView from "@/components/user/journal/journal_upload_view";
import JournalListView from "@/components/user/journal/journal_list_view";
import JournalLogView from "@/components/user/journal/journal_log_view";

enum EJournalTab {
  UPLOAD = "upload",
  LIST = "list",
  LOG = "log",
}

export default function JournalMainView() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<EJournalTab>(EJournalTab.UPLOAD);

  const renderView = () => {
    switch (activeTab) {
      case EJournalTab.UPLOAD:
        return (
          <JournalUploadView
            onUploadComplete={() => setActiveTab(EJournalTab.LIST)}
          />
        );
      case EJournalTab.LIST:
        return <JournalListView />;
      case EJournalTab.LOG:
        return <JournalLogView />;
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col bg-gray-50">
      <div className="flex justify-between px-4 py-4 md:px-8 md:py-6">
        <h1 className="font-sans text-xl font-bold text-slate-800 md:text-2xl">
          {t("journal.main_view.title")}
        </h1>
      </div>

      {/* Info: (20260304 - Julian) Menu */}
      <div className="flex flex-col min-w-0 max-w-full gap-4 px-2 sm:px-4 lg:flex-row">
        {/* Info: (20260304 - Julian) Upload Area */}
        <div className="flex h-fit w-full max-w-full flex-row gap-2 overflow-x-auto rounded-lg border border-gray-200 bg-gray-100 p-2 hide-scrollbar lg:w-[180px] lg:flex-col lg:overflow-visible lg:p-4">
          <button
            type="button"
            className={`flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors lg:justify-start ${
              activeTab === EJournalTab.UPLOAD
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab(EJournalTab.UPLOAD)}
          >
            {t("journal.main_view.upload")}
          </button>
          {/* Info: (20260304 - Julian) View Logs */}
          <button
            type="button"
            className={`flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors lg:justify-start ${
              activeTab === EJournalTab.LIST
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab(EJournalTab.LIST)}
          >
            {t("journal.main_view.list")}
          </button>
          {/* Info: (20260306 - Julian) View Audit Logs */}
          <button
            type="button"
            className={`flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors lg:justify-start ${
              activeTab === EJournalTab.LOG
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab(EJournalTab.LOG)}
          >
            {t("journal.main_view.log")}
          </button>
        </div>

        {/* Info: (20260304 - Julian) Main View */}
        <div className="min-w-0 w-full lg:w-[calc(100vw-250px)] lg:px-4">
          {renderView()}
        </div>
      </div>
    </div>
  );
}
