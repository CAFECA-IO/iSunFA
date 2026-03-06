"use client";

import { useState } from "react";
import JournalUploadView from "@/components/user/journal/journal_upload_view";
import JournalListView from "@/components/user/journal/journal_list_view";
import JournalLogView from "@/components/user/journal/journal_log_view";

enum EJournalTab {
  UPLOAD = "upload",
  LIST = "list",
  LOG = "log",
}

export default function JournalMainView() {
  const [activeTab, setActiveTab] = useState<EJournalTab>(EJournalTab.UPLOAD);

  // ToDo: (20260306 - Julian) 補上取得帳簿的邏輯
  const currentAccountbook = "My Accountbook";

  const renderView = () => {
    switch (activeTab) {
      case EJournalTab.UPLOAD:
        return (
          <JournalUploadView onUploadComplete={() => setActiveTab(EJournalTab.LIST)} />
        );
      case EJournalTab.LIST:
        return <JournalListView />;
      case "log":
        return <JournalLogView />;
    }
  };

  return (
    <div className="flex w-full flex-col bg-gray-50">
      <div className="flex justify-between px-8 py-6">
        <h1 className="font-sans text-2xl font-bold text-slate-800">
          憑證管理
        </h1>
      </div>

      {/* Info: (20260304 - Julian) Menu */}
      <div className="flex flex-col gap-4 px-0 lg:flex-row lg:px-4">
        {/* Info: (20260304 - Julian) Upload Area */}
        <div className="flex h-fit w-full flex-row gap-2 rounded-lg border border-gray-200 bg-gray-100 p-2 lg:w-[180px] lg:flex-col lg:p-4">
          <button
            type="button"
            className={`flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors lg:justify-start ${
              activeTab === EJournalTab.UPLOAD
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab(EJournalTab.UPLOAD)}
          >
            上傳憑證
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
            憑證列表
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
            異動紀錄
          </button>
        </div>

        {/* Info: (20260304 - Julian) Main View */}
        <div className="flex w-full flex-col gap-2 px-4 lg:w-[calc(100vw-250px)]">
          {/* Info: (20260306 - Julian) Current Accountbook */}
          <div className="ml-auto text-sm font-medium text-gray-800">
            目前帳簿：{" "}
            <span className="text-orange-600">{currentAccountbook}</span>
          </div>
          {renderView()}
        </div>
      </div>
    </div>
  );
}
