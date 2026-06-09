"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building,
  Plus,
  PlayCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Eye,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";

interface IDemoItem {
  id: string;
  stockId: string;
  year: string;
  name: string;
  progress: {
    hasFin: boolean;
    hasEsg: boolean;
    hasPersonaHtml: boolean;
  };
  isComplete: boolean;
}

export default function DppDemoListPage() {
  const router = useRouter();
  const [items, setItems] = useState<IDemoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await request<IApiResponse<IDemoItem[]>>(
        "/api/v1/dpp-demo/list",
      );
      if (res.payload) {
        setItems(res.payload);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (stockId: string, year: string, name: string) => {
    if (
      !window.confirm(
        `確定要刪除「${name} (${year} 年)」的模擬資料嗎？此動作無法復原。`,
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await fetch("/api/v1/dpp-demo/list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockId, year }),
      });
      await fetchItems();
    } catch (e) {
      console.error("Delete failed:", e);
      alert("刪除失敗，請稍後再試");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 pb-4 font-sans">
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div>
          <h1 className="flex items-center text-xl font-bold text-gray-900">
            <Building className="mr-3 h-6 w-6 text-blue-600" />
            企業模擬資料庫
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            管理與預覽已生成的企業數位產品護照模擬資料。
          </p>
        </div>
        <button
          onClick={() => router.push("/user/dpp-demo/start")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          生成新的企業模擬資料
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-gray-500">
            <Building className="mb-4 h-16 w-16 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">
              尚無企業模擬資料
            </p>
            <p className="mt-1 text-sm">點擊上方按鈕立即建立</p>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto p-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-slate-50/30 p-5 transition-colors hover:border-blue-300"
              >
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  {/* Info: (20260609 - Tzuhan) 企業資訊 */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {item.name}{" "}
                      <span className="ml-1 text-sm font-medium text-gray-500">
                        ({item.stockId})
                      </span>
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      目標年度: {item.year}
                    </p>
                  </div>

                  {/* Info: (20260609 - Tzuhan) Day 1 進度顯示 */}
                  <div className="w-full max-w-md flex-1">
                    <p className="mb-2 text-xs font-semibold text-gray-500">
                      生成進度 (Phase 1)
                    </p>
                    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-2 text-xs font-medium text-gray-600 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        {item.progress.hasFin ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        財報下載
                      </div>
                      <div className="h-px w-4 bg-gray-300" />
                      <div className="flex items-center gap-1.5">
                        {item.progress.hasEsg ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        ESG 下載
                      </div>
                      <div className="h-px w-4 bg-gray-300" />
                      <div className="flex items-center gap-1.5">
                        {item.progress.hasPersonaHtml ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        企業畫像
                      </div>
                    </div>
                  </div>

                  {/* Info: (20260609 - Tzuhan) 操作按鈕 */}
                  <div className="mt-4 flex w-full items-center gap-2 sm:mt-0 sm:w-auto">
                    <button
                      disabled={!item.isComplete}
                      onClick={() =>
                        router.push(
                          `/user/dpp-demo/start?stockId=${item.stockId}&year=${item.year}&action=view`,
                        )
                      }
                      className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      title="查看結果"
                    >
                      <Eye className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(item.stockId, item.year, item.name)
                      }
                      className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                      title="刪除資料"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() =>
                        router.push(
                          `/user/dpp-demo/start?stockId=${item.stockId}&year=${item.year}`,
                        )
                      }
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:flex-none"
                    >
                      <RefreshCw className="h-4 w-4" />
                      重新生成
                    </button>

                    <button
                      disabled={!item.isComplete}
                      onClick={() => router.push("/user/dpp-demo/workspace")}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-5 py-2 text-sm font-bold shadow-sm transition sm:flex-none ${
                        item.isComplete
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:scale-105 hover:shadow-md"
                          : "cursor-not-allowed bg-gray-100 text-gray-400"
                      } `}
                    >
                      <PlayCircle className="h-4 w-4" />
                      demo
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
