"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building, Plus, PlayCircle, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
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
      const res = await request<IApiResponse<IDemoItem[]>>("/api/v1/dpp-demo/list");
      if (res.payload) {
        setItems(res.payload);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="flex flex-col h-full w-full gap-5 pb-4 font-sans max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center">
            <Building className="w-6 h-6 mr-3 text-blue-600" />
            企業模擬資料庫
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            管理與預覽已生成的企業數位產品護照模擬資料。
          </p>
        </div>
        <button
          onClick={() => router.push("/user/dpp-demo/start")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          生成新的企業模擬資料
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Building className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-900">尚無企業模擬資料</p>
            <p className="text-sm mt-1">點擊上方按鈕立即建立</p>
          </div>
        ) : (
          <div className="overflow-y-auto p-4 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors bg-slate-50/30">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  
                  {/* Info: (20260609 - Tzuhan) 企業資訊 */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {item.name} <span className="text-sm font-medium text-gray-500 ml-1">({item.stockId})</span>
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      目標年度: {item.year}
                    </p>
                  </div>

                  {/* Info: (20260609 - Tzuhan) Day 1 進度顯示 */}
                  <div className="flex-1 max-w-md w-full">
                    <p className="text-xs font-semibold text-gray-500 mb-2">生成進度 (Phase 1)</p>
                    <div className="flex items-center justify-between text-xs font-medium text-gray-600 bg-white border border-gray-100 rounded-lg p-2 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        {item.progress.hasFin ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                        財報下載
                      </div>
                      <div className="w-4 h-px bg-gray-300" />
                      <div className="flex items-center gap-1.5">
                        {item.progress.hasEsg ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                        ESG 下載
                      </div>
                      <div className="w-4 h-px bg-gray-300" />
                      <div className="flex items-center gap-1.5">
                        {item.progress.hasPersonaHtml ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                        企業畫像
                      </div>
                    </div>
                  </div>

                  {/* Info: (20260609 - Tzuhan) 操作按鈕 */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => router.push("/user/dpp-demo/start")}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      生成模擬資料
                    </button>
                    
                    <button
                      disabled={!item.isComplete}
                      onClick={() => router.push("/user/dpp-demo/workspace")}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg px-5 py-2 text-sm font-bold shadow-sm transition
                        ${item.isComplete 
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:scale-105 hover:shadow-md" 
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"}
                      `}
                    >
                      <PlayCircle className="w-4 h-4" />
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
