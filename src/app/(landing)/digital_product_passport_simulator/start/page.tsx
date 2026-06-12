"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { request } from "@/lib/utils/request";
import { DppHeader } from "@/components/user/dpp_start/dpp_header";
import { DppLogsNavigator } from "@/components/user/dpp_start/dpp_logs_navigator";
import { DppPreviewPane } from "@/components/user/dpp_start/dpp_preview_pane";
import { DppCompanyBaselinePane } from "@/components/user/dpp_start/dpp_company_baseline_pane";
import { DppProductMatrixPane } from "@/components/user/dpp_start/dpp_product_matrix_pane";
import SimulatorCompanySelector from "@/components/user/dpp_start/simulator_company_selector";
import ConfirmModal from "@/components/common/confirm_modal";
import { IApiResponse } from "@/lib/utils/response";
import { useTranslation } from "@/i18n/i18n_context";
import { useRouter } from "next/navigation";
import { Sparkles, Rocket, ArrowRight } from "lucide-react";

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
    hasVisionCache?: boolean;
    hasEsgExtrapolation?: boolean;
    hasBom: boolean;
    products?: {
      productId: string;
      productName: string;
      progress: {
        hasSpecs: boolean;
        hasImage: boolean;
        dppGroundTruthFile?: string;
        dppComplianceFile?: string;
      };
    }[];
  };
  isComplete: boolean;
}

export default function DppStartPage() {
  const { t } = useTranslation();
  const router = useRouter();
  // Info: (20260609 - Tzuhan) 輸入區塊狀態管理
  const [keyword, setKeyword] = useState<string>("");
  const [selectedCompany, setSelectedCompany] =
    useState<ICompanySearchResult | null>(null);
  const [year, setYear] = useState<string>("2025");
  const productCount = 3; // Info: 預設為 3 個產品，不再透過 UI 選擇

  // Info: (20260609 - Tzuhan) 工作流狀態管理
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [modalContext, setModalContext] = useState<string | null>(null);
  const [products, setProducts] = useState<
    NonNullable<IDemoItem["progress"]["products"]>
  >([]);
  const [currentProgress, setCurrentProgress] =
    useState<Omit<IDemoItem["progress"], "products">>();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [steps, setSteps] = useState<IGenerationStep[]>([
    {
      id: "fin_download",
      label: t("digital_product_passport.start.step1"),
      status: "pending",
    },
    {
      id: "esg_download",
      label: t("digital_product_passport.start.step2"),
      status: "pending",
    },
    {
      id: "vision",
      label: t("digital_product_passport.start.step3"),
      status: "pending",
    },
    {
      id: "persona",
      label: t("digital_product_passport.start.step4"),
      status: "pending",
    },
    {
      id: "bom_generation",
      label: t("digital_product_passport.start.step5"),
      status: "pending",
    },
    {
      id: "product_specs",
      label: t("digital_product_passport.start.step6"),
      status: "pending",
    },
    {
      id: "product_image",
      label: t("digital_product_passport.start.step7"),
      status: "pending",
    },
    {
      id: "dpp_ground_truth",
      label: t("digital_product_passport.start.step8"),
      status: "pending",
    },
    {
      id: "dpp_compliance",
      label: t("digital_product_passport.start.step9"),
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
      productId?: string,
    ) => {
      const targetComp = company || selectedCompany;
      const targetYear = overrideYear || year;
      if (!targetComp) {
        setModalConfig({
          isOpen: true,
          title: t("common.error"),
          message: t("digital_product_passport.sidebar.select_company_first"),
        });
        return;
      }

      setIsGenerating(true);
      setSteps((prev) =>
        prev.map((s, index) => {
          let shouldReset = true;
          if (mode === "baseline_only" && index >= 5) shouldReset = false;
          if (mode === "generate_only" && (index < 2 || index >= 5))
            shouldReset = false;
          if (mode === "download_only" && index >= 2) shouldReset = false;
          if (mode === "product_dpp_only" && index < 5) shouldReset = false;
          if (mode === "extrapolate_only" && index !== 2) shouldReset = false;
          if (mode === "persona_only" && index !== 3) shouldReset = false;
          if (mode === "bom_only" && index !== 4) shouldReset = false;
          if (mode === "product_specs_only" && index !== 5) shouldReset = false;
          if (mode === "product_image_only" && index !== 6) shouldReset = false;
          if (mode === "dpp_ground_truth_only" && index !== 7)
            shouldReset = false;
          if (mode === "dpp_compliance_only" && index !== 8)
            shouldReset = false;
          if (mode === "add_sku" && index < 4) shouldReset = false;
          return shouldReset ? { ...s, status: "pending", log: "" } : s;
        }),
      );

      try {
        const response = await fetch(
          "/api/v1/digital_product_passport_simulator/generate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stockId: targetComp.taxId,
              year: targetYear,
              productCount,
              productId,
              mode,
            }),
          },
        );

        if (!response.body)
          throw new Error(t("digital_product_passport.start.unknown_error"));
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
                    newSteps[1].label = t(
                      "digital_product_passport.start.step2_extrapolate",
                    );
                    newSteps[1].file = data.file;
                  } else {
                    newSteps[1].status = "completed";
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
              } else if (data.type === "complete") {
                if (data.file) {
                  setSteps((prev) => {
                    const newSteps = [...prev];
                    newSteps[3].status = "completed";
                    newSteps[3].file = data.file;
                    return newSteps;
                  });
                  setSelectedFilePath(data.file); // Info: (20260609 - Tzuhan) 生成完畢後自動於右側預覽
                } else {
                  setSteps((prev) => {
                    const newSteps = [...prev];
                    newSteps[currentStepIndex].status = "completed";
                    return newSteps;
                  });
                }
                setIsGenerating(false);
              } else if (data.type === "error") {
                setSteps((prev) => {
                  const newSteps = [...prev];
                  newSteps[currentStepIndex].status = "error";
                  newSteps[currentStepIndex].log =
                    data.message ||
                    t("digital_product_passport.start.unknown_error");
                  return newSteps;
                });
                setIsGenerating(false);
              }
            }
          }
        }
        setIsGenerating(false);
      } catch (error: unknown) {
        console.error(error);
        setIsGenerating(false);
      }
    },
    [selectedCompany, year, productCount, t],
  );

  const isInitialLoad = useRef(true);

  // Info: (20260609 - Tzuhan) 處理從列表頁帶過來的參數 (預覽或重新生成)
  useEffect(() => {
    if (!isInitialLoad.current) return;
    isInitialLoad.current = false;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const paramStockId = params.get("stockId");
      const paramYear = params.get("year");
      const paramAction = params.get("action");

      if (paramStockId && paramYear) {
        setYear(paramYear);

        // Info: (20260610 - Tzuhan) Remove action from URL to prevent infinite regenerate loop on HMR or reload
        if (paramAction) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("action");
          window.history.replaceState({}, "", newUrl.toString());
        }

        // Info: (20260612 - Tzuhan) Fetch from public list API instead of protected company lookup API
        request<IApiResponse<IDemoItem[]>>(
          `/api/v1/digital_product_passport_simulator/list?t=${Date.now()}`,
        )
          .then((res) => {
            const items = res.payload || [];
            const match = items.find((i) => i.stockId === paramStockId);
            const comp = match
              ? ({
                  taxId: match.stockId,
                  name: match.name,
                } as ICompanySearchResult)
              : ({
                  taxId: paramStockId,
                  name: paramStockId,
                } as ICompanySearchResult);

            setSelectedCompany(comp);
            setKeyword(`${comp.name} (${comp.taxId})`);

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
            } else if (paramAction === "generate") {
              setTimeout(() => startGeneration(comp, "all", paramYear), 100);
            }
          })
          .catch((err) => {
            console.error("Failed to fetch list for lookup:", err);
            const comp = {
              taxId: paramStockId,
              name: paramStockId,
            } as ICompanySearchResult;
            setSelectedCompany(comp);
            setKeyword(`${comp.name} (${comp.taxId})`);

            if (paramAction === "generate") {
              setTimeout(() => startGeneration(comp, "all", paramYear), 100);
            }
          });
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

    request<IApiResponse<IDemoItem[]>>(
      `/api/v1/digital_product_passport_simulator/list?t=${Date.now()}`,
    )
      .then((listRes) => {
        const items = listRes.payload || [];
        const currentItem = items.find(
          (i) => i.stockId === selectedCompany.taxId && i.year === year,
        );

        if (currentItem) {
          const finFile = `data/${selectedCompany.taxId}/${year}/inputs/raw_reports/${year}_FIN_REPORT.pdf`;
          const esgFile = `data/${selectedCompany.taxId}/${year}/inputs/raw_reports/${year}_ESG_REPORT.pdf`;
          const personaFile = `data/${selectedCompany.taxId}/${year}/outputs/${selectedCompany.taxId}_company_persona.html`;

          const esgExtrapolationFile = `data/${selectedCompany.taxId}/${year}/outputs/esg_extrapolation.json`;

          const isEsgExtrapolated =
            currentItem.year === "2025" ||
            currentItem.progress.hasEsgExtrapolation;

          setProducts(currentItem.progress.products || []);
          setCurrentProgress({
            hasFin: currentItem.progress.hasFin,
            hasEsg: currentItem.progress.hasEsg,
            hasEsgExtrapolation: currentItem.progress.hasEsgExtrapolation,
            hasPersonaHtml: currentItem.progress.hasPersonaHtml,
            hasBom: currentItem.progress.hasBom,
          });
          const activeProductId =
            (modalContext !== "baseline" && modalContext !== null
              ? modalContext
              : selectedProductId) ||
            (currentItem.progress.products &&
            currentItem.progress.products.length > 0
              ? currentItem.progress.products[0].productId
              : "");
          if (activeProductId && selectedProductId !== activeProductId) {
            setSelectedProductId(activeProductId);
          }
          const activeProduct = currentItem.progress.products?.find(
            (p) => p.productId === activeProductId,
          );

          setSteps([
            {
              id: "fin_download",
              label: t("digital_product_passport.start.step1"),
              status: currentItem.progress.hasFin ? "completed" : "pending",
              file: finFile,
            },
            {
              id: "esg_download",
              label: isEsgExtrapolated
                ? t("digital_product_passport.start.step2_extrapolate")
                : t("digital_product_passport.start.step2"),
              status: currentItem.progress.hasEsg
                ? "completed"
                : isEsgExtrapolated && currentItem.progress.hasEsgExtrapolation
                  ? "extrapolated"
                  : "pending",
              file: isEsgExtrapolated ? esgExtrapolationFile : esgFile,
            },
            {
              id: "vision",
              label: t("digital_product_passport.start.step3"),
              status: currentItem.progress.hasVisionCache
                ? "completed"
                : "pending",
              file: `data/${selectedCompany.taxId}/${year}/outputs/ai_extracted_context_cache.json`,
            },
            {
              id: "persona",
              label: t("digital_product_passport.start.step4"),
              status: currentItem.progress.hasPersonaHtml
                ? "completed"
                : "pending",
              file: personaFile,
            },
            {
              id: "bom_generation",
              label: t("digital_product_passport.start.step5"),
              status: currentItem.progress.hasBom ? "completed" : "pending",
              file: `data/${selectedCompany.taxId}/${year}/outputs/mock_sources/boms_and_precursors.json`,
            },
            {
              id: "product_specs",
              label: t("digital_product_passport.start.step6"),
              status: activeProduct?.progress.hasSpecs
                ? "completed"
                : "pending",
              file: activeProduct?.progress.hasSpecs
                ? `data/${selectedCompany.taxId}/${year}/outputs/${activeProduct.productId}/mock_sources/${activeProduct.productId}_product_specs.json`
                : undefined,
            },
            {
              id: "product_image",
              label: t("digital_product_passport.start.step7"),
              status: activeProduct?.progress.hasImage
                ? "completed"
                : "pending",
              file: activeProduct?.progress.hasImage
                ? `data/${selectedCompany.taxId}/${year}/outputs/${activeProduct.productId}/mock_sources/fastener_blueprint.png`
                : undefined,
            },
            {
              id: "dpp_ground_truth",
              label: t("digital_product_passport.start.step8"),
              status: activeProduct?.progress.dppGroundTruthFile
                ? "completed"
                : "pending",
              file: activeProduct?.progress.dppGroundTruthFile,
            },
            {
              id: "dpp_compliance",
              label: t("digital_product_passport.start.step9"),
              status: activeProduct?.progress.dppComplianceFile
                ? "completed"
                : "pending",
              file: activeProduct?.progress.dppComplianceFile,
            },
          ]);

          if (!isGenerating) {
            if (activeProduct?.progress.dppComplianceFile) {
              setSelectedFilePath(activeProduct.progress.dppComplianceFile);
            } else if (activeProduct?.progress.dppGroundTruthFile) {
              setSelectedFilePath(activeProduct.progress.dppGroundTruthFile);
            } else if (activeProduct?.progress.hasSpecs) {
              setSelectedFilePath(
                `data/${selectedCompany.taxId}/${year}/outputs/${activeProduct.productId}/mock_sources/${activeProduct.productId}_product_specs.json`,
              );
            } else if (currentItem.progress.hasBom) {
              setSelectedFilePath(
                `data/${selectedCompany.taxId}/${year}/outputs/mock_sources/boms_and_precursors.json`,
              );
            } else if (currentItem.progress.hasPersonaHtml) {
              setSelectedFilePath(personaFile);
            } else if (currentItem.progress.hasEsg) {
              setSelectedFilePath(esgFile);
            } else if (isEsgExtrapolated && currentItem.progress.hasFin) {
              setSelectedFilePath(esgExtrapolationFile);
            } else if (currentItem.progress.hasFin) {
              setSelectedFilePath(finFile);
            } else {
              setSelectedFilePath(null);
            }
          }
        } else {
          setCurrentProgress({
            hasFin: false,
            hasEsg: false,
            hasEsgExtrapolation: false,
            hasPersonaHtml: false,
            hasBom: false,
          });
          setProducts([]);
          if (!isGenerating) setSelectedFilePath(null);
          setSteps([
            {
              id: "fin_download",
              label: t("digital_product_passport.start.step1"),
              status: "pending",
            },
            {
              id: "esg_download",
              label: t("digital_product_passport.start.step2"),
              status: "pending",
            },
            {
              id: "vision",
              label: t("digital_product_passport.start.step3"),
              status: "pending",
            },
            {
              id: "persona",
              label: t("digital_product_passport.start.step4"),
              status: "pending",
            },
            {
              id: "bom_generation",
              label: t("digital_product_passport.start.step5"),
              status: "pending",
            },
            {
              id: "product_specs",
              label: t("digital_product_passport.start.step6"),
              status: "pending",
            },
            {
              id: "product_image",
              label: t("digital_product_passport.start.step7"),
              status: "pending",
            },
            {
              id: "dpp_ground_truth",
              label: t("digital_product_passport.start.step8"),
              status: "pending",
            },
            {
              id: "dpp_compliance",
              label: t("digital_product_passport.start.step9"),
              status: "pending",
            },
          ]);
        }
      })
      .catch(console.error);
  }, [selectedCompany, year, isGenerating, selectedProductId, modalContext, t]);

  // Info: (20260609 - Tzuhan) 處理選擇公司
  const handleSelectCompany = (company: ICompanySearchResult) => {
    setSelectedCompany(company);
    setKeyword(`${company.name} (${company.taxId})`);
    router.replace(`?stockId=${company.taxId}&year=${year}`, { scroll: false });
  };

  const handleDownloadSku = async (productId: string) => {
    if (!selectedCompany) return;

    try {
      const response = await fetch(
        "/api/v1/digital_product_passport_simulator/download",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stockId: selectedCompany.taxId,
            year,
            skuId: productId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedCompany.taxId}_${productId}_dpp_mock.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert(t("digital_product_passport.start.download_failed"));
    }
  };

  const handleAddSku = () => {
    // Info: (20260611 - Tzuhan) 模擬新增一個產品，呼叫產生
    startGeneration(undefined, "add_sku");
  };

  const handleRegenerateFile = (filePath: string) => {
    if (filePath.includes("ai_extracted_context_cache.json")) {
      startGeneration(undefined, "extrapolate_only");
      return;
    }
    if (filePath.includes("esg_extrapolation.json")) {
      startGeneration(undefined, "extrapolate_only");
      return;
    }
    if (filePath.includes("company_persona.html")) {
      startGeneration(undefined, "persona_only");
      return;
    }
    if (filePath.includes("boms_and_precursors.json")) {
      startGeneration(undefined, "bom_only");
      return;
    }

    const match = filePath.match(/outputs\/([^/]+)\/mock_sources\/(.+)$/);
    if (match) {
      const pId = match[1];
      const fileName = match[2];
      let mode: string | undefined;

      if (fileName.includes("product_specs")) mode = "product_specs_only";
      else if (fileName.includes("fastener_blueprint"))
        mode = "product_image_only";
      else if (fileName.includes("dpp_ground_truth"))
        mode = "dpp_ground_truth_only";
      else if (fileName.includes("dpp_compliance_declaration"))
        mode = "dpp_compliance_only";

      if (mode) {
        startGeneration(undefined, mode, undefined, pId);
      }
    }
  };

  return (
    <div className="relative flex h-[calc(100vh-100px)] w-full flex-col gap-4 overflow-hidden bg-slate-50 px-4 pt-4 pb-4 font-sans lg:px-8">
      <DppHeader
        showBack={true}
        onBack={() => router.back()}
        title={t("digital_product_passport.start.simulator_title_phase1")}
        subtitle={t(
          "digital_product_passport.start.simulator_title_phase1_desc",
        )}
      />

      <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
            1
          </div>
          <span className="text-sm font-bold text-slate-700">
            {t("digital_product_passport.start.target_enterprise_label")}
          </span>
        </div>
        <div className="w-64">
          <SimulatorCompanySelector
            value={keyword}
            onChange={setKeyword}
            onSelect={handleSelectCompany}
            disabled={isGenerating}
          />
        </div>
        <div className="ml-4 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">
            {t("digital_product_passport.start.year_label")}
          </span>
        </div>
        <select
          value={year}
          onChange={(e) => {
            const newYear = e.target.value;
            setYear(newYear);
            if (selectedCompany) {
              router.replace(
                `?stockId=${selectedCompany.taxId}&year=${newYear}`,
                { scroll: false },
              );
            }
          }}
          disabled={isGenerating}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
        >
          <option value="2025">
            {t("digital_product_passport.sidebar_extra.year_prediction") ||
              "2025 (預測)"}
          </option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
        </select>
      </div>

      <div className="mb-1 flex shrink-0 items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
          2
        </div>
        <h2 className="text-sm font-bold text-slate-700">
          {t("digital_product_passport.start.simulation_matrix")}
        </h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
        <DppCompanyBaselinePane
          isGenerating={isGenerating}
          onViewDetails={() => setModalContext("baseline")}
          onRegenerate={() =>
            startGeneration(
              undefined,
              currentProgress &&
                (currentProgress.hasFin || currentProgress.hasEsg)
                ? "generate_only"
                : "baseline_only",
            )
          }
          progress={currentProgress}
        />

        <DppProductMatrixPane
          products={products}
          isGenerating={isGenerating}
          onDownloadSku={handleDownloadSku}
          onAddSku={handleAddSku}
          onViewProductDetails={(productId) => setModalContext(productId)}
          onGenerateSku={(productId) => {
            setModalContext(productId);
            startGeneration(
              undefined,
              "product_dpp_only",
              undefined,
              productId,
            );
          }}
        />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              3
            </div>
            <h3 className="text-sm font-bold text-blue-900">
              {t("digital_product_passport.start.next_step_verify")}
            </h3>
          </div>
          <p className="mt-1 flex items-center text-xs text-blue-800">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            {t("digital_product_passport.start.next_step_verify_desc")}
          </p>
        </div>
        <button
          onClick={() => router.push("/digital_product_passport")}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow transition-colors hover:bg-blue-700"
        >
          <Rocket className="h-4 w-4" />
          {t("digital_product_passport.start.go_to_create")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {modalContext !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative flex h-[85vh] w-[90vw] max-w-6xl flex-col gap-4 overflow-hidden rounded-2xl bg-slate-50 p-6 shadow-2xl">
            <button
              onClick={() => setModalContext(null)}
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
            >
              ✕
            </button>
            <h2 className="mb-2 text-xl font-bold text-slate-800">
              {t("digital_product_passport.start.baseline_details")}
            </h2>
            <div className="flex min-h-0 flex-1 gap-6">
              <DppLogsNavigator
                selectedCompany={selectedCompany}
                year={year}
                steps={steps}
                products={products}
                activeTabContext={modalContext}
                onTabChange={(tab) => {
                  setModalContext(tab);
                  if (tab !== "baseline") {
                    setSelectedProductId(tab);
                  }
                }}
                onStepClick={(step) => {
                  if (step.file) {
                    setSelectedFilePath(step.file);
                  }
                }}
              />
              <DppPreviewPane
                selectedFilePath={selectedFilePath}
                isGenerating={isGenerating}
                onRegenerateFile={handleRegenerateFile}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={t("common.confirm")}
      />
    </div>
  );
}
