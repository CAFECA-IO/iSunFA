"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Info,
  CheckCircle2,
  Zap,
  Truck,
  Cloud,
} from "lucide-react";
import { timestampToString } from "@/lib/utils/common";
import {
  IEsgRecord,
  EsgScope,
  EsgIntensity,
  EsgStatus,
} from "@/interfaces/esg";
import { FilePreview } from "@/components/common/file_preview";
import EsgVerifyModal from "@/components/user/esg/esg_verify_modal";
import { request } from "@/lib/utils/request";
import { useParams } from "next/navigation";
import { IApiResponse } from "@/lib/utils/response";

const EsgRow = ({
  record,
  onVerifyClick,
}: {
  record: IEsgRecord;
  onVerifyClick: (record: IEsgRecord) => void;
}) => {
  const handleVerifyClick = () => {
    onVerifyClick(record);
  };

  const renderIntensity = (intensity: EsgIntensity) => {
    switch (intensity) {
      case EsgIntensity.HIGH:
        return {
          text: "高強度",
          style: "border-red-300 bg-red-100 text-red-600",
        };
      case EsgIntensity.MEDIUM:
        return {
          text: "中強度",
          style: "border-amber-300 bg-amber-100 text-amber-600",
        };
      case EsgIntensity.LOW:
        return {
          text: "低強度",
          style: "border-green-300 bg-green-100 text-green-600",
        };
      default:
        return {
          text: "",
          style: "",
        };
    }
  };

  const renderScope = (scope: EsgScope) => {
    switch (scope) {
      case EsgScope.SCOPE_1:
        return {
          text: "範疇一",
          icon: <Zap className="mr-1.5 h-4 w-4 text-amber-500" />,
        };
      case EsgScope.SCOPE_2:
        return {
          text: "範疇二",
          icon: <Truck className="mr-1.5 h-4 w-4 text-blue-500" />,
        };
      case EsgScope.SCOPE_3:
        return {
          text: "範疇三",
          icon: <Cloud className="mr-1.5 h-4 w-4 text-green-500" />,
        };
      default:
        return {
          text: "",
          icon: null,
        };
    }
  };

  return (
    <tr>
      <td className="px-6 py-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-1 sm:h-20 sm:w-20">
          {/* Info: (20260312 - Julian) File Preview */}
          {record.file ? (
            <FilePreview
              file={{ filename: record.file.fileName || "Unknown" }}
              fileId={record.file.hash}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center bg-gray-50 p-1 sm:h-20 sm:w-20">
              <span className="text-xs font-bold text-slate-500">無檔案</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-center text-sm font-bold whitespace-nowrap text-slate-800">
        {timestampToString(record.dateTimestamp).dateWithDash}
      </td>
      <td className="px-6 py-4">
        <div className="mb-1 flex items-center text-sm font-bold text-slate-800">
          <div className="shrink-0">{renderScope(record.scope).icon}</div>
          {renderScope(record.scope).text}：{record.activityType}
        </div>
        <div className="text-xs font-medium text-slate-500">
          {record.vendor}
        </div>
      </td>
      <td className="px-6 py-4 text-center whitespace-nowrap">
        <span className="text-[15px] font-bold text-slate-800">
          {record.rawActivityData}{" "}
        </span>
        <span className="text-xs font-bold text-slate-500">{record.unit}</span>
      </td>
      <td className="px-6 py-4 text-center text-[15px] font-bold whitespace-nowrap text-slate-800">
        {record.emissions}
      </td>
      <td className="px-6 py-4 text-center">
        <span
          className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors ${renderIntensity(record.intensity).style}`}
        >
          {renderIntensity(record.intensity).text}
        </span>
      </td>
      <td aria-label="準確度" className="px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${record.confidence >= 90 ? "bg-emerald-400" : "bg-orange-500"}`}
              style={{ width: `${record.confidence}%` }}
            ></div>
          </div>
          <span className="text-sm font-black whitespace-nowrap text-slate-700">
            {record.confidence}%
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        {record.status === EsgStatus.VERIFIED ? (
          <div className="flex flex-col items-center justify-center gap-1 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-bold">已核對</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              aria-label="人工核對"
              onClick={handleVerifyClick}
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-white shadow-sm hover:bg-orange-600"
            >
              人工核對
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

export default function EsgTableSection() {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [selectedEsgId, setSelectedEsgId] = useState<string | null>(null);
  const [records, setRecords] = useState<IEsgRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchRecords = useCallback(async () => {
    if (!accountBookId) return;
    setIsLoading(true);
    try {
      const res = await request<IApiResponse<IEsgRecord[]>>(
        `/api/v1/user/account_book/${accountBookId}/esg`,
      );
      if (res.payload) {
        setRecords(res.payload);
      }
    } catch (error) {
      console.error("Failed to fetch ESG records:", error);
    } finally {
      setIsLoading(false);
    }
  }, [accountBookId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleVerifyOpen = (record: IEsgRecord) => {
    setSelectedEsgId(record.id);
    setIsVerifyModalOpen(true);
  };

  const handleVerifySave = async (updatedRecord: IEsgRecord) => {
    try {
      if (accountBookId && updatedRecord.id) {
        const res = await request<IApiResponse<IEsgRecord>>(
          `/api/v1/user/account_book/${accountBookId}/esg/${updatedRecord.id}`,
          {
            method: "PUT",
            body: JSON.stringify(updatedRecord),
          },
        );
        if (res.payload) {
          // Info: (20260312 - Julian) Refresh local state list
          await fetchRecords();
        }
      }
    } catch (err) {
      console.error("Failed to update ESG record", err);
    } finally {
      setIsVerifyModalOpen(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Info: (20260312 - Julian) Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜尋供應商、活動類型..."
            aria-label="搜尋供應商、活動類型"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            aria-label="依強度篩選"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 focus:outline-none"
          >
            <option>全部強度</option>
            <option>高強度</option>
            <option>中強度</option>
            <option>低強度</option>
          </select>
          <select
            aria-label="依範疇篩選"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 focus:outline-none"
          >
            <option>全部範疇 (Scope 1-3)</option>
          </select>
          <button
            type="button"
            aria-label="篩選"
            className="flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Filter className="mr-2 h-4 w-4" />
            篩選
          </button>
        </div>
      </div>

      {/* Info: (20260312 - Julian) Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                憑證
              </th>
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                日期
              </th>
              <th className="px-6 py-4 text-xs font-black tracking-wider text-slate-500 uppercase">
                活動類型與對象
              </th>
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                原始活動數據
              </th>
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                排放量 (KGCO2E)
              </th>
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                排放強度標籤
              </th>
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                AI 信心度
              </th>
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                狀態
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-4 text-center text-sm font-bold text-slate-500"
                >
                  載入中...
                </td>
              </tr>
            ) : records.length > 0 ? (
              records.map((record) => (
                <EsgRow
                  key={record.id}
                  record={record}
                  onVerifyClick={handleVerifyOpen}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-4 text-center text-sm font-bold text-slate-500"
                >
                  無碳排分析紀錄
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Info: (20260312 - Julian) Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3">
        <span className="text-xs font-bold text-slate-500">
          顯示 {records.length} 筆碳排分析紀錄
        </span>
        <span className="flex items-center text-xs font-bold text-slate-500">
          <Info className="mr-1 h-3.5 w-3.5" />
          數據引用：IPCC 第六次評估報告排放係數
        </span>
      </div>

      <EsgVerifyModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        esgId={selectedEsgId}
        onSave={handleVerifySave}
      />
    </div>
  );
}
