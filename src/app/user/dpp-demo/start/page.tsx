"use client"

import { useState, useEffect } from "react";
import { request } from "@/lib/utils/request";
import { DppDemoHeader } from "@/components/user/dpp_demo_start/dpp_demo_header";
import { DppDemoSidebar } from "@/components/user/dpp_demo_start/dpp_demo_sidebar";
import { DppDemoPreviewPane } from "@/components/user/dpp_demo_start/dpp_demo_preview_pane";

// Info: (20260609 - Tzuhan) 定義流程狀態
type StepStatus = "pending" | "running" | "completed" | "error";

interface IGenerationStep {
  id: string;
  label: string;
  status: StepStatus;
  log?: string;
  mockFile?: string;
}

// Info: (20260609 - Tzuhan) 擷取 API 回傳的 SSE 事件結構
interface ISseEvent {
  type: "step_start" | "log" | "preview" | "extrapolation_alert" | "complete" | "error";
  stepIndex?: number;
  message?: string;
  file?: string;
}

// Info: (20260609 - Tzuhan) 搜尋結果企業資料結構
export interface ICompanySearchResult {
  taxId: string;
  name: string;
}

export default function DppDemoStartPage() {
  // Info: (20260609 - Tzuhan) 輸入區塊狀態管理
  const [keyword, setKeyword] = useState<string>("");
  const [suggestions, setSuggestions] = useState<ICompanySearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<ICompanySearchResult | null>(null);
  const [year, setYear] = useState<string>("2025");
  const [productCount, setProductCount] = useState<number>(1);

  // Info: (20260609 - Tzuhan) 工作流狀態管理
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [showExtrapolationAlert, setShowExtrapolationAlert] = useState<boolean>(false);
  const [steps, setSteps] = useState<IGenerationStep[]>([
    { id: "download", label: "1. 企業報告下載 (auto_download.ts)", status: "pending" },
    { id: "vision", label: "2. AI 視覺圖表萃取 (ai_vision_extractor.ts)", status: "pending" },
    { id: "persona", label: "3. 企業畫像建構 (persona_generator.ts)", status: "pending" },
  ]);

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
          `/api/v1/company/lookup?query=${encodeURIComponent(keyword)}`
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
  }, [keyword]);

  // Info: (20260609 - Tzuhan) 處理選擇公司
  const handleSelectCompany = (company: ICompanySearchResult) => {
    setSelectedCompany(company);
    setKeyword(company.name);
    setShowDropdown(false);
  };

  // Info: (20260609 - Tzuhan) 啟動資料生成流程
  const startGeneration = async () => {
    if (!selectedCompany) return;
    setIsGenerating(true);
    setSteps(steps.map(s => ({ ...s, status: "pending", log: "" })));
    setSelectedFilePath(null);
    setShowExtrapolationAlert(false);

    try {
      const response = await fetch("/api/v1/dpp-demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockId: selectedCompany.taxId,
          year,
          productCount
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
        const lines = chunk.split("\n").filter(line => line.trim() !== "");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.replace("data: ", "")) as ISseEvent;
            
            if (data.type === "step_start" && data.stepIndex !== undefined) {
              setSteps(prev => {
                const newSteps = [...prev];
                newSteps[data.stepIndex as number].status = "running";
                if ((data.stepIndex as number) > 0) {
                   newSteps[(data.stepIndex as number) - 1].status = "completed";
                }
                return newSteps;
              });
              currentStepIndex = data.stepIndex;
            } else if (data.type === "log" && data.message) {
              setSteps(prev => {
                const newSteps = [...prev];
                newSteps[currentStepIndex].log = data.message;
                return newSteps;
              });
            } else if (data.type === "preview" && data.file) {
              setSelectedFilePath(data.file); // Info: (20260609 - Tzuhan) 下載完成後優先預覽 PDF
            } else if (data.type === "extrapolation_alert") {
              setShowExtrapolationAlert(true); // Info: (20260609 - Tzuhan) 底層觸發推估，顯示提醒
            } else if (data.type === "complete" && data.file) {
              setSteps(prev => {
                const newSteps = [...prev];
                newSteps[4].status = "completed";
                return newSteps;
              });
              setSelectedFilePath(data.file); // Info: (20260609 - Tzuhan) 生成完畢後自動於右側預覽
              setIsGenerating(false);
            } else if (data.type === "error") {
              setSteps(prev => {
                const newSteps = [...prev];
                newSteps[currentStepIndex].status = "error";
                newSteps[currentStepIndex].log = data.message || "發生未知錯誤";
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
  };


  return (
    <div className="flex flex-col h-[calc(100vh-100px)] w-full gap-5 pb-4 font-sans relative overflow-hidden bg-slate-50">
      <DppDemoHeader />

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
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
        />

        <DppDemoPreviewPane selectedFilePath={selectedFilePath} />
      </div>
    </div>
  );
}
