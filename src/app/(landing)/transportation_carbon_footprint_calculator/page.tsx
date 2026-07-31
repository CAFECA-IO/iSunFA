"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import Head from "next/head";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Truck,
  Ship,
  Plane,
  Leaf,
  Loader2,
  Weight,
  ChevronDown,
  ChevronUp,
  Download,
  MapPin,
  ArrowRight,
  Layers,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ILogisticsPlan } from "@/interfaces/logistics";
import { getRouteApplicability } from "@/lib/utils/route_applicability";
import { request } from "@/lib/utils/request";
import {
  PlanSection,
  RouteType,
} from "@/components/transportation_carbon_footprint_calculator/plan_section";
import { MileageCalculator } from "@/components/transportation_carbon_footprint_calculator/mileage_calculator";
import {
  MileageBatchResults,
  type IMileageBatchResult,
} from "@/components/transportation_carbon_footprint_calculator/mileage_batch_results";
import type { IMapViewerRef } from "@/components/transportation_carbon_footprint_calculator/map_viewer";
import { ReportLayout } from "@/components/common/report_layout";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import { useAuth } from "@/contexts/auth_context";
import AuthPlaceholder from "@/components/common/auth_placeholder";
import PaymentConfirmModal from "@/components/common/payment_confirm_modal";
import { BatchExportRenderer } from "@/components/transportation_carbon_footprint_calculator/batch_export_renderer";
import { ExportOptionsModal } from "@/components/transportation_carbon_footprint_calculator/export_options_modal";
import {
  buildExportFileName,
  buildExportId,
  captureElementToPdf,
  pdfToBlob,
} from "@/lib/utils/pdf_export";
import {
  buildMapImageKey,
  buildReportPdfItem,
  buildReportPdfItems,
} from "@/lib/utils/logistics_report_request";
import { requestReportPdfs } from "@/lib/utils/logistics_report_client";
import {
  TRANSPORT_PDF_EXPORT_MODE,
  TransportPdfExportModeEnum,
} from "@/constants/logistics_pdf";
import { PDF_EXPORT_SIZE_BUDGET_BYTES } from "@/constants/logistics";
import type { ILogisticsReportPdfItem } from "@/validators";
import {
  buildBatchSummaryCsv,
  buildPlanFromLegacyBatchItem,
  type ILegacyBatchItem,
} from "@/lib/utils/logistics_report";
import {
  useOrderTransaction,
  IOrderPayload,
} from "@/hooks/use_order_transaction";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";
import {
  TRANSPORT_CALCULATOR_QUERY_PARAM,
  HISTORY_VIEW_STATE_STORAGE_KEY,
  buildPlanCode,
} from "@/constants/logistics";
import { ORDER_TYPE } from "@/constants/status";
import { ANALYSIS_BASE_COSTS } from "@/constants/price";
import { useTranslation } from "@/i18n/i18n_context";

interface IHistoryItem {
  id: string;
  generatedAt: string;
  status: string;
  category: string;
  origin?: { lat: number | ""; lng: number | "" };
  dest?: { lat: number | ""; lng: number | "" };
  weightKg?: number;
  action?: string;
  items?: Array<{
    origin: string | { lat: number; lng: number; name?: string };
    dest: string | { lat: number; lng: number; name?: string };
  }>;
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <ReportPageContent />
    </Suspense>
  );
}

function ReportPageContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { workflowStatus, resetTransaction, executeOrderTransaction } =
    useOrderTransaction();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab =
    searchParams?.get(TRANSPORT_CALCULATOR_QUERY_PARAM.TAB) === "history"
      ? "history"
      : searchParams?.get(TRANSPORT_CALCULATOR_QUERY_PARAM.TAB) === "mileage"
        ? "mileage"
        : "analysis";

  // Info: (20260724 - Tzuhan) 歷史清單瀏覽狀態(展開列)受控化,配合 sessionStorage 保存/還原(需求四)
  const [historyExpandedKeys, setHistoryExpandedKeys] = useState<Set<string>>(
    new Set(),
  );

  /**
   * Info: (20260724 - Tzuhan) 需求四:tab 切換由 router.replace 改為 router.push。
   * replace 會覆寫 ?tab=history 的 history entry,導致載入歷史後按「上一頁」直接跳出頁面;
   * push 讓瀏覽器導覽語意完整(上一頁精準返回清單)。僅初始化/正規化情境用 replace。
   * analysisId 一併寫入 URL,讓載入的報告檢視可刷新重現、可前進返回。
   */
  const setActiveTab = useCallback(
    (
      tab: "analysis" | "history" | "mileage",
      options?: { replace?: boolean; analysisId?: string },
    ) => {
      // Info: (20260724 - Tzuhan) 離開 history tab 時暫存捲動位置與展開列,返回時還原
      if (activeTab === "history" && tab !== "history") {
        try {
          sessionStorage.setItem(
            HISTORY_VIEW_STATE_STORAGE_KEY,
            JSON.stringify({
              scrollY: window.scrollY,
              expandedKeys: Array.from(historyExpandedKeys),
            }),
          );
        } catch {
          // Info: (20260724 - Tzuhan) sessionStorage 不可用(如隱私模式)時靜默略過,僅影響瀏覽狀態還原
        }
      }
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set(TRANSPORT_CALCULATOR_QUERY_PARAM.TAB, tab);
      if (options?.analysisId) {
        params.set(
          TRANSPORT_CALCULATOR_QUERY_PARAM.ANALYSIS_ID,
          options.analysisId,
        );
      } else {
        params.delete(TRANSPORT_CALCULATOR_QUERY_PARAM.ANALYSIS_ID);
      }
      const url = `${pathname}?${params.toString()}`;
      if (options?.replace) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }
    },
    [pathname, router, searchParams, activeTab, historyExpandedKeys],
  );

  const [aiInput, setAiInput] = useState(
    t("transportation_carbon_footprint_calculator.default_ai_input"),
  );
  const [weightKg, setWeightKg] = useState<number | "">("");
  const [isParsing, setIsParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // Info: (20260501 - Luphia) PDF 匯出狀態
  const [plan, setPlan] = useState<ILogisticsPlan | null>(null);
  const [batchResults, setBatchResults] = useState<
    IMileageBatchResult[] | null
  >(null);
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);
  // Info: (20260724 - Tzuhan) 需求二:一次只渲染/截圖一個 (路線, 方案) 組合,每個方案產出獨立 PDF
  const [exportingPlanType, setExportingPlanType] = useState<RouteType | null>(
    null,
  );
  // Info: (20260724 - Tzuhan) 匯出勾選選單的目標範圍:整批 / 單一路線 / 單筆分析報告
  const [exportModalTarget, setExportModalTarget] = useState<{
    scope: "batch" | "single-route" | "report";
    index?: number;
  } | null>(null);
  // Info: (20260724 - Tzuhan) 匯出進度(第 x / y 份),顯示於匯出覆蓋層
  const [exportProgress, setExportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  // Info: (20260729 - Tzuhan) 匯出批次識別碼:同批 PDF 與 summary.csv 共用,渲染於 PDF 頁尾
  const [exportId, setExportId] = useState<string | null>(null);
  const mapReadyResolver = useRef<(() => void) | null>(null);
  /**
   * Info: (20260731 - Tzuhan) 批次離屏渲染的地圖控制器(issue 08)。
   * 批次一次只渲染一個 (路線, 方案),故單一 ref 即足夠;每次 remount 由 key 保證重新綁定。
   */
  const batchMapRef = useRef<IMapViewerRef>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<IHistoryItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Info: (20260430 - Tzuhan) 手動參數
  const [showManual, setShowManual] = useState(false);
  const [origin, setOrigin] = useState<{ lat: number | ""; lng: number | "" }>({
    lat: "",
    lng: "",
  });
  const [dest, setDest] = useState<{ lat: number | ""; lng: number | "" }>({
    lat: "",
    lng: "",
  });

  const [selectedRoutes, setSelectedRoutes] = useState<Set<RouteType>>(
    new Set(["land", "sea", "air", "seaLandAir"]),
  );

  const reportRef = useRef<HTMLDivElement>(null);
  const scrollTargetRef = useRef<HTMLDivElement>(null);
  const historyTableRef = useRef<HTMLDivElement>(null);

  // Info: (20260501 - Luphia) 建立各區段地圖的 Ref 供截圖使用 (優化：避免每次 render 重新產生物件)
  const landMapRef = useRef<IMapViewerRef>(null);
  const seaMapRef = useRef<IMapViewerRef>(null);
  const airMapRef = useRef<IMapViewerRef>(null);
  const customMapRef = useRef<IMapViewerRef>(null);
  // Info: (20260729 - Tzuhan) issue 10:海陸空聯運方案的地圖 ref
  const seaLandAirMapRef = useRef<IMapViewerRef>(null);
  const mapRefs = useMemo<
    Record<RouteType, React.RefObject<IMapViewerRef | null>>
  >(
    () => ({
      land: landMapRef,
      sea: seaMapRef,
      air: airMapRef,
      seaLandAir: seaLandAirMapRef,
      custom: customMapRef,
    }),
    [],
  );

  // Info: (20260501 - Luphia) Fetch History (優化：包裝 useCallback 供 useEffect 穩定依賴)
  const fetchHistory = useCallback(async () => {
    try {
      const res = await request<{ payload: IHistoryItem[] }>(
        `/api/v1/user/analysis?category=${ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT}`,
      );
      if (res?.payload) {
        setHistory(res.payload);
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  }, []);

  // Info: (20260501 - Luphia) Fetch history on mount and when polling stops
  useEffect(() => {
    if (user) fetchHistory();
  }, [user, fetchHistory]);

  const hasExecuting = useMemo(
    () =>
      history.some(
        (item) =>
          item.status?.toUpperCase() !== "COMPLETED" &&
          item.status?.toUpperCase() !== "FAILED",
      ),
    [history],
  );

  useEffect(() => {
    if (!hasExecuting) return;

    const interval = setInterval(() => {
      fetchHistory();
    }, 10000);

    return () => clearInterval(interval);
  }, [hasExecuting, fetchHistory]);

  // Info: (20260724 - Tzuhan) 返回 history tab 時還原捲動位置與展開列(需求四)
  useEffect(() => {
    if (activeTab !== "history") return;
    try {
      const raw = sessionStorage.getItem(HISTORY_VIEW_STATE_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        scrollY?: number;
        expandedKeys?: string[];
      };
      if (Array.isArray(saved.expandedKeys)) {
        setHistoryExpandedKeys(new Set(saved.expandedKeys));
      }
      if (typeof saved.scrollY === "number") {
        const targetY = saved.scrollY;
        // Info: (20260724 - Tzuhan) 等清單渲染完成再捲動,避免內容高度不足捲不到位
        setTimeout(() => window.scrollTo({ top: targetY }), 50);
      }
    } catch {
      // Info: (20260724 - Tzuhan) 暫存毀損時放棄還原,不影響功能
    }
  }, [activeTab]);

  const calculateFootprint = useCallback(async () => {
    setAiInput("");
    setOrigin({ lat: "", lng: "" });
    setDest({ lat: "", lng: "" });
    setWeightKg("");
    setShowManual(false);
    setPlan(null);
    setError(null);

    await fetchHistory();

    setTimeout(() => {
      if (historyTableRef.current) {
        historyTableRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  }, [fetchHistory]);

  const handleOpenPayment = async () => {
    if (!user) return;

    let currentOrigin = { ...origin };
    let currentDest = { ...dest };
    let currentWeight = weightKg;

    const hasManualParams =
      currentOrigin.lat !== "" &&
      currentOrigin.lng !== "" &&
      currentDest.lat !== "" &&
      currentDest.lng !== "" &&
      currentWeight !== "";

    if (!hasManualParams) {
      if (!aiInput.trim()) {
        setError("請輸入運輸路線描述，或展開進階設定手動輸入完整參數。");
        return;
      }
      setLoading(true);
      setIsParsing(true);
      setError(null);
      try {
        const resParse = await fetch(
          "/api/v1/transportation_carbon_footprint_calculator",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "parse", text: aiInput }),
          },
        );

        if (!resParse.ok) {
          const errorData = await resParse.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              errorData.error ||
              `AI 解析失敗 (${resParse.status})`,
          );
        }

        const responseParse = await resParse.json();
        const data = responseParse.payload;

        if (data.parsed?.origin) currentOrigin = data.parsed.origin;
        if (data.parsed?.dest) currentDest = data.parsed.dest;
        if (data.parsed?.weightKg) currentWeight = data.parsed.weightKg;

        setOrigin(currentOrigin);
        setDest(currentDest);
        setWeightKg(currentWeight);
        setShowManual(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "AI 解析失敗");
        setLoading(false);
        setIsParsing(false);
        return;
      } finally {
        setLoading(false);
        setIsParsing(false);
      }
    }

    if (
      currentOrigin.lat === "" ||
      currentOrigin.lng === "" ||
      currentDest.lat === "" ||
      currentDest.lng === "" ||
      currentWeight === ""
    ) {
      setError("無法取得完整參數，請確認 AI 解析結果或手動輸入。");
      return;
    }

    setIsPaymentModalOpen(true);
    resetTransaction();
  };

  const handlePaymentConfirm = async () => {
    const orderPayload: IOrderPayload = {
      type: ORDER_TYPE.ANALYSIS,
      data: {
        category: ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT,
        origin,
        dest,
        weightKg,
      },
      items: [
        {
          name: t(
            "transportation_carbon_footprint_calculator.payment.fee_name",
          ),
          unitPrice: ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
          quantity: 1,
        },
      ],
    };

    await executeOrderTransaction(
      orderPayload,
      ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
      async () => {
        await calculateFootprint();
        setIsPaymentModalOpen(false);
        setActiveTab("history");
      },
    );
  };

  // Info: (20260501 - Luphia) 使用 functional update 避免依賴外部的 selectedRoutes
  const toggleRoute = useCallback((route: RouteType) => {
    setSelectedRoutes((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(route)) {
        newSelected.delete(route);
      } else {
        newSelected.add(route);
      }
      return newSelected;
    });
  }, []);

  const handleMapsReady = useCallback(() => {
    if (mapReadyResolver.current) {
      mapReadyResolver.current();
    }
  }, []);

  // Info: (20260724 - Tzuhan) 運輸方式適用性收斂到單一決定論引擎(route_applicability.ts):
  // Info: (20260724 - Tzuhan) 陸運沿用原「直線 fallback 非真實路徑」判斷;海空運新增「國內/短程屏蔽」規則(需求一)
  const routeApplicability = useMemo(
    () =>
      plan
        ? getRouteApplicability(plan)
        : {
            land: true,
            sea: true,
            air: true,
            seaLandAir: true,
            custom: false,
          },
    [plan],
  );
  const isLandAvailable = routeApplicability.land;

  // Info: (20260724 - Tzuhan) 檔名用地點標籤(座標物件取 name,否則以座標字串呈現)
  const getLocationLabel = (
    loc: string | { lat: number; lng: number; name?: string },
  ): string => {
    if (typeof loc === "string") return loc;
    if (loc && typeof loc === "object" && "lat" in loc && "lng" in loc) {
      return loc.name || `${loc.lat}_${loc.lng}`;
    }
    return "";
  };

  // Info: (20260724 - Tzuhan) 需求二:匯出入口一律先開勾選選單,匯出範圍由使用者明確勾選(與畫面檢視狀態解耦)
  const handleExportRequest = (singleIndex?: number) => {
    if (batchResults) {
      setExportModalTarget(
        singleIndex !== undefined
          ? { scope: "single-route", index: singleIndex }
          : { scope: "batch" },
      );
    } else if (plan) {
      setExportModalTarget({ scope: "report" });
    }
  };

  // Info: (20260724 - Tzuhan) 勾選選單可選項:僅列出適用性引擎判定為適用的方案(整批取聯集)
  const exportAvailablePlans = useMemo<RouteType[]>(() => {
    if (!exportModalTarget) return [];
    if (exportModalTarget.scope === "report") {
      return (["land", "sea", "air", "seaLandAir"] as const).filter(
        (type) => routeApplicability[type],
      );
    }
    const targets =
      exportModalTarget.scope === "single-route" &&
      exportModalTarget.index !== undefined
        ? [batchResults?.[exportModalTarget.index]]
        : (batchResults ?? []);
    const union = new Set<RouteType>();
    targets.forEach((item) => {
      if (!item) return;
      const applicability = getRouteApplicability(item.plan);
      (["custom", "land", "sea", "air", "seaLandAir"] as const).forEach(
        (type) => {
          if (applicability[type]) union.add(type);
        },
      );
    });
    return Array.from(union);
  }, [exportModalTarget, batchResults, routeApplicability]);

  /**
   * Info: (20260724 - Tzuhan) 批次匯出:每個 (路線, 方案) 組合渲染 → 截圖 → 獨立 PDF(需求二)
   * 單檔直接下載;多檔連同 summary.csv 打包 zip
   */
  const executeBatchExport = async (
    indices: number[],
    selectedPlans: Set<RouteType>,
  ) => {
    if (!batchResults) return;
    let originalViewport: string | null = null;
    let viewportMeta: Element | null = null;
    const batchExportId = buildExportId();
    setExportId(batchExportId);
    try {
      setIsExporting(true);

      viewportMeta = document.querySelector('meta[name="viewport"]');
      setExportingIndex(null);
      setExportingPlanType(null);
      mapReadyResolver.current = null;
      if (viewportMeta) {
        originalViewport = viewportMeta.getAttribute("content");
      } else {
        viewportMeta = document.createElement("meta");
        viewportMeta.setAttribute("name", "viewport");
        document.head.appendChild(viewportMeta);
      }
      if (window.innerWidth < 1024) {
        viewportMeta.setAttribute("content", "width=1024");
      }

      // Info: (20260511 - Luphia) Wait for React to render the hidden batch components
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Info: (20260724 - Tzuhan) 展開 (路線, 方案) 工作清單:每條路線只匯出「使用者勾選 ∩ 該路線適用」的方案
      const jobs: Array<{ index: number; type: RouteType }> = [];
      indices.forEach((index) => {
        const applicability = getRouteApplicability(batchResults[index]?.plan);
        (["custom", "land", "sea", "air", "seaLandAir"] as const).forEach(
          (type) => {
            if (selectedPlans.has(type) && applicability[type]) {
              jobs.push({ index, type });
            }
          },
        );
      });

      const files: Array<{ index: number; filename: string; blob: Blob }> = [];

      /**
       * Info: (20260731 - Tzuhan) issue 08 步驟三:伺服端向量列印。
       * 離屏渲染仍然保留,但**只為了取地圖影像**(MapLibre 是 WebGL,伺服端沒有);
       * 不再截整頁,因此 8000ms 的截圖 fallback 與 pixelRatio 2 的大圖都不需要了。
       */
      if (
        TRANSPORT_PDF_EXPORT_MODE === TransportPdfExportModeEnum.SERVER_VECTOR
      ) {
        const mapImages = new Map<string, string>();
        for (let j = 0; j < jobs.length; j++) {
          const job = jobs[j];
          setExportProgress({ current: j + 1, total: jobs.length });
          setExportingIndex(job.index);
          setExportingPlanType(job.type);
          // Info: (20260511 - Luphia) Wait for the BatchItemReport to fully render and capture its internal MapViewers
          await new Promise<void>((resolve) => {
            mapReadyResolver.current = resolve;
            // Info: (20260731 - Tzuhan) fallback 從 8000ms 降到 4000ms:此處只等地圖就緒,
            // Info: (20260731 - Tzuhan) 不再等整頁可截圖;地圖沒就緒時該份不附圖,不阻擋匯出
            setTimeout(resolve, 4000);
          });
          const dataUrl = await batchMapRef.current?.captureMap();
          if (dataUrl) {
            mapImages.set(buildMapImageKey(job.index, job.type), dataUrl);
          }
        }

        // Info: (20260731 - Tzuhan) 離屏元件可以先卸載:後續只需要資料,不再需要 DOM
        setExportingIndex(null);
        setExportingPlanType(null);

        const items = buildReportPdfItems({
          results: batchResults,
          indices,
          selectedPlans,
          fallbackWeightKg: weightKg !== "" ? weightKg : 1000,
          mapImages,
        });
        const exported = await requestReportPdfs(items, {
          exportId: batchExportId,
          onProgress: (completed, total) => {
            setExportProgress({ current: completed, total });
          },
        });
        /**
         * Info: (20260731 - Tzuhan) 以方案代碼回推路線索引(檔名一律以 `R01-SEA_` 起頭,
         * 代碼內不含底線)。不依賴回傳順序:順序耦合一旦被改動就會靜默錯位,
         * 而錯位的後果是 summary.csv 把 PDF 對到錯誤的路線 —— 交叉索引失效比少一個檔案更難察覺。
         */
        const routeIndexByPlanCode = new Map<string, number>(
          jobs.map((job) => [buildPlanCode(job.index, job.type), job.index]),
        );
        exported.forEach((file) => {
          const planCode = file.fileName.split("_")[0];
          const routeIndex = routeIndexByPlanCode.get(planCode);
          if (routeIndex === undefined) {
            // Info: (20260731 - Tzuhan) 對不到就不進 CSV 對照表,但檔案照給;寧可少一列對照也不要給錯的
            console.warn(
              `[pdfExport] 無法由檔名 ${file.fileName} 回推路線索引,已略過 summary.csv 對照`,
            );
            return;
          }
          files.push({
            index: routeIndex,
            filename: file.fileName,
            blob: file.blob,
          });
        });
      } else {
        for (let j = 0; j < jobs.length; j++) {
          const job = jobs[j];
          setExportProgress({ current: j + 1, total: jobs.length });
          setExportingIndex(job.index);
          setExportingPlanType(job.type);
          // Info: (20260511 - Luphia) Wait for the BatchItemReport to fully render and capture its internal MapViewers
          await new Promise<void>((resolve) => {
            mapReadyResolver.current = resolve;
            // Info: (20260511 - Luphia) Fallback timeout just in case WebGL or capture fails to respond
            setTimeout(resolve, 8000);
          });

          const pageEl = document.getElementById(
            `batch-report-item-${job.index}`,
          );
          if (!pageEl) continue;

          const item = batchResults[job.index];
          const pdf = await captureElementToPdf(pageEl);
          const filename = buildExportFileName(
            job.index,
            job.type,
            getLocationLabel(item.origin),
            getLocationLabel(item.dest),
          );
          files.push({
            index: job.index,
            filename,
            blob: pdfToBlob(pdf, filename).blob,
          });
        }
      }

      if (files.length === 0) return;

      if (files.length === 1) {
        saveAs(files[0].blob, files[0].filename);
        return;
      }

      const zip = new JSZip();
      files.forEach((file) => {
        zip.file(file.filename, file.blob);
      });

      // Info: (20260724 - Tzuhan) 需求三:summary.csv 按方案分欄、逐段展開,由 logistics_report.ts 純函數生成
      if (indices.length > 1) {
        const filesByRouteIndex = new Map<number, string[]>();
        files.forEach((file) => {
          const list = filesByRouteIndex.get(file.index) || [];
          list.push(file.filename);
          filesByRouteIndex.set(file.index, list);
        });
        zip.file(
          "summary.csv",
          buildBatchSummaryCsv(
            batchResults,
            indices,
            filesByRouteIndex,
            weightKg !== "" ? weightKg : 1000,
            batchExportId,
          ),
        );
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `batch_report_${new Date().getTime()}.zip`);
    } catch (err) {
      console.error("Export zip failed", err);
    } finally {
      if (viewportMeta && originalViewport !== null) {
        viewportMeta.setAttribute("content", originalViewport);
      }
      setExportingIndex(null);
      setExportingPlanType(null);
      setExportProgress(null);
      setExportId(null);
      setIsExporting(false);
    }
  };

  /**
   * Info: (20260724 - Tzuhan) 單筆分析報告匯出:沿用既有 WebGL 截圖 workaround,
   * 但改為「一個方案一份獨立 PDF」(需求二),多檔打包 zip
   */
  const executeReportExport = async (selectedPlans: Set<RouteType>) => {
    let originalViewport: string | null = null;
    let viewportMeta: Element | null = null;
    setExportId(buildExportId());
    try {
      setIsExporting(true); // Info: (20260501 - Luphia) 觸發重新渲染，隱藏控制面板並顯示各分頁 Header/Footer

      // Info: (20260503 - Luphia) 動態修改 viewport 來欺騙瀏覽器，強制觸發 Tailwind 的桌面版 md:/lg: 斷點
      viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        originalViewport = viewportMeta.getAttribute("content");
      } else {
        viewportMeta = document.createElement("meta");
        viewportMeta.setAttribute("name", "viewport");
        document.head.appendChild(viewportMeta);
      }
      if (window.innerWidth < 1024) {
        viewportMeta.setAttribute("content", "width=1024");
      }

      // Info: (20260430 - Tzuhan) 等待 React 重新渲染完成
      await new Promise((resolve) => setTimeout(resolve, 800));

      const originalClasses: { el: Element; className: string }[] = [];
      document.querySelectorAll("*").forEach((child) => {
        if (
          child.className &&
          typeof child.className === "string" &&
          (child.className.includes("blur-") ||
            child.className.includes("backdrop-blur-"))
        ) {
          originalClasses.push({ el: child, className: child.className });
          child.className = child.className
            .replace(/blur-\w+/g, "")
            .replace(/backdrop-blur-\w+/g, "");
        }
      });

      // Info: (20260724 - Tzuhan) 匯出範圍=使用者勾選 ∩ 適用性引擎判定(需求一+二),與畫面檢視狀態脫鉤
      const routesToExport = (
        ["land", "sea", "air", "seaLandAir"] as const
      ).filter((type) => selectedPlans.has(type) && routeApplicability[type]);

      // Info: (20260724 - Tzuhan) 需求二:一個方案一份獨立 PDF,不再合併分頁
      const files: Array<{ filename: string; blob: Blob }> = [];

      /**
       * Info: (20260731 - Tzuhan) issue 08 步驟二:伺服端向量列印。
       * 只向 MapLibre 取地圖影像,其餘資料走純函數建構載荷 —— 不覆寫寬度、不換 canvas、不截整頁,
       * 因此下方那三段等待(1500ms ResizeObserver / 100ms DOM / 截圖)在此路徑一併消失。
       * 光柵路徑保留於 else,`TRANSPORT_PDF_EXPORT_MODE` 可即刻切回。
       */
      if (
        TRANSPORT_PDF_EXPORT_MODE === TransportPdfExportModeEnum.SERVER_VECTOR
      ) {
        const singleItem: IMileageBatchResult = {
          origin: { lat: Number(origin.lat), lng: Number(origin.lng) },
          dest: { lat: Number(dest.lat), lng: Number(dest.lng) },
          plan: plan ?? undefined,
          weightKg: Number(weightKg) || undefined,
        } as IMileageBatchResult;

        const items: ILogisticsReportPdfItem[] = [];
        for (let i = 0; i < routesToExport.length; i++) {
          const routeType = routesToExport[i];
          setExportProgress({ current: i + 1, total: routesToExport.length });
          // Info: (20260731 - Tzuhan) 地圖只能由前端提供:MapLibre 是 WebGL 且需要 MapTiler key,伺服端沒有
          const mapImageDataUrl =
            (await mapRefs[routeType as RouteType]?.current?.captureMap()) ??
            undefined;
          const built = buildReportPdfItem({
            item: singleItem,
            routeIndex: 0,
            planKey: routeType,
            fallbackWeightKg: weightKg !== "" ? weightKg : 1000,
            mapImageDataUrl,
          });
          if (built) items.push(built);
        }

        const exported = await requestReportPdfs(items, {
          exportId: exportId ?? undefined,
          onProgress: (completed, total) => {
            setExportProgress({ current: completed, total });
          },
        });
        exported.forEach((file) => {
          // Info: (20260731 - Tzuhan) 體積量測留在同一條路徑上,超出預算即警告(不阻擋下載)
          if (file.sizeBytes > PDF_EXPORT_SIZE_BUDGET_BYTES) {
            console.warn(
              `[pdfExport] ${file.fileName} 為 ${Math.round(file.sizeBytes / 1024)} KB,超出預算 ${Math.round(
                PDF_EXPORT_SIZE_BUDGET_BYTES / 1024,
              )} KB`,
            );
          }
          files.push({ filename: file.fileName, blob: file.blob });
        });
      } else {
        for (let i = 0; i < routesToExport.length; i++) {
          const routeType = routesToExport[i];
          setExportProgress({ current: i + 1, total: routesToExport.length });
          const pageEl = document.getElementById(`pdf-page-${routeType}`);
          if (!pageEl) continue;

          // Info: (20260501 - Luphia) 強制設定固定寬度以符合 A4 列印比例最佳化 (約 1024px)
          const oldWidth = pageEl.style.width;
          const oldMaxWidth = pageEl.style.maxWidth;
          pageEl.style.width = "1024px";
          pageEl.style.maxWidth = "1024px";

          /**
           * Info: (20260501 - Luphia)
           * 寬度改變會觸發 MapLibre 的 ResizeObserver，這會清空 WebGL Buffer！
           * 我們必須等待足夠長的時間讓 MapLibre 重新渲染地圖跟路線，否則會抓到透明的圖，且 HTML Markers 也會錯位。
           */
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Info: (20260501 - Luphia) 直接向 MapLibre 請求渲染結果！徹底解決 WebGL 被 html-to-image 忽略的問題！
          const currentMapRef = mapRefs[routeType as RouteType];
          let imgEl: HTMLImageElement | null = null;
          let originalCanvasDisplay = "";
          let targetCanvas: HTMLCanvasElement | null = null;

          if (
            currentMapRef &&
            currentMapRef.current &&
            currentMapRef.current.captureMap
          ) {
            const dataUrl = await currentMapRef.current.captureMap();
            if (dataUrl) {
              targetCanvas = pageEl.querySelector(
                ".maplibregl-canvas",
              ) as HTMLCanvasElement;
              if (targetCanvas) {
                imgEl = document.createElement("img");
                imgEl.src = dataUrl;
                imgEl.style.width =
                  targetCanvas.style.width || targetCanvas.offsetWidth + "px";
                imgEl.style.height =
                  targetCanvas.style.height || targetCanvas.offsetHeight + "px";
                imgEl.style.position = targetCanvas.style.position;
                imgEl.style.top = targetCanvas.style.top;
                imgEl.style.left = targetCanvas.style.left;
                imgEl.className = targetCanvas.className;
                imgEl.style.zIndex = targetCanvas.style.zIndex;

                const parent = targetCanvas.parentElement;
                if (parent) {
                  parent.insertBefore(imgEl, targetCanvas);
                  originalCanvasDisplay = targetCanvas.style.display;
                  targetCanvas.style.display = "none";
                }
              }
            }
          }

          // Info: (20260501 - Luphia) 等待 DOM 更新
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Info: (20260731 - Tzuhan) 改用共用的 captureElementToPdf:此處原本自帶一份
          // Info: (20260731 - Tzuhan) 「截圖 + 分頁」邏輯(JPEG q0.8,且同樣沒開 compress),
          // Info: (20260731 - Tzuhan) 是當初抽出共用函式時漏掉的第三份複製。兩條路徑分歧的後果是
          // Info: (20260731 - Tzuhan) 批次與單筆匯出的體積與畫質不一致,且修一邊不會修到另一邊。
          const pdf = await captureElementToPdf(pageEl);

          // Info: (20260501 - Luphia) 還原 canvas
          if (targetCanvas && imgEl && imgEl.parentElement) {
            targetCanvas.style.display = originalCanvasDisplay;
            imgEl.parentElement.removeChild(imgEl);
          }

          pageEl.style.width = oldWidth;
          pageEl.style.maxWidth = oldMaxWidth;

          const filename = buildExportFileName(
            0,
            routeType,
            origin.lat !== "" ? `${origin.lat}_${origin.lng}` : undefined,
            dest.lat !== "" ? `${dest.lat}_${dest.lng}` : undefined,
          );
          files.push({ filename, blob: pdfToBlob(pdf, filename).blob });
        }
      }

      // Info: (20260501 - Luphia) 還原 class
      originalClasses.forEach(({ el, className }) => {
        el.className = className;
      });

      // Info: (20260724 - Tzuhan) 單檔直接下載;多方案打包 zip,嚴禁合併於同一份文件
      if (files.length === 1) {
        saveAs(files[0].blob, files[0].filename);
      } else if (files.length > 1) {
        const zip = new JSZip();
        files.forEach((file) => {
          zip.file(file.filename, file.blob);
        });
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(
          content,
          `iSunFA_Logistics_Carbon_Report_${new Date().getTime()}.zip`,
        );
      }
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert(
        t("transportation_carbon_footprint_calculator.pdf.error_failed") +
          (err instanceof Error
            ? err.message
            : t(
                "transportation_carbon_footprint_calculator.pdf.error_unknown",
              )),
      );
    } finally {
      if (viewportMeta) {
        viewportMeta.setAttribute(
          "content",
          originalViewport || "width=device-width, initial-scale=1",
        );
      }
      setExportProgress(null);
      setExportId(null);
      setIsExporting(false);
    }
  };

  // Info: (20260724 - Tzuhan) 勾選選單確認 → 依目標範圍分派至批次或單筆匯出流程
  const handleExportConfirm = async (selectedPlans: Set<RouteType>) => {
    const target = exportModalTarget;
    setExportModalTarget(null);
    if (!target) return;

    if (target.scope === "report") {
      await executeReportExport(selectedPlans);
      return;
    }
    if (!batchResults) return;
    const indices =
      target.scope === "single-route" && target.index !== undefined
        ? [target.index]
        : batchResults.map((_, index) => index);
    await executeBatchExport(indices, selectedPlans);
  };

  const isLocked = loading; // Info: (20260430 - Tzuhan) 只有在「運算中」才反灰，算完後重新開放輸入以便用戶微調再算一次

  // Info: (20260724 - Tzuhan) 回傳載入的資料型態("batch" | "single"),供匯出選單決定範圍;失敗回傳 false
  // Info: (20260724 - Tzuhan) navigate=false 供「URL 帶 analysisId 的自動載入」使用,避免重複寫入瀏覽歷史(需求四)
  // Info: (20260724 - Tzuhan) useCallback 包裝供 analysisId 自動載入 effect 作為穩定依賴
  const handleLoadHistory = useCallback(
    async (
      item: IHistoryItem,
      options?: { navigate?: boolean },
    ): Promise<"batch" | "single" | false> => {
      const shouldNavigate = options?.navigate !== false;
      setLoading(true);
      setError(null);
      setPlan(null);
      setBatchResults(null);
      try {
        const res = await request<{ payload: { result: string } }>(
          `/api/v1/user/analysis/${item.id}`,
        );
        if (res?.payload?.result) {
          const parsed = JSON.parse(res.payload.result);
          let isBatch = Array.isArray(parsed);
          let batchArray: IMileageBatchResult[] | null = null;

          if (!isBatch && parsed && typeof parsed === "object") {
            if ("0" in parsed) {
              isBatch = true;
              const items: IMileageBatchResult[] = [];
              let i = 0;
              while (String(i) in parsed) {
                items.push(parsed[String(i)] as IMileageBatchResult);
                i++;
              }
              batchArray = items;
            }
          } else if (isBatch) {
            batchArray = parsed;
          }

          if (isBatch && batchArray) {
            // Info: (20260724 - Tzuhan) 需求三:legacy 重建抽至 logistics_report.ts 純函數,
            // Info: (20260724 - Tzuhan) 改用 Decimal 與 EMISSION_FACTORS 單一來源(修正舊版 0.01614/0.50422 錯誤係數)
            batchArray = batchArray.map((bItem: ILegacyBatchItem) => {
              if (!bItem.plan) {
                bItem.plan = buildPlanFromLegacyBatchItem(
                  bItem,
                  item.weightKg || 1000,
                );
              }
              return bItem;
            });
            setBatchResults(batchArray);
            setPlan(null);
            // Info: (20260724 - Tzuhan) push + analysisId:上一頁可精準返回清單,前進/刷新可重現此檢視(需求四)
            if (shouldNavigate)
              setActiveTab("mileage", { analysisId: item.id });
          } else {
            setPlan(parsed);
            setBatchResults(null);
            if (shouldNavigate)
              setActiveTab("analysis", { analysisId: item.id });
          }
          setOrigin(item.origin || { lat: "", lng: "" });
          setDest(item.dest || { lat: "", lng: "" });
          setWeightKg(item.weightKg || "");

          setTimeout(() => {
            if (scrollTargetRef.current) {
              scrollTargetRef.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          }, 100);
          return isBatch && batchArray ? "batch" : "single";
        }
      } catch (err) {
        console.error("Failed to load history", err);
        setError("無法載入歷史報告");
      } finally {
        setLoading(false);
      }
      return false;
    },
    [setActiveTab],
  );

  // Info: (20260724 - Tzuhan) URL 帶 analysisId 時自動載入該筆(刷新/前進可重現載入的報告檢視,需求四)
  const analysisIdParam = searchParams?.get(
    TRANSPORT_CALCULATOR_QUERY_PARAM.ANALYSIS_ID,
  );
  const loadedAnalysisIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!analysisIdParam) {
      loadedAnalysisIdRef.current = null;
      return;
    }
    if (loadedAnalysisIdRef.current === analysisIdParam) return;
    const target = history.find((row) => row.id === analysisIdParam);
    if (!target || target.status?.toUpperCase() !== "COMPLETED") return;
    loadedAnalysisIdRef.current = analysisIdParam;
    // Info: (20260724 - Tzuhan) URL 已含 analysisId,載入時不再寫入瀏覽歷史
    handleLoadHistory(target, { navigate: false });
  }, [analysisIdParam, history, handleLoadHistory]);

  const historyColumns: IDataTableColumn<IHistoryItem>[] = [
    {
      key: "generatedAt",
      label: t("common.date"),
      render: (row) => (
        <span className="text-sm text-gray-600">{row.generatedAt}</span>
      ),
    },
    {
      key: "status",
      label: t("common.status"),
      render: (row) => {
        const statusUpper = row.status?.toUpperCase() || "";
        const isCompleted = ["COMPLETED", "SUCCESS", "DONE"].includes(
          statusUpper,
        );
        const isFailed = ["FAILED", "ERROR"].includes(statusUpper);
        const isIncomplete = !isCompleted && !isFailed;

        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${isCompleted ? "bg-green-100 text-green-700" : isFailed ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
          >
            {isIncomplete && <Loader2 className="h-3 w-3 animate-spin" />}
            {row.status}
          </span>
        );
      },
    },
    {
      key: "type",
      label: t("common.type"),
      render: (row) => (
        <span className="font-bold text-gray-700">
          {row.action === "calculate_batch" ? "里程核算" : "碳排核算"}
        </span>
      ),
    },
    {
      key: "origin",
      label: t("common.origin"),
      render: (row) => {
        if (row.action === "calculate_batch") {
          if (row.items && row.items.length === 1) {
            return (
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <MapPin className="h-4 w-4 shrink-0 text-orange-500" />
                <span className="max-w-[200px] truncate">
                  {typeof row.items[0].origin === "string"
                    ? row.items[0].origin
                    : (row.items[0].origin as { lat?: number; lng?: number })
                          ?.lat
                      ? `${(row.items[0].origin as { lat?: number; lng?: number }).lat}, ${(row.items[0].origin as { lat?: number; lng?: number }).lng}`
                      : t("common.unknown")}
                </span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-1.5 text-sm text-gray-700">
              <span className="max-w-[200px] truncate text-gray-500 italic">
                {t("common.multiple_items")} ({row.items?.length || 0})
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <MapPin className="h-4 w-4 shrink-0 text-orange-500" />
            <span className="max-w-[200px] truncate">
              {row.origin?.lat
                ? `${row.origin.lat}, ${row.origin.lng}`
                : t("common.unknown")}
            </span>
          </div>
        );
      },
    },
    {
      key: "dest",
      label: t("common.destination"),
      render: (row) => {
        if (row.action === "calculate_batch") {
          if (row.items && row.items.length === 1) {
            return (
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <MapPin className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="max-w-[200px] truncate">
                  {typeof row.items[0].dest === "string"
                    ? row.items[0].dest
                    : (row.items[0].dest as { lat?: number; lng?: number })?.lat
                      ? `${(row.items[0].dest as { lat?: number; lng?: number }).lat}, ${(row.items[0].dest as { lat?: number; lng?: number }).lng}`
                      : t("common.unknown")}
                </span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-1.5 text-sm text-gray-700">
              <span className="max-w-[200px] truncate text-gray-500 italic">
                -
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <MapPin className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="max-w-[200px] truncate">
              {row.dest?.lat
                ? `${row.dest.lat}, ${row.dest.lng}`
                : t("common.unknown")}
            </span>
          </div>
        );
      },
    },
    {
      key: "weight",
      label: t("common.weight"),
      render: (row) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-700">
          <Weight className="h-4 w-4 text-gray-400" />
          <span>{row.weightKg != null ? `${row.weightKg} kg` : "-"}</span>
        </div>
      ),
    },
    {
      key: "actions",
      label: t("common.actions"),
      align: "right",
      render: (row) => {
        const isCompleted = row.status?.toUpperCase() === "COMPLETED";
        return (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => handleLoadHistory(row)}
              disabled={loading || isExporting || !isCompleted}
              className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-bold text-orange-600 transition-all hover:border-orange-300 hover:bg-orange-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("common.load")}
            </button>
            <button
              onClick={async () => {
                const loaded = await handleLoadHistory(row);
                // Info: (20260724 - Tzuhan) 載入完成後開啟匯出勾選選單(需求二),不再直接匯出全部
                if (loaded) {
                  setTimeout(
                    () =>
                      setExportModalTarget({
                        scope: loaded === "batch" ? "batch" : "report",
                      }),
                    1000,
                  );
                }
              }}
              disabled={loading || isExporting || !isCompleted}
              className="flex items-center gap-1.5 rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-orange-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("transportation_carbon_footprint_calculator.ui.export_report")}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <main
      className="mx-auto flex w-full max-w-7xl flex-col space-y-8 px-6 py-12 font-sans text-gray-900 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Head>
        <title>iSunFA ESG Logistics Static Report</title>
      </Head>

      <PaymentConfirmModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          if (
            workflowStatus === "error" ||
            workflowStatus === "payment_success"
          ) {
            resetTransaction();
            setIsPaymentModalOpen(false);
          } else if (workflowStatus === "idle") {
            setIsPaymentModalOpen(false);
          }
        }}
        onConfirm={handlePaymentConfirm}
        cost={ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT}
        items={[
          {
            label: t(
              "transportation_carbon_footprint_calculator.payment.modal_label",
            ),
            value: t(
              "transportation_carbon_footprint_calculator.payment.modal_value",
            ),
          },
        ]}
        status={workflowStatus}
      />

      {/* Info: (20260501 - Luphia) PDF 匯出時的滿版覆蓋載入提示 */}
      {isExporting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 p-6 text-center backdrop-blur-md">
          <Loader2 className="mb-6 h-16 w-16 animate-spin text-orange-600 drop-shadow-md" />
          <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
            {t(
              "transportation_carbon_footprint_calculator.pdf.generating_title_large",
            )}
          </h2>
          <p className="max-w-md text-sm leading-relaxed font-medium text-gray-500 md:text-base">
            {t(
              "transportation_carbon_footprint_calculator.pdf.generating_desc_large_1",
            )}
            <br />
            {t(
              "transportation_carbon_footprint_calculator.pdf.generating_desc_large_2",
            )}
          </p>

          {/* Info: (20260724 - Tzuhan) 匯出進度:第 x / y 份獨立 PDF(需求二) */}
          {exportProgress && (
            <p className="mt-4 text-sm font-semibold text-gray-600">
              {t(
                "transportation_carbon_footprint_calculator.export_options.progress",
                {
                  current: exportProgress.current,
                  total: exportProgress.total,
                },
              )}
            </p>
          )}

          <div className="mt-8 h-2 w-64 max-w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100">
            <div className="h-full w-full origin-left scale-x-50 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-orange-500"></div>
          </div>
        </div>
      )}

      {/* Info: (20260724 - Tzuhan) 匯出勾選選單(需求二):可複選方案,每個方案產出獨立 PDF */}
      {exportModalTarget && (
        <ExportOptionsModal
          availablePlans={exportAvailablePlans}
          onConfirm={handleExportConfirm}
          onClose={() => setExportModalTarget(null)}
        />
      )}

      <div className="relative z-10 mx-auto w-full max-w-7xl flex-1 space-y-12">
        {/* Info: (20260501 - Luphia) User Requested Header Design */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("transportation_carbon_footprint_calculator.ui.title")}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {t("transportation_carbon_footprint_calculator.ui.description")}
          </p>
        </div>

        {user ? (
          <>
            {/* Info: (20260502 - Luphia) Tabs */}
            <div className="mb-8 flex justify-center">
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`${activeTab === "analysis" ? "bg-white shadow-sm" : "hover:bg-gray-50"} rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200`}
                >
                  {t(
                    "transportation_carbon_footprint_calculator.ui.tab_analysis",
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("mileage")}
                  className={`${activeTab === "mileage" ? "bg-white shadow-sm" : "hover:bg-gray-50"} rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200`}
                >
                  {t(
                    "transportation_carbon_footprint_calculator.ui.tab_mileage",
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`${activeTab === "history" ? "bg-white shadow-sm" : "hover:bg-gray-50"} rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200`}
                >
                  {t(
                    "transportation_carbon_footprint_calculator.ui.tab_history",
                  )}
                </button>
              </div>
            </div>

            <div
              ref={reportRef}
              className={`-mx-2 bg-transparent transition-all md:mx-0 ${isExporting ? "relative overflow-hidden rounded-3xl bg-white shadow-2xl" : ""}`}
            >
              {/* Info: (20260501 - Luphia) 如果是在分析分頁且非匯出狀態，顯示輸入控制面板 */}
              {activeTab === "analysis" && !isExporting && (
                <div className="min-h-[200px] rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                      {t(
                        "transportation_carbon_footprint_calculator.ui.config_title",
                      )}
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {/* Info: (20260501 - Luphia) 第一列：語意輸入框與產生按鈕 */}
                    <div className="flex flex-col items-end gap-4 md:flex-row">
                      <label className="flex w-full flex-1 flex-col gap-2">
                        <div className="block text-sm font-medium text-gray-700">
                          {t(
                            "transportation_carbon_footprint_calculator.ui.route_description",
                          )}
                        </div>
                        <input
                          type="text"
                          value={aiInput}
                          onChange={(e) => {
                            setAiInput(e.target.value);
                            setOrigin({ lat: "", lng: "" });
                            setDest({ lat: "", lng: "" });
                            setWeightKg("");
                          }}
                          placeholder={t(
                            "transportation_carbon_footprint_calculator.ui.route_placeholder",
                          )}
                          aria-label={t(
                            "transportation_carbon_footprint_calculator.ui.route_description",
                          )}
                          disabled={isLocked || isParsing}
                          className="h-auto w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-900 transition-all focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-50"
                        />
                      </label>
                      <div className="flex h-auto w-full flex-col items-center gap-3 sm:flex-row md:w-auto">
                        <button
                          onClick={handleOpenPayment}
                          disabled={
                            loading ||
                            isParsing ||
                            isExporting ||
                            (!aiInput.trim() &&
                              !(
                                origin.lat !== "" &&
                                origin.lng !== "" &&
                                dest.lat !== "" &&
                                dest.lng !== "" &&
                                weightKg !== ""
                              ))
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-8 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                          {(loading || isParsing) && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          {t(
                            "transportation_carbon_footprint_calculator.ui.generate_report",
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Info: (20260501 - Luphia) 折疊式手動參數確認 */}
                    <div className="mt-2 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 transition-all">
                      <button
                        onClick={() => setShowManual(!showManual)}
                        className="group flex w-full items-center justify-between px-6 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                      >
                        <span className="flex items-center gap-2 transition-colors group-hover:text-gray-900">
                          {t(
                            "transportation_carbon_footprint_calculator.ui.advanced_config",
                          )}
                        </span>
                        {showManual ? (
                          <ChevronUp className="h-4 w-4 transition-colors group-hover:text-gray-900" />
                        ) : (
                          <ChevronDown className="h-4 w-4 transition-colors group-hover:text-gray-900" />
                        )}
                      </button>

                      {showManual && (
                        <div className="grid grid-cols-1 gap-5 border-t border-gray-100 bg-white p-6 md:grid-cols-2 lg:grid-cols-5">
                          {[
                            {
                              label: "origin_lat",
                              value: origin.lat,
                              setter: (val: number | "") =>
                                setOrigin({ ...origin, lat: val }),
                            },
                            {
                              label: "origin_lng",
                              value: origin.lng,
                              setter: (val: number | "") =>
                                setOrigin({ ...origin, lng: val }),
                            },
                            {
                              label: "dest_lat",
                              value: dest.lat,
                              setter: (val: number | "") =>
                                setDest({ ...dest, lat: val }),
                            },
                            {
                              label: "dest_lng",
                              value: dest.lng,
                              setter: (val: number | "") =>
                                setDest({ ...dest, lng: val }),
                            },
                            {
                              label: "total_weight",
                              value: weightKg,
                              setter: (val: number | "") => setWeightKg(val),
                            },
                          ].map((field) => (
                            <label
                              key={field.label}
                              className="flex cursor-pointer flex-col gap-1.5"
                            >
                              <span className="text-sm font-medium text-gray-700">
                                {t(
                                  `transportation_carbon_footprint_calculator.ui.${field.label}`,
                                )}
                              </span>
                              <input
                                type="number"
                                step="any"
                                aria-label={t(
                                  `transportation_carbon_footprint_calculator.ui.${field.label}`,
                                )}
                                value={field.value}
                                onChange={(e) =>
                                  field.setter(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : "",
                                  )
                                }
                                disabled={isLocked}
                                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-900 transition-all focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-50"
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* Info: (20260510 - Luphia) 里程核算區塊 */}
              {!isExporting && activeTab === "mileage" && (
                <div className="mt-10 w-full">
                  {batchResults ? (
                    <MileageBatchResults
                      batchResults={batchResults}
                      onRecalculate={() => setBatchResults(null)}
                      onDownload={handleExportRequest}
                      isExporting={isExporting}
                      exportingIndex={exportingIndex}
                    />
                  ) : (
                    <MileageCalculator
                      onNavigateToHistory={() => setActiveTab("history")}
                    />
                  )}
                </div>
              )}
              {/* Info: (20260511 - Luphia) Render hidden batch items for PDF export sequentially to avoid WebGL context limits */}
              {/* Info: (20260724 - Tzuhan) 需求二:以 (路線, 方案) 為渲染單位,key 強制 remount 以重新觸發 onReady */}
              {isExporting &&
                batchResults &&
                exportingIndex !== null &&
                exportingPlanType !== null &&
                batchResults[exportingIndex] && (
                  <div className="absolute top-[-9999px] left-[-9999px] flex flex-col opacity-0">
                    <BatchExportRenderer
                      key={`${exportingIndex}-${exportingPlanType}`}
                      item={batchResults[exportingIndex]}
                      index={exportingIndex}
                      total={batchResults.length}
                      selectedRoutes={new Set([exportingPlanType])}
                      exportId={exportId ?? undefined}
                      mapRef={batchMapRef}
                      onReady={handleMapsReady}
                    />
                  </div>
                )}

              {/* Info: (20260501 - Luphia) 歷史分析路徑區塊 */}
              {!isExporting && activeTab === "history" && (
                <div ref={historyTableRef} className="mt-10 w-full">
                  <DataTable
                    columns={historyColumns}
                    data={history}
                    rowKey={(row) => row.id}
                    expandedKeys={historyExpandedKeys}
                    onExpandedKeysChange={setHistoryExpandedKeys}
                    rowExpandable={(row) =>
                      row.action === "calculate_batch" &&
                      row.items !== undefined &&
                      row.items.length > 1
                    }
                    expandedRowRender={(row) => {
                      if (
                        row.action !== "calculate_batch" ||
                        !row.items ||
                        row.items.length <= 1
                      )
                        return null;
                      return (
                        <div className="w-full">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                              <tr className="border-b border-gray-200 text-gray-500">
                                <th className="px-4 py-2">#</th>
                                <th className="px-4 py-2">
                                  {t("common.origin")}
                                </th>
                                <th className="px-4 py-2">
                                  {t("common.destination")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {row.items.map((item, index) => (
                                <tr key={index} className="hover:bg-white/50">
                                  <td className="px-4 py-2 text-gray-400">
                                    {index + 1}
                                  </td>
                                  <td className="px-4 py-2">
                                    {typeof item.origin === "string"
                                      ? item.origin
                                      : typeof item.origin === "object" &&
                                          item.origin !== null
                                        ? item.origin.name ||
                                          (item.origin.lat
                                            ? `${item.origin.lat}, ${item.origin.lng}`
                                            : JSON.stringify(item.origin))
                                        : ""}
                                  </td>
                                  <td className="px-4 py-2">
                                    {typeof item.dest === "string"
                                      ? item.dest
                                      : typeof item.dest === "object" &&
                                          item.dest !== null
                                        ? item.dest.name ||
                                          (item.dest.lat
                                            ? `${item.dest.lat}, ${item.dest.lng}`
                                            : JSON.stringify(item.dest))
                                        : ""}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }}
                  />
                </div>
              )}

              {/* Info: (20260501 - Luphia) 報告內容區塊 */}
              {(isExporting || activeTab === "analysis") && (
                <div
                  ref={scrollTargetRef}
                  className="mt-10 transition-all duration-500 ease-in-out"
                >
                  {plan ? (
                    <div className="flex flex-col gap-8 pb-12">
                      {!isExporting && (
                        <div className="mt-4 mb-2 flex flex-wrap justify-center gap-3">
                          <button
                            onClick={() => toggleRoute("land")}
                            disabled={!plan || loading || !isLandAvailable}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                              !isLandAvailable
                                ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 line-through"
                                : loading
                                  ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-60"
                                  : selectedRoutes.has("land")
                                    ? "border-orange-200 bg-orange-50 text-orange-700"
                                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            <Truck className="h-4 w-4" />{" "}
                            {t(
                              "transportation_carbon_footprint_calculator.ui.land_route",
                            )}
                          </button>
                          {/* Info: (20260724 - Tzuhan) 需求一:國內/短程路線(適用性引擎判定)直接屏蔽海運選項,不以 disabled 呈現 */}
                          {routeApplicability.sea && (
                            <button
                              onClick={() => toggleRoute("sea")}
                              disabled={!plan || loading}
                              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                                loading
                                  ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-60"
                                  : selectedRoutes.has("sea")
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              <Ship className="h-4 w-4" />{" "}
                              {t(
                                "transportation_carbon_footprint_calculator.ui.sea_route",
                              )}
                            </button>
                          )}
                          {/* Info: (20260724 - Tzuhan) 空運選項同海運:不適用即屏蔽 */}
                          {routeApplicability.air && (
                            <button
                              onClick={() => toggleRoute("air")}
                              disabled={!plan || loading}
                              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                                loading
                                  ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-60"
                                  : selectedRoutes.has("air")
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              <Plane className="h-4 w-4" />{" "}
                              {t(
                                "transportation_carbon_footprint_calculator.ui.air_route",
                              )}
                            </button>
                          )}
                          {/* Info: (20260729 - Tzuhan) issue 10:海陸空聯運方案切換(不適用即屏蔽) */}
                          {routeApplicability.seaLandAir && (
                            <button
                              onClick={() => toggleRoute("seaLandAir")}
                              disabled={!plan || loading}
                              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                                loading
                                  ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-60"
                                  : selectedRoutes.has("seaLandAir")
                                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              <Layers className="h-4 w-4" />{" "}
                              {t(
                                "transportation_carbon_footprint_calculator.plan_section.title_sea_land_air",
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Info: (20260501 - Luphia) 根據選擇的路線，動態渲染 */}
                      {(() => {
                        // Info: (20260724 - Tzuhan) 僅渲染適用的方案(與匯出範圍同一判斷來源)
                        const routesToRender = (
                          ["land", "sea", "air", "seaLandAir"] as const
                        ).filter(
                          (type) =>
                            selectedRoutes.has(type) &&
                            routeApplicability[type],
                        );

                        const getModeName = (mode: string) =>
                          mode === "land"
                            ? t(
                                "transportation_carbon_footprint_calculator.pdf.mode_land",
                              )
                            : mode === "sea"
                              ? t(
                                  "transportation_carbon_footprint_calculator.pdf.mode_sea",
                                )
                              : mode === "seaLandAir"
                                ? t(
                                    "transportation_carbon_footprint_calculator.plan_section.title_sea_land_air",
                                  )
                                : t(
                                    "transportation_carbon_footprint_calculator.pdf.mode_air",
                                  );
                        const originName = origin.lat
                          ? `${origin.lat}, ${origin.lng}`
                          : t(
                              "transportation_carbon_footprint_calculator.pdf.origin",
                            );
                        const destName = dest.lat
                          ? `${dest.lat}, ${dest.lng}`
                          : t(
                              "transportation_carbon_footprint_calculator.pdf.dest",
                            );

                        return routesToRender.map((type, index) => (
                          <div
                            key={type}
                            id={`pdf-page-${type}`}
                            className={
                              isExporting ? "bg-transparent shadow-none" : ""
                            }
                          >
                            <ReportLayout
                              isPdfExport={isExporting}
                              hideFrameUnlessExport={true}
                              /* Info: (20260729 - Tzuhan) 標頭帶方案代碼 + 運輸模式(對應 CSV Plan Code 與檔名) */
                              badgeText={`${buildPlanCode(0, type)} · ${getModeName(type)}`}
                              footerType={isExporting ? "simple" : "none"}
                              footerTitle={t(
                                "transportation_carbon_footprint_calculator.pdf.footer",
                              )
                                .replace("{{current}}", String(index + 1))
                                .replace(
                                  "{{total}}",
                                  String(routesToRender.length),
                                )
                                .replace("{{origin}}", originName)
                                .replace("{{dest}}", destName)}
                              className={
                                isExporting
                                  ? "min-h-[1448px] justify-between rounded-none border-none bg-white shadow-none ring-0"
                                  : "border-none bg-transparent shadow-none ring-0"
                              }
                              contentClassName={isExporting ? "p-8" : "p-0"}
                            >
                              {/* Info: (20260501 - Luphia) PDF 專屬開頭區塊 */}
                              {isExporting && (
                                <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-gray-100 bg-gray-50/80 p-6">
                                  <div className="flex items-center gap-3">
                                    <div className="rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm">
                                      {type === "land" ? (
                                        <Truck className="h-6 w-6 text-orange-500" />
                                      ) : type === "sea" ? (
                                        <Ship className="h-6 w-6 text-emerald-500" />
                                      ) : type === "seaLandAir" ? (
                                        <Layers className="h-6 w-6 text-indigo-500" />
                                      ) : (
                                        <Plane className="h-6 w-6 text-blue-500" />
                                      )}
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                      {getModeName(type)}{" "}
                                      {t(
                                        "transportation_carbon_footprint_calculator.pdf.section_analysis",
                                      )}
                                    </h2>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-700">
                                    <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm sm:flex-none">
                                      <MapPin className="h-4 w-4 text-orange-500" />
                                      <span className="max-w-[200px] truncate">
                                        {originName}
                                      </span>
                                    </div>
                                    <ArrowRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
                                    <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm sm:flex-none">
                                      <MapPin className="h-4 w-4 text-emerald-500" />
                                      <span className="max-w-[200px] truncate">
                                        {destName}
                                      </span>
                                    </div>
                                    <div className="ml-auto flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
                                      <Weight className="h-4 w-4 text-blue-500" />
                                      <span>
                                        {t(
                                          "transportation_carbon_footprint_calculator.pdf.weight_label",
                                        ).replace(
                                          "{{weight}}",
                                          String(weightKg || 1000),
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <PlanSection
                                type={type as RouteType}
                                plan={plan}
                                weightKg={weightKg}
                                isExporting={isExporting}
                                mapRef={mapRefs[type as RouteType]}
                              />
                            </ReportLayout>
                            {!isExporting &&
                              index < routesToRender.length - 1 && (
                                <div className="my-4 w-full border-b-2 border-dashed border-gray-200"></div>
                              )}
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="mt-12 rounded-xl border border-dashed border-gray-100 bg-gray-50 py-24 text-center">
                      <Leaf className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                      <h3 className="font-medium text-gray-500">
                        {t(
                          "transportation_carbon_footprint_calculator.ui.not_generated",
                        )}
                      </h3>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <AuthPlaceholder
            title={t(
              "transportation_carbon_footprint_calculator.ui.login_to_use",
            )}
            buttonLabel={t("header.login")}
          />
        )}
      </div>
    </main>
  );
}
