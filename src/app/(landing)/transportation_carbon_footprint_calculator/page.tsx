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
} from "lucide-react";
import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ILogisticsPlan } from "@/interfaces/logistics";
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
import { BatchItemReport } from "@/components/transportation_carbon_footprint_calculator/batch_item_report";
import type { IMapViewerRef } from "@/components/transportation_carbon_footprint_calculator/map_viewer";
import { ReportLayout } from "@/components/common/report_layout";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import { useAuth } from "@/contexts/auth_context";
import AuthPlaceholder from "@/components/common/auth_placeholder";
import PaymentConfirmModal from "@/components/common/payment_confirm_modal";
import {
  useOrderTransaction,
  IOrderPayload,
} from "@/hooks/use_order_transaction";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";
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
  items?: Array<{ origin: string; dest: string }>;
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
    searchParams?.get("tab") === "history"
      ? "history"
      : searchParams?.get("tab") === "mileage"
        ? "mileage"
        : "analysis";

  const setActiveTab = useCallback(
    (tab: "analysis" | "history" | "mileage") => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("tab", tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
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
  const mapReadyResolver = useRef<(() => void) | null>(null);
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
    new Set(["land", "sea", "air"]),
  );

  const reportRef = useRef<HTMLDivElement>(null);
  const scrollTargetRef = useRef<HTMLDivElement>(null);
  const historyTableRef = useRef<HTMLDivElement>(null);

  // Info: (20260501 - Luphia) 建立各區段地圖的 Ref 供截圖使用 (優化：避免每次 render 重新產生物件)
  const landMapRef = useRef<IMapViewerRef>(null);
  const seaMapRef = useRef<IMapViewerRef>(null);
  const airMapRef = useRef<IMapViewerRef>(null);
  const mapRefs = useMemo(
    () => ({
      land: landMapRef,
      sea: seaMapRef,
      air: airMapRef,
    }),
    [],
  );

  // Info: (20260501 - Luphia) Fetch History (優化：包裝 useCallback 供 useEffect 穩定依賴)
  const fetchHistory = useCallback(async () => {
    try {
      const res = await request<{ payload: IHistoryItem[] }>(
        "/api/v1/user/analysis?category=TRANSPORTATION_CARBON_FOOTPRINT",
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

  const handleDownloadPDF = async () => {
    let originalViewport: string | null = null;
    let viewportMeta: Element | null = null;
    if (batchResults) {
      try {
        setIsExporting(true);

        viewportMeta = document.querySelector('meta[name="viewport"]');
        setExportingIndex(null);
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

        if (batchResults.length === 1) {
          setExportingIndex(0);
          await new Promise<void>((resolve) => {
            mapReadyResolver.current = resolve;
            setTimeout(resolve, 8000);
          });

          const pageEl = document.getElementById(`batch-report-item-0`);
          if (pageEl) {
            const dataUrl = await htmlToImage.toPng(pageEl, {
              quality: 0.95,
              pixelRatio: 2,
              style: { margin: "0", transform: "none" },
            });
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgProps = pdf.getImageProperties(dataUrl);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, imgHeight);
            pdf.save(
              `iSunFA_Logistics_Carbon_Report_${new Date().getTime()}.pdf`,
            );
          }
        } else {
          const zip = new JSZip();

          const csvRows = [
            `\uFEFF${t("common.origin")},${t("common.destination")},${t("transportation_carbon_footprint_calculator.mileage_calculator.csv_total_dist")},${t("transportation_carbon_footprint_calculator.mileage_calculator.csv_land_dist")},${t("transportation_carbon_footprint_calculator.mileage_calculator.csv_sea_dist")},${t("transportation_carbon_footprint_calculator.mileage_calculator.csv_air_dist")},${t("transportation_carbon_footprint_calculator.mileage_calculator.col_mode")},${t("transportation_carbon_footprint_calculator.mileage_calculator.csv_pdf_file")}`,
          ];

          for (let i = 0; i < batchResults.length; i++) {
            setExportingIndex(i);
            // Info: (20260511 - Luphia) Wait for the BatchItemReport to fully render and capture its internal MapViewers
            await new Promise<void>((resolve) => {
              mapReadyResolver.current = resolve;
              // Info: (20260511 - Luphia) Fallback timeout just in case WebGL or capture fails to respond
              setTimeout(resolve, 8000);
            });

            const item = batchResults[i];
            const pageEl = document.getElementById(`batch-report-item-${i}`);
            if (pageEl) {
              const dataUrl = await htmlToImage.toPng(pageEl, {
                quality: 0.95,
                pixelRatio: 2,
                style: { margin: "0", transform: "none" },
              });

              const pdf = new jsPDF("p", "mm", "a4");
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const imgProps = pdf.getImageProperties(dataUrl);
              const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

              pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, imgHeight);

              const filename = `route_${i + 1}.pdf`;
              zip.file(filename, pdf.output("blob"));
              csvRows.push(
                `${item.origin},${item.dest},${item.distanceKm || 0},${item.landDistanceKm || 0},${item.seaDistanceKm || 0},${item.airDistanceKm || 0},${item.mode},${filename}`,
              );
            }
          }

          zip.file("summary.csv", csvRows.join("\n"));
          const content = await zip.generateAsync({ type: "blob" });
          saveAs(content, `batch_report_${new Date().getTime()}.zip`);
        }
      } catch (err) {
        console.error("Export zip failed", err);
      } finally {
        if (viewportMeta && originalViewport !== null) {
          viewportMeta.setAttribute("content", originalViewport);
        }
        setIsExporting(false);
      }
      return;
    }

    // Info: (20260511 - Luphia) Default flow for single report
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

      const routesToExport = ["land", "sea", "air"].filter(
        (type) =>
          selectedRoutes.has(type as RouteType) &&
          (type !== "land" || isLandAvailable),
      );

      // Info: (20260501 - Luphia) 手動處理分頁
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < routesToExport.length; i++) {
        const routeType = routesToExport[i];
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

        if (currentMapRef.current && currentMapRef.current.captureMap) {
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

        const imgData = await htmlToImage.toJpeg(pageEl, {
          quality: 0.8,
          backgroundColor: "#ffffff",
          pixelRatio: 2,
        });

        // Info: (20260501 - Luphia) 還原 canvas
        if (targetCanvas && imgEl && imgEl.parentElement) {
          targetCanvas.style.display = originalCanvasDisplay;
          imgEl.parentElement.removeChild(imgEl);
        }

        pageEl.style.width = oldWidth;
        pageEl.style.maxWidth = oldMaxWidth;

        const elWidth = 1024;
        const elHeight = pageEl.offsetHeight;
        const imgHeightInMm = (elHeight * pdfWidth) / elWidth;

        if (i > 0) {
          pdf.addPage();
        }

        let heightLeft = imgHeightInMm;
        let position = 0;

        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeightInMm);
        heightLeft -= pdfHeight;

        // Info: (20260502 - Luphia) 避免浮點數誤差或 1 毫米的溢白邊產生無意義的整面空白頁
        while (heightLeft > 1) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeightInMm);
          heightLeft -= pdfHeight;
        }
      }

      // Info: (20260501 - Luphia) 還原 class
      originalClasses.forEach(({ el, className }) => {
        el.className = className;
      });

      const timestamp = new Date().getTime();
      pdf.save(`iSunFA_Logistics_Carbon_Report_${timestamp}.pdf`);
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
      setIsExporting(false);
    }
  };

  // Info: (20260430 - Tzuhan) 判斷是否真的有純陸運 (如果只是起終點直線 fallback，coordinates.length 會是 2，代表無真實陸地路徑)
  const isLandAvailable = useMemo(() => {
    if (!plan) return true;
    const land = plan.comparisonData?.plans?.landOnly;
    if (!land?.success) return false;
    if (
      land.geometry?.type === "LineString" &&
      land.geometry.coordinates.length <= 2
    ) {
      return false;
    }
    return true;
  }, [plan]);

  const isLocked = loading; // Info: (20260430 - Tzuhan) 只有在「運算中」才反灰，算完後重新開放輸入以便用戶微調再算一次

  const handleLoadHistory = async (item: IHistoryItem) => {
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
          setBatchResults(batchArray);
          setPlan(null);
          setActiveTab("mileage");
        } else {
          setPlan(parsed);
          setBatchResults(null);
          setActiveTab("analysis");
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
        return true;
      }
    } catch (err) {
      console.error("Failed to load history", err);
      setError("無法載入歷史報告");
    } finally {
      setLoading(false);
    }
    return false;
  };

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
      label: t("common.type", { defaultValue: "核算類型" }),
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
                {t("common.multiple_items", { defaultValue: "多筆清單" })} (
                {row.items?.length || 0})
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
                if (loaded) {
                  setTimeout(() => handleDownloadPDF(), 1000);
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

          <div className="mt-8 h-2 w-64 max-w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100">
            <div className="h-full w-full origin-left scale-x-50 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-orange-500"></div>
          </div>
        </div>
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
                      onDownload={handleDownloadPDF}
                      isExporting={isExporting}
                    />
                  ) : (
                    <MileageCalculator
                      onNavigateToHistory={() => setActiveTab("history")}
                    />
                  )}
                </div>
              )}

              {/* Info: (20260511 - Luphia) Render hidden batch items for PDF export sequentially to avoid WebGL context limits */}
              {isExporting &&
                batchResults &&
                exportingIndex !== null &&
                batchResults[exportingIndex] && (
                  <div className="absolute top-[-9999px] left-[-9999px] flex flex-col opacity-0">
                    <BatchItemReport
                      item={batchResults[exportingIndex]}
                      index={exportingIndex}
                      onMapsReady={handleMapsReady}
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
                                  <td className="px-4 py-2">{item.origin}</td>
                                  <td className="px-4 py-2">{item.dest}</td>
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
                        </div>
                      )}

                      {/* Info: (20260501 - Luphia) 根據選擇的路線，動態渲染 */}
                      {(() => {
                        const routesToRender = ["land", "sea", "air"].filter(
                          (type) =>
                            selectedRoutes.has(type as RouteType) &&
                            (type !== "land" || isLandAvailable),
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
                              badgeText={`${getModeName(type)} ${t("transportation_carbon_footprint_calculator.payment.fee_name")}`}
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
