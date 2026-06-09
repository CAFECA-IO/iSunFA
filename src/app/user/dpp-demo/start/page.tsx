"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { request } from "@/lib/utils/request";
import { DppDemoHeader } from "@/components/user/dpp_demo_start/dpp_demo_header";
import { DppDemoSidebar } from "@/components/user/dpp_demo_start/dpp_demo_sidebar";
import { DppDemoPreviewPane } from "@/components/user/dpp_demo_start/dpp_demo_preview_pane";
import ConfirmModal from "@/components/common/confirm_modal";
import { IApiResponse } from "@/lib/utils/response";

// Info: (20260609 - Tzuhan) 定義流程狀態
type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "error"
  | "extrapolated";

interface IGenerationStep {
  id: string;
  label: string;
  status: StepStatus;
  log?: string;
  mockFile?: string;
  file?: string;
}

// Info: (20260609 - Tzuhan) 擷取 API 回傳的 SSE 事件結構
interface ISseEvent {
  type:
    | "step_start"
    | "log"
    | "preview"
    | "extrapolation_alert"
    | "complete"
    | "error"
    | "fin_complete"
    | "esg_complete";
  stepIndex?: number;
  message?: string;
  file?: string;
}

// Info: (20260609 - Tzuhan) 搜尋結果企業資料結構
export interface ICompanySearchResult {
  taxId: string;
  name: string;
}

export interface IDemoItem {
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

export default function DppDemoStartPage() {
  // Info: (20260609 - Tzuhan) 輸入區塊狀態管理
  const [keyword, setKeyword] = useState<string>("");
  const [suggestions, setSuggestions] = useState<ICompanySearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] =
    useState<ICompanySearchResult | null>(null);
  const [year, setYear] = useState<string>("2025");
  const [productCount, setProductCount] = useState<number>(1);

  // Info: (20260609 - Tzuhan) 工作流狀態管理
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [showExtrapolationAlert, setShowExtrapolationAlert] =
    useState<boolean>(false);
  const [steps, setSteps] = useState<IGenerationStep[]>([
    {
      id: "fin_download",
      label: "1. 財務報告與公開數據擷取",
      status: "pending",
    },
    {
      id: "esg_download",
      label: "2. ESG 永續報告書與指標擷取",
      status: "pending",
    },
    {
      id: "vision",
      label: "3. AI 視覺圖表萃取 (ai_vision_extractor)",
      status: "pending",
    },
    {
      id: "persona",
      label: "4. 企業畫像建構 (persona_generator)",
      status: "pending",
    },
  ]);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: "", message: "" });

  // Info: (20260609 - Tzuhan) 啟動資料生成流程
  const startGeneration = useCallback(
    async (
      company?: ICompanySearchResult,
      mode: string = "all",
      overrideYear?: string,
    ) => {
      const targetComp = company || selectedCompany;
      const targetYear = overrideYear || year;
      if (!targetComp) {
        setModalConfig({
          isOpen: true,
          title: "提醒",
          message: "請先選擇一家企業",
        });
        return;
      }

      setIsGenerating(true);
      setSteps((prev) =>
        prev.map((s, index) => {
          let shouldReset = true;
          if (mode === "generate_only" && index < 2) shouldReset = false;
          if (mode === "download_only" && index >= 2) shouldReset = false;
          return shouldReset ? { ...s, status: "pending", log: "" } : s;
        }),
      );
      setSelectedFilePath(null);
      setShowExtrapolationAlert(false);

      try {
        const response = await fetch("/api/v1/dpp-demo/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stockId: targetComp.taxId,
            year: targetYear,
            productCount,
            mode,
          }),
        });

        if (!response.body) throw new Error("無回應內容");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let currentStepIndex = 0;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim() !== "");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.replace("data: ", "")) as ISseEvent;

              if (data.type === "step_start" && data.stepIndex !== undefined) {
                setSteps((prev) => {
                  const newSteps = [...prev];
                  newSteps[data.stepIndex as number].status = "running";
                  if ((data.stepIndex as number) > 0) {
                    newSteps[(data.stepIndex as number) - 1].status =
                      "completed";
                  }
                  return newSteps;
                });
                currentStepIndex = data.stepIndex;
              } else if (data.type === "fin_complete") {
                setSteps((prev) => {
                  const newSteps = [...prev];
                  newSteps[0].status = "completed";
                  newSteps[0].file = data.file;
                  return newSteps;
                });
              } else if (data.type === "esg_complete") {
                setSteps((prev) => {
                  const newSteps = [...prev];
                  if (!data.file || data.file.endsWith(".json")) {
                    newSteps[1].status = "extrapolated";
                    newSteps[1].label = "2. ESG 跨年推估 (Time-Machine)";
                    newSteps[1].file = data.file;
                  } else {
                    newSteps[1].status = "completed";
                    newSteps[1].label = "2. ESG 永續報告書與指標擷取";
                    newSteps[1].file = data.file;
                  }
                  return newSteps;
                });
              } else if (data.type === "log" && data.message) {
                setSteps((prev) => {
                  const newSteps = [...prev];
                  newSteps[currentStepIndex].log = data.message;
                  return newSteps;
                });
              } else if (data.type === "preview" && data.file) {
                setSelectedFilePath(data.file); // Info: (20260609 - Tzuhan) 下載完成後優先預覽 PDF
              } else if (data.type === "extrapolation_alert") {
                setShowExtrapolationAlert(true); // Info: (20260609 - Tzuhan) 底層觸發推估，顯示提醒
              } else if (data.type === "complete") {
                if (data.file) {
                  setSteps((prev) => {
                    const newSteps = [...prev];
                    newSteps[3].status = "completed";
                    newSteps[3].file = data.file;
                    return newSteps;
                  });
                  setSelectedFilePath(data.file); // Info: (20260609 - Tzuhan) 生成完畢後自動於右側預覽
                }
                setIsGenerating(false);
              } else if (data.type === "error") {
                setSteps((prev) => {
                  const newSteps = [...prev];
                  newSteps[currentStepIndex].status = "error";
                  newSteps[currentStepIndex].log =
                    data.message || "發生未知錯誤";
                  return newSteps;
                });
                setIsGenerating(false);
              }
            }
          }
        }
      } catch (error: unknown) {
        console.error(error);
        setIsGenerating(false);
      }
    },
    [selectedCompany, year, productCount],
  );

  const isInitialLoad = useRef(true);

  // Info: (20260609 - Tzuhan) 處理從列表頁帶過來的參數 (預覽或重新生成)
  useEffect(() => {
    if (!isInitialLoad.current) return;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const paramStockId = params.get("stockId");
      const paramYear = params.get("year");
      const paramAction = params.get("action");

      if (paramStockId && paramYear) {
        setYear(paramYear);

        // Fetch company lookup to set selectedCompany
        request<{ payload: ICompanySearchResult[] }>(
          `/api/v1/company/lookup?query=${paramStockId}`,
        )
          .then((res) => {
            if (res.payload && res.payload.length > 0) {
              const comp =
                res.payload.find((c) => c.taxId === paramStockId) ||
                res.payload[0];
              setSelectedCompany(comp);
              setKeyword(comp.name);
              if (paramAction === "redownload") {
                setTimeout(
                  () => startGeneration(comp, "download_only", paramYear),
                  100,
                );
              } else if (paramAction === "extrapolate") {
                setTimeout(
                  () => startGeneration(comp, "extrapolate_only", paramYear),
                  100,
                );
              } else if (paramAction === "regenerate") {
                setTimeout(
                  () => startGeneration(comp, "persona_only", paramYear),
                  100,
                );
              }
            }
          })
          .catch(console.error);
      }
    }
  }, [startGeneration]);

  // Info: (20260609 - Tzuhan) 監聽所選企業與年份變化，獲取當前生成進度
  useEffect(() => {
    if (!selectedCompany) {
      setSteps((prev) =>
        prev.map((s) => ({ ...s, status: "pending", file: undefined })),
      );
      if (!isGenerating) setSelectedFilePath(null);
      return;
    }

    request<IApiResponse<IDemoItem[]>>("/api/v1/dpp-demo/list")
      .then((listRes) => {
        const items = listRes.payload || [];
        const currentItem = items.find(
          (i) => i.stockId === selectedCompany.taxId && i.year === year,
        );

        if (currentItem) {
          const finFile = `data/${selectedCompany.taxId}/${year}/inputs/raw_reports/${year}_FIN_REPORT.pdf`;
          const esgFile = `data/${selectedCompany.taxId}/${year}/inputs/raw_reports/${year}_ESG_REPORT.pdf`;
          const personaFile = `data/${selectedCompany.taxId}/${year}/outputs/${selectedCompany.taxId}_company_persona.html`;
          const cacheFile = `data/${selectedCompany.taxId}/${year}/outputs/ai_extracted_context_cache.json`;

          const isEsgExtrapolated =
            currentItem.year === "2025" ||
            (!currentItem.progress.hasEsg &&
              currentItem.progress.hasPersonaHtml);

          setSteps([
            {
              id: "fin_download",
              label: "1. 財務報告與公開數據擷取",
              status: currentItem.progress.hasFin ? "completed" : "pending",
              file: currentItem.progress.hasFin ? finFile : undefined,
            },
            {
              id: "esg_download",
              label: isEsgExtrapolated
                ? "2. ESG 跨年推估 (Time-Machine)"
                : "2. ESG 永續報告書與指標擷取",
              status: currentItem.progress.hasEsg
                ? "completed"
                : isEsgExtrapolated && currentItem.progress.hasPersonaHtml
                  ? "extrapolated"
                  : "pending",
              file: currentItem.progress.hasEsg
                ? esgFile
                : isEsgExtrapolated
                  ? cacheFile
                  : undefined,
            },
            {
              id: "vision",
              label: "3. AI 視覺圖表萃取 (ai_vision_extractor)",
              status: currentItem.progress.hasPersonaHtml
                ? "completed"
                : "pending",
            },
            {
              id: "persona",
              label: "4. 企業畫像建構 (persona_generator)",
              status: currentItem.progress.hasPersonaHtml
                ? "completed"
                : "pending",
              file: currentItem.progress.hasPersonaHtml
                ? personaFile
                : undefined,
            },
          ]);

          if (!isGenerating) {
            if (currentItem.progress.hasPersonaHtml) {
              setSelectedFilePath(personaFile);
            } else if (currentItem.progress.hasEsg) {
              setSelectedFilePath(esgFile);
            } else if (isEsgExtrapolated && currentItem.progress.hasFin) {
              // Info: (20260609 - Tzuhan) 如果是 2025 年且已經有了 Fin，可能也有 Cache，我們先優先顯示 Cache (會在 preview pane 中做容錯處理)
              setSelectedFilePath(cacheFile);
            } else if (currentItem.progress.hasFin) {
              setSelectedFilePath(finFile);
            } else {
              setSelectedFilePath(null);
            }
          }
        } else {
          setSteps((prev) =>
            prev.map((s) => ({
              ...s,
              status: "pending",
              file: undefined,
              log: "",
            })),
          );
          if (!isGenerating) setSelectedFilePath(null);
        }
      })
      .catch(console.error);
  }, [selectedCompany, year, isGenerating]);

  // Info: (20260609 - Tzuhan) 模糊搜尋防抖處理 (Debounce)
  useEffect(() => {
    if (keyword.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Info: (20260609 - Tzuhan) 避免選取後觸發重新搜尋，導致查無結果又彈出「尚未支援此企業」的錯誤框
    if (selectedCompany && keyword === selectedCompany.name) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await request<{ payload: ICompanySearchResult[] }>(
          `/api/v1/company/lookup?query=${encodeURIComponent(keyword)}`,
        );
        if (res?.payload) {
          setSuggestions(res.payload);
          setShowDropdown(true);
        }
      } catch (e: unknown) {
        console.error("Lookup failed", e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword, selectedCompany]);

  // Info: (20260609 - Tzuhan) 處理選擇公司
  const handleSelectCompany = (company: ICompanySearchResult) => {
    setSelectedCompany(company);
    setKeyword(company.name);
    setShowDropdown(false);
  };

  return (
    <div className="relative flex h-[calc(100vh-100px)] w-full flex-col gap-5 overflow-hidden bg-slate-50 pb-4 font-sans">
      <DppDemoHeader />

      <div className="flex min-h-0 flex-1 flex-col gap-5 lg:flex-row">
        <DppDemoSidebar
          keyword={keyword}
          setKeyword={setKeyword}
          suggestions={suggestions}
          showDropdown={showDropdown}
          selectedCompany={selectedCompany}
          handleSelectCompany={handleSelectCompany}
          year={year}
          setYear={setYear}
          productCount={productCount}
          setProductCount={setProductCount}
          isGenerating={isGenerating}
          startGeneration={startGeneration}
          showExtrapolationAlert={showExtrapolationAlert}
          steps={steps}
          onStepClick={(step) => {
            if (step.file) {
              setSelectedFilePath(step.file);
            }
          }}
        />

        <DppDemoPreviewPane selectedFilePath={selectedFilePath} />
      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText="確定"
      />
    </div>
  );
}
