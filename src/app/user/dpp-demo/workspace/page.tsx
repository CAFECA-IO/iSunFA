"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import {
  File,
  FileText,
  ChevronRight,
  Download,
  CheckCircle2,
  Shield,
  Search,
  Zap,
  AlertCircle,
  FilePlus,
  Loader2,
  UploadCloud,
  QrCode,
  Factory,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Tab = "sku" | "batch";
type ModuleState = "pending" | "scanning" | "found" | "missing" | "na";

interface IDppModule {
  id: number;
  name: string;
  state: ModuleState;
  mockFile?: string;
  missingDesc?: string;
}

interface IProductBomLite {
  productId: string;
  productName: string;
}

const getFileUrl = (path: string) =>
  `/api/dpp-demo/files?action=serve&path=${encodeURIComponent(path)}`;

const getModulesForProduct = (
  productId: string,
  stockId: string,
  year: string,
): IDppModule[] => {
  const basePath = `data/${stockId}/${year}/outputs`;
  return [
    {
      id: 1,
      name: "基本與製造商資訊",
      state: "pending",
      mockFile: `${basePath}/${stockId}_company_persona.html`,
    },
    {
      id: 2,
      name: "BOM 與前驅物構成",
      state: "pending",
      mockFile: `${basePath}/mock_sources/boms_and_precursors.json`,
    },
    {
      id: 3,
      name: "產品規格展開",
      state: "pending",
      mockFile: `${basePath}/mock_sources/product_specs.json`,
    },
    {
      id: 4,
      name: "DPP 核心真實數據演算",
      state: "pending",
      mockFile: `${basePath}/${productId}/mock_sources/${productId}_dpp_ground_truth.json`,
    },
    {
      id: 5,
      name: "產品工程圖繪製",
      state: "pending",
      missingDesc: "未發現此 SKU 的產品結構與設計藍圖",
    },
    {
      id: 6,
      name: "DPP 合規與驗證數據生成",
      state: "pending",
      missingDesc: "未發現此 SKU 的合規宣告與歐盟指令驗證文件",
    },
    {
      id: 7,
      name: "生產批次",
      state: "na",
      missingDesc: "將於批次生產階段動態處理",
    },
  ];
};

type PublishedPassport = {
  id: string; // Info: (20260608 - Tzuhan) did
  batchId: string;
  date: string;
  productId: string;
  pdfPath: string;
};

export default function DppWorkspacePage() {
  const [activeTab, setActiveTab] = useState<Tab>("sku");
  const [toastMsg, setToastMsg] = useState("");

  // Info: (20260608 - Tzuhan) Product Selection
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");

  // Info: (20260608 - Tzuhan) Options (Mock data context)
  const stockId = "2066";
  const [year, setYear] = useState("2024");
  const [availableYears, setAvailableYears] = useState<string[]>(["2024"]);
  // Info: (20260608 - Tzuhan) Static basePath pointing to raw data dir
  const basePath = `data/${stockId}/${year}/outputs`;

  // Info: (20260608 - Tzuhan) SKU Audit State
  const [modules, setModules] = useState<IDppModule[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [skuReady, setSkuReady] = useState(false);

  // Info: (20260608 - Tzuhan) Viewer State (SKU Tab)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>("");
  const [isTextLoading, setIsTextLoading] = useState(false);

  // Info: (20260608 - Tzuhan) Batch Production State
  const [batchId, setBatchId] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [facility, setFacility] = useState("");
  const [snRange, setSnRange] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Info: (20260608 - Tzuhan) Passports List
  const [publishedPassports, setPublishedPassports] = useState<
    PublishedPassport[]
  >([]);
  const [selectedPassport, setSelectedPassport] =
    useState<PublishedPassport | null>(null);

  // Info: (20260608 - Tzuhan) Fetch available products dynamically
  useEffect(() => {
    fetch(
      getFileUrl(
        `data/${stockId}/${year}/outputs/mock_sources/boms_and_precursors.json`,
      ),
    )
      .then((res) => res.json())
      .then((data) => {
        if (data && data.products) {
          const parsedProducts = data.products.map((p: IProductBomLite) => ({
            id: p.productId,
            name: p.productName,
          }));
          setProducts(parsedProducts);
          if (parsedProducts.length > 0) {
            setSelectedProductId(parsedProducts[0].id);
          }
        }
      })
      .catch(() => {
        setProducts([]);
        setSelectedProductId("");
      });
  }, [stockId, year]);

  // Info: (20260608 - Tzuhan) Handle Product Change
  useEffect(() => {
    if (selectedProductId) {
      setModules(getModulesForProduct(selectedProductId, stockId, year));
    } else {
      setModules([]);
    }
    setScanComplete(false);
    setSkuReady(false);
    setSelectedFilePath(null);
    setSelectedPassport(null);
    setActiveTab("sku");
  }, [selectedProductId, stockId, year]);

  // Info: (20260608 - Tzuhan) Fetch available years
  useEffect(() => {
    fetch("/api/dpp-demo/options")
      .then((res) => res.json())
      .then((data) => {
        if (data && data[stockId] && data[stockId].length > 0) {
          const sortedYears = data[stockId].sort();
          setAvailableYears(sortedYears);
          setYear((prev) =>
            sortedYears.includes(prev) ? prev : sortedYears[0],
          );
        }
      })
      .catch((err) => console.error("Failed to load options", err));
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanComplete(false);
    setSelectedFilePath(null);

    // Info: (20260608 - Tzuhan) Reset to pending
    let currentModules = getModulesForProduct(selectedProductId, stockId, year);
    setModules(currentModules);

    // Info: (20260608 - Tzuhan) Simulate progressive scanning
    for (let i = 0; i < currentModules.length; i++) {
      if (currentModules[i].state === "na") continue;

      currentModules = [...currentModules];
      currentModules[i].state = "scanning";
      setModules(currentModules);

      await new Promise((r) => setTimeout(r, 500));

      currentModules = [...currentModules];
      currentModules[i].state = [5, 6].includes(currentModules[i].id)
        ? "missing"
        : "found";
      setModules(currentModules);
    }

    setIsScanning(false);
    setScanComplete(true);
    showToast("AI 稽核完成，偵測到合規資料缺漏！");
  };

  const handleFixMissing = async () => {
    showToast("模擬補傳文件中...");
    await new Promise((r) => setTimeout(r, 1500));
    const fixed = modules.map((m) => {
      const t = Date.now();
      if (m.id === 5)
        return {
          ...m,
          state: "found" as ModuleState,
          mockFile: `${basePath}/${selectedProductId}/mock_sources/fastener_blueprint.png?t=${t}`,
        };
      if (m.id === 6)
        return {
          ...m,
          state: "found" as ModuleState,
          mockFile: `${basePath}/${selectedProductId}/mock_sources/${selectedProductId}_dpp_compliance_declaration.md?t=${t}`,
        };
      return m;
    });
    setModules(fixed);
    setSkuReady(true);
    showToast("資料已全數補齊！SKU 合規標章已發布。");
  };

  const handleAutoFill = () => {
    setBatchId(
      `BAT-${year}-Q3-${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")}`,
    );
    setMfgDate(`${year}-08-15`);
    setFacility("桃園龜山一廠");
    setSnRange("SN00100 - SN00500");
    showToast(`已自動填寫 ${year} 年度模擬生產資料`);
  };

  const handlePublishBatch = async () => {
    if (!batchId || !mfgDate || !facility || !snRange) {
      showToast("請填寫所有批次必填欄位");
      return;
    }
    setIsPublishing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsPublishing(false);

    const newPassport: PublishedPassport = {
      id: `did:isunfa:dpp:batch:0x${Math.random().toString(16).substring(2, 10)}`,
      batchId,
      date: new Date().toLocaleString(),
      productId: selectedProductId,
      pdfPath: `${basePath}/${selectedProductId}/mock_sources/${selectedProductId}_dpp_compliance_declaration.md`,
    };

    setPublishedPassports([newPassport, ...publishedPassports]);
    setSelectedPassport(newPassport);
    setBatchId("");
    showToast("批次數位護照已成功上鏈發佈！");
  };

  // Info: (20260608 - Tzuhan) Viewer Effect
  useEffect(() => {
    if (!selectedFilePath) return;
    if (selectedFilePath.match(/\.(csv|json|md|txt)$/i)) {
      setIsTextLoading(true);
      fetch(getFileUrl(selectedFilePath))
        .then((res) => res.text())
        .then((text) => {
          setTextContent(text);
          setIsTextLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setTextContent("Failed to load file content.");
          setIsTextLoading(false);
        });
    }
  }, [selectedFilePath]);

  const preprocessMarkdown = (md: string) => {
    return md.replace(/<img\s+src="([^"]+)"[^>]*>/g, (match, src) => {
      const cleanSrc = src.replace(/\s+/g, "");
      return `![image](${cleanSrc})`;
    });
  };

  const parseCsvRow = (str: string) => {
    const result = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '"') {
        inQuotes = !inQuotes;
      } else if (str[i] === "," && !inQuotes) {
        result.push(cell);
        cell = "";
      } else {
        cell += str[i];
      }
    }
    result.push(cell);
    return result;
  };

  const renderCsvTable = (csvText: string) => {
    const lines = csvText.trim().split("\n");
    if (lines.length === 0) return null;
    const rows = lines.map((line) => parseCsvRow(line.trim()));
    const header = rows[0];
    const body = rows.slice(1);

    return (
      <div className="w-full">
        <table className="w-full text-left text-sm whitespace-nowrap text-slate-600">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold text-slate-700 uppercase">
            <tr>
              {header.map((col, i) => (
                <th key={i} className="border-b border-gray-200 px-4 py-3">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 transition-colors hover:bg-slate-50"
              >
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderStateBadge = (state: ModuleState) => {
    switch (state) {
      case "pending":
        return (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            待解析
          </span>
        );
      case "scanning":
        return (
          <span className="animate-pulse rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">
            解析中...
          </span>
        );
      case "found":
        return (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            已偵測
          </span>
        );
      case "missing":
        return (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
            未發現
          </span>
        );
      case "na":
        return (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
            N/A
          </span>
        );
    }
  };

  const missingModules = modules.filter((m) => m.state === "missing");

  return (
    <div className="relative flex h-[calc(100vh-100px)] w-full flex-col gap-5 pb-4 font-sans">
      {/* Info: (20260608 - Tzuhan) Toast Notification */}
      {toastMsg && (
        <div className="animate-in fade-in slide-in-from-top-5 fixed top-24 right-8 z-50 flex items-center rounded-xl bg-emerald-500 px-5 py-3 text-white shadow-lg">
          <CheckCircle2 className="mr-3 h-5 w-5" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Info: (20260608 - Tzuhan) Page Header & Tabs */}
      <div className="flex flex-shrink-0 flex-col rounded-2xl border border-gray-200 bg-white px-6 pt-5 pb-0 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                AI SKU 稽核與批次自動化中心
              </h1>
              <p className="mt-0.5 text-sm text-gray-500">
                先定義產品基因（SKU）並透過 AI
                檢驗合規性，再極速發佈產品批次（Batch）護照。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-start">
              <span className="mb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Target Enterprise
              </span>
              <div className="flex h-9 cursor-not-allowed items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 shadow-sm">
                2066 世德工業
              </div>
            </div>
            <div className="flex flex-col items-start">
              <span className="mb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Year
              </span>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="relative h-9 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white bg-[length:1em_1em] bg-[right_0.5rem_center] bg-no-repeat px-3 pr-8 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                }}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col items-start">
              <span className="mb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Select Product SKU
              </span>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="relative h-9 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white bg-[length:1em_1em] bg-[right_0.5rem_center] bg-no-repeat px-3 pr-8 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                }}
              >
                {products.length === 0 && (
                  <option value="">載入中或無資料...</option>
                )}
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-2 flex gap-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("sku")}
            className={`border-b-2 px-1 pb-3 text-sm font-bold transition-all ${activeTab === "sku" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Phase 1: SKU 基石建立
          </button>
          <button
            onClick={() => setActiveTab("batch")}
            className={`border-b-2 px-1 pb-3 text-sm font-bold transition-all ${activeTab === "batch" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"} ${!skuReady && "cursor-not-allowed opacity-50"}`}
            disabled={!skuReady}
          >
            Phase 2: 批次生產發佈
          </button>
        </div>
      </div>

      {/* Info: (20260608 - Tzuhan) Workspace Area */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 lg:flex-row">
        {activeTab === "sku" && (
          <>
            {/* Info: (20260608 - Tzuhan) Left: AI Chapter Detector */}
            <div className="flex h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:w-[380px]">
              <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-gray-200 bg-slate-50/80 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                    Chapter Detector
                  </span>
                  {skuReady && (
                    <span className="flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> SKU READY
                    </span>
                  )}
                </div>
                {!scanComplete && !isScanning && (
                  <button
                    onClick={handleStartScan}
                    className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    <UploadCloud className="mr-2 h-4 w-4" /> 模擬拖曳上傳並開始
                    AI 稽核
                  </button>
                )}
                {isScanning && (
                  <button
                    disabled
                    className="flex w-full items-center justify-center rounded-lg bg-blue-50 py-2 text-sm font-medium text-blue-600 shadow-sm"
                  >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI
                    深度掃描中...
                  </button>
                )}
                {scanComplete && !skuReady && (
                  <button
                    onClick={handleFixMissing}
                    className="flex w-full animate-pulse items-center justify-center rounded-lg bg-slate-800 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-900"
                  >
                    <FilePlus className="mr-2 h-4 w-4" /> 模擬補件
                    (上傳缺失手冊)
                  </button>
                )}
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
                {modules.map((mod) => (
                  <div
                    key={mod.id}
                    onClick={() =>
                      mod.state === "found" &&
                      mod.mockFile &&
                      setSelectedFilePath(mod.mockFile)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (mod.state === "found" && mod.mockFile)
                          setSelectedFilePath(mod.mockFile);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`mb-1 flex items-start rounded-xl border p-3 ${mod.state === "found" ? "cursor-pointer border-transparent hover:border-blue-100 hover:bg-blue-50" : "border-transparent opacity-70"}`}
                  >
                    <div className="mt-0.5 mr-3">
                      {mod.state === "found" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : mod.state === "missing" ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : mod.state === "scanning" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-slate-200" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-semibold ${mod.state === "missing" ? "text-red-700" : "text-slate-700"}`}
                        >
                          {mod.id}. {mod.name}
                        </span>
                        {renderStateBadge(mod.state)}
                      </div>
                      {mod.state === "missing" && (
                        <p className="mt-1 text-xs text-red-500">
                          {mod.missingDesc}
                        </p>
                      )}
                      {mod.state === "na" && (
                        <p className="mt-1 text-xs text-slate-400">
                          {mod.missingDesc}
                        </p>
                      )}
                      {mod.state === "found" && (
                        <p className="mt-1 flex items-center text-xs text-slate-400">
                          <File className="mr-1 h-3 w-3" /> 點擊檢視來源檔案
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info: (20260608 - Tzuhan) Right: Gap Analysis / Viewer */}
            <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {missingModules.length > 0 && !selectedFilePath ? (
                <div className="flex flex-1 flex-col bg-red-50/30 p-8">
                  <div className="mb-6 flex items-center text-red-600">
                    <AlertCircle className="mr-3 h-8 w-8" />
                    <h2 className="text-2xl font-bold">
                      Gap Analysis Dashboard
                    </h2>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 font-bold text-red-800">
                      SKU 合規缺失清單
                    </h3>
                    <ul className="space-y-4">
                      {missingModules.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-start rounded-lg border border-red-100 bg-red-50 p-4"
                        >
                          <span className="mr-3 flex h-6 w-6 items-center justify-center rounded bg-red-100 text-xs font-bold text-red-700">
                            {m.id}
                          </span>
                          <div>
                            <p className="font-semibold text-red-900">
                              {m.name}
                            </p>
                            <p className="mt-1 text-sm text-red-700">
                              {m.missingDesc}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 border-t border-red-100 pt-4 text-sm text-slate-500">
                      請透過左側「模擬補件」按鈕上傳對應資料，以解鎖 SKU
                      Readiness Seal。
                    </p>
                  </div>
                </div>
              ) : selectedFilePath ? (
                <div className="flex h-full flex-1 flex-col">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-slate-50/80 p-4 backdrop-blur-sm">
                    <div className="flex items-center text-sm font-medium text-slate-700">
                      <File className="mr-2 h-4 w-4 text-slate-400" />
                      {selectedFilePath.split("/").pop()}
                    </div>
                    <button
                      onClick={() => setSelectedFilePath(null)}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      關閉預覽
                    </button>
                  </div>
                  <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-100 p-6">
                    {selectedFilePath.split("?")[0].match(/\.(pdf|html)$/i) ? (
                      <iframe
                        src={getFileUrl(selectedFilePath)}
                        title="Preview"
                        className="h-full w-full rounded-xl border border-gray-200 bg-white shadow-sm"
                      />
                    ) : selectedFilePath
                        .split("?")[0]
                        .match(/\.(png|jpg|jpeg)$/i) ? (
                      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <Image
                          src={getFileUrl(selectedFilePath)}
                          alt="preview"
                          fill
                          style={{ objectFit: "contain" }}
                          unoptimized
                        />
                      </div>
                    ) : selectedFilePath.split("?")[0].match(/\.md$/i) ? (
                      <div className="custom-scrollbar h-full w-full overflow-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
                        {isTextLoading ? (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            Loading content...
                          </div>
                        ) : (
                          <article className="prose prose-slate prose-sm sm:prose-base mx-auto w-full max-w-4xl break-words">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {preprocessMarkdown(textContent)}
                            </ReactMarkdown>
                          </article>
                        )}
                      </div>
                    ) : selectedFilePath
                        .split("?")[0]
                        .match(/\.(csv|json|txt)$/i) ? (
                      <div
                        className={`custom-scrollbar h-full w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm ${selectedFilePath.split("?")[0].endsWith(".csv") ? "p-0" : "p-6 font-mono text-sm whitespace-pre text-slate-700"}`}
                      >
                        {isTextLoading ? (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            Loading content...
                          </div>
                        ) : selectedFilePath.split("?")[0].endsWith(".csv") ? (
                          renderCsvTable(textContent)
                        ) : (
                          textContent
                        )}
                      </div>
                    ) : (
                      <iframe
                        src={getFileUrl(selectedFilePath)}
                        title="Fallback Preview"
                        className="h-full w-full rounded-xl border border-gray-200 bg-white shadow-sm"
                      />
                    )}
                  </div>
                </div>
              ) : skuReady ? (
                <div className="flex flex-1 flex-col items-center justify-center bg-emerald-50/30 p-8">
                  <div className="relative mb-6 flex h-32 w-32 items-center justify-center rounded-full border-4 border-emerald-100 bg-white shadow-lg">
                    <div className="absolute inset-0 animate-ping rounded-full border-4 border-emerald-400 opacity-20"></div>
                    <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                  </div>
                  <h2 className="mb-2 text-3xl font-bold text-emerald-800">
                    SKU Readiness Seal
                  </h2>
                  <p className="mb-8 font-medium text-emerald-600">
                    此產品之靜態合規資料已全數驗證通過
                  </p>
                  <button
                    onClick={() => setActiveTab("batch")}
                    className="flex items-center rounded-xl bg-emerald-600 px-8 py-3 text-lg font-bold text-white shadow-md transition-colors hover:bg-emerald-700"
                  >
                    前往批次發佈階段 <ChevronRight className="ml-2 h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/50 p-8 text-center text-slate-500">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-slate-100 shadow-inner">
                    <Search className="h-10 w-10 text-slate-400" />
                  </div>
                  <p className="mb-2 text-xl font-bold text-slate-700">
                    等待 AI 解析
                  </p>
                  <p className="max-w-sm text-sm text-slate-500">
                    請點擊左側開始進行文件稽核。Smart Viewer
                    將在此處顯示稽核結果或檔案預覽。
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "batch" && (
          <>
            {/* Info: (20260608 - Tzuhan) Left: Form and List */}
            <div className="flex h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:w-[450px]">
              <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto p-6">
                <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center">
                    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                      <Factory className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">
                      批次發佈
                    </h2>
                  </div>
                  <button
                    onClick={handleAutoFill}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 shadow-sm transition-colors hover:bg-emerald-100"
                  >
                    一鍵填寫
                  </button>
                </div>

                <div className="mb-6 space-y-4">
                  <div>
                    <label
                      htmlFor="sku-display"
                      className="mb-1 block text-xs font-bold text-slate-700"
                    >
                      指定已稽核 SKU
                    </label>
                    <div
                      id="sku-display"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-500"
                    >
                      {products.find((p) => p.id === selectedProductId)?.name}{" "}
                      (Ready for Passport)
                    </div>
                    <p className="mt-1 flex items-center text-[10px] text-emerald-600">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> 已繼承 5
                      項靜態合規與技術文件
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="batchId"
                      className="mb-1 block text-xs font-bold text-slate-700"
                    >
                      批次編號 (Batch ID)
                    </label>
                    <input
                      id="batchId"
                      type="text"
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      placeholder="例：BAT-2025-08X"
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="mfgDate"
                        className="mb-1 block text-xs font-bold text-slate-700"
                      >
                        生產日期
                      </label>
                      <input
                        id="mfgDate"
                        type="date"
                        value={mfgDate}
                        onChange={(e) => setMfgDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="facility"
                        className="mb-1 block text-xs font-bold text-slate-700"
                      >
                        產地設施
                      </label>
                      <input
                        id="facility"
                        type="text"
                        value={facility}
                        onChange={(e) => setFacility(e.target.value)}
                        placeholder="例：桃園龜山一廠"
                        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="snRange"
                      className="mb-1 block text-xs font-bold text-slate-700"
                    >
                      產品序號範圍 (SN Range)
                    </label>
                    <input
                      id="snRange"
                      type="text"
                      value={snRange}
                      onChange={(e) => setSnRange(e.target.value)}
                      placeholder="例：SN001 - SN500"
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handlePublishBatch}
                  disabled={isPublishing}
                  className="mb-8 flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-70"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      合成與上鏈中...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" /> 一鍵發佈數位護照
                    </>
                  )}
                </button>

                <h3 className="mb-3 border-b border-slate-100 pb-2 text-sm font-bold text-slate-800">
                  已發佈護照列表
                </h3>
                {publishedPassports.filter(
                  (p) => p.productId === selectedProductId,
                ).length === 0 ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-6 text-center text-xs text-slate-400">
                    尚未發佈任何護照
                  </div>
                ) : (
                  <div className="space-y-2">
                    {publishedPassports
                      .filter((p) => p.productId === selectedProductId)
                      .map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPassport(p)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedPassport(p);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className={`cursor-pointer rounded-xl border p-3 transition-colors ${selectedPassport?.id === p.id ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-bold text-emerald-800">
                              {p.batchId}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {p.date.split(" ")[0]}
                            </span>
                          </div>
                          <p className="rounded border border-slate-100 bg-white px-2 py-1 text-[10px] break-all text-slate-500">
                            {p.id}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Info: (20260608 - Tzuhan) Right: Passport Viewer */}
            <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-slate-100 shadow-sm">
              {selectedPassport ? (
                <div className="flex h-full flex-1 flex-col">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-3 backdrop-blur-sm">
                    <div className="flex items-center text-sm font-bold text-slate-800">
                      <FileText className="mr-2 h-5 w-5 text-emerald-600" />
                      護照發布預覽 ({selectedPassport.batchId})
                    </div>
                    <a
                      href={selectedPassport.pdfPath}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Download className="mr-1 h-3 w-3" /> 獨立頁面開啟
                    </a>
                  </div>
                  <div className="flex-1 overflow-hidden bg-slate-200 p-0">
                    <iframe
                      src={getFileUrl(selectedPassport.pdfPath)}
                      title="Passport Preview"
                      className="h-full w-full border-0 bg-white shadow-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/50 p-8 text-center text-slate-500">
                  <QrCode className="mb-4 h-16 w-16 text-slate-300" />
                  <p className="text-lg font-bold text-slate-600">
                    選擇左側護照以進行預覽
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    護照發佈後，將呈現所有已掛載的 SKU 資料與生產批次資訊。
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
