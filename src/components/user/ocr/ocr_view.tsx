"use client";

import { useState } from "react";
import JournalUploadView from "@/components/user/ocr/journal_upload_view";
import JournalListView from "@/components/user/ocr/journal_list_view";

export default function OcrView() {
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
    <div className="flex min-h-[calc(100vh-80px)] w-full flex-col bg-gray-50">
      <div className="flex justify-between px-8 py-6">
        <h1 className="font-sans text-2xl font-bold text-slate-800">
          憑證管理
        </h1>
      </div>

      {/* Info: (20260304 - Julian) Menu */}
      <div className="flex gap-4 px-4">
        {/* Info: (20260304 - Julian) Upload Area */}
        <div className="flex h-fit w-[180px] flex-col gap-2 rounded-lg border border-gray-200 bg-gray-100 p-4">
          <button
            type="button"
            className={`flex w-full items-center justify-start gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "upload"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("upload")}
          >
            上傳憑證
          </button>
          {/* Info: (20260304 - Julian) View Logs */}
          <button
            type="button"
            className={`flex w-full items-center justify-start gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "list"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("list")}
          >
            憑證列表
          </button>
        </div>

        {/* Info: (20260304 - Julian) Main View */}
        <div className="min-h-[500px] w-[calc(100vw-250px)]">
          {renderView()}
        </div>
      </div>
    </div>
  );
}
