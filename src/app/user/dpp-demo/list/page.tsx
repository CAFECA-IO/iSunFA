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
  Trash2,
  Eye,
  DownloadCloud,
  Sparkles,
  Wand2,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import ConfirmModal from "@/components/common/confirm_modal";

interface IDemoItem {
  id: string;
  stockId: string;
  year: string;
  name: string;
  progress: {
    hasFin: boolean;
    hasEsg: boolean;
    hasPersonaHtml: boolean;
    hasBom?: boolean;
    hasSpecs?: boolean;
    dppGroundTruthFile?: string;
    dppComplianceFile?: string;
  };
  isComplete: boolean;
}

export default function DppDemoListPage() {
  const router = useRouter();
  const [items, setItems] = useState<IDemoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({ isOpen: false, title: "", message: "" });

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

  const handleDelete = (stockId: string, year: string, name: string) => {
    setModalConfig({
      isOpen: true,
      title: "確認刪除",
      message: `確定要刪除「${name} (${year} 年)」的模擬資料嗎？此動作無法復原。`,
      confirmText: "刪除",
      cancelText: "取消",
      onConfirm: async () => {
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
          setModalConfig({
            isOpen: true,
            title: "錯誤",
            message: "刪除失敗，請稍後再試",
            confirmText: "確定",
            cancelText: undefined,
            onConfirm: undefined,
          });
          setLoading(false);
        }
      },
    });
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

                  {/* Info: (20260609 - Tzuhan) 進度顯示 */}
                  <div className="flex w-full flex-1 flex-col gap-3 xl:flex-row">
                    <div className="flex-1">
                      <p className="mb-2 text-xs font-semibold text-gray-500">
                        Phase 1: 基礎資料
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
                        <div className="h-px w-2 bg-gray-300 sm:w-4" />
                        <div className="flex items-center gap-1.5">
                          {item.progress.hasEsg ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ESG 下載
                            </>
                          ) : item.year === "2025" ||
                            (!item.progress.hasEsg &&
                              item.progress.hasPersonaHtml) ? (
                            <>
                              {item.progress.hasPersonaHtml ? (
                                <Sparkles className="h-4 w-4 text-purple-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              )}
                              <span
                                className={
                                  item.progress.hasPersonaHtml
                                    ? "text-purple-600"
                                    : ""
                                }
                              >
                                ESG 推估
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                              ESG 下載
                            </>
                          )}
                        </div>
                        <div className="h-px w-2 bg-gray-300 sm:w-4" />
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

                    <div className="flex-1">
                      <p className="mb-2 text-xs font-semibold text-gray-500">
                        Phase 2: DPP 核心資料
                      </p>
                      <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-2 text-xs font-medium text-gray-600 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          {item.progress.hasBom ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          BOM 生成
                        </div>
                        <div className="h-px w-2 bg-gray-300 sm:w-4" />
                        <div className="flex items-center gap-1.5">
                          {item.progress.hasSpecs ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          規格展開
                        </div>
                        <div className="h-px w-2 bg-gray-300 sm:w-4" />
                        <div className="flex items-center gap-1.5">
                          {item.progress.dppGroundTruthFile ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          DPP 原型
                        </div>
                        <div className="h-px w-2 bg-gray-300 sm:w-4" />
                        <div className="flex items-center gap-1.5">
                          {item.progress.dppComplianceFile ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          合規宣告
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info: (20260609 - Tzuhan) 操作按鈕 */}
                  <div className="mt-4 flex w-full items-center gap-2 sm:mt-0 sm:w-auto">
                    <div className="group relative">
                      <button
                        disabled={
                          !item.progress.hasFin &&
                          !item.progress.hasEsg &&
                          !item.progress.hasPersonaHtml
                        }
                        onClick={() =>
                          router.push(
                            `/user/dpp-demo/start?stockId=${item.stockId}&year=${item.year}&action=view`,
                          )
                        }
                        className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded bg-gray-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        查看結果
                      </div>
                    </div>

                    <div className="group relative">
                      <button
                        onClick={() =>
                          handleDelete(item.stockId, item.year, item.name)
                        }
                        className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded bg-gray-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        刪除資料
                      </div>
                    </div>

                    <div className="group relative">
                      <button
                        onClick={() =>
                          router.push(
                            `/user/dpp-demo/start?stockId=${item.stockId}&year=${item.year}&action=extrapolate`,
                          )
                        }
                        className="flex items-center justify-center rounded-lg p-2 text-indigo-400 transition hover:bg-indigo-50 hover:text-indigo-500"
                      >
                        <Wand2 className="h-5 w-5" />
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded bg-gray-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        啟動歷史回溯推估
                      </div>
                    </div>

                    <div className="group relative">
                      <button
                        onClick={() =>
                          router.push(
                            `/user/dpp-demo/start?stockId=${item.stockId}&year=${item.year}&action=redownload`,
                          )
                        }
                        className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-500"
                      >
                        <DownloadCloud className="h-5 w-5" />
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded bg-gray-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        重新下載
                      </div>
                    </div>

                    <div className="group relative">
                      <button
                        onClick={() =>
                          router.push(
                            `/user/dpp-demo/start?stockId=${item.stockId}&year=${item.year}&action=regenerate`,
                          )
                        }
                        className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-purple-50 hover:text-purple-500"
                      >
                        <Sparkles className="h-5 w-5" />
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded bg-gray-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        重新生成畫像
                      </div>
                    </div>

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

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        onConfirm={modalConfig.onConfirm}
      />
    </div>
  );
}
