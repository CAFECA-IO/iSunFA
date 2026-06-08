"use client";

import { useState, useEffect } from "react";
import { Folder, File, FileText, Image as ImageIcon, ChevronRight, ChevronDown, Download, CheckCircle2, Shield, Search, Zap, AlertCircle, FilePlus, Loader2, UploadCloud, QrCode, Factory, PackageOpen } from "lucide-react";

type Tab = "sku" | "batch";
type ModuleState = "pending" | "scanning" | "found" | "missing" | "na";

interface DppModule {
  id: number;
  name: string;
  state: ModuleState;
  mockFile?: string;
  missingDesc?: string;
}

const PRODUCTS = [
  { id: "P-CS-BS-003", name: "產品 A (球狀螺栓)" },
  { id: "P-M10-BN-002", name: "產品 B (法蘭螺帽)" },
  { id: "P-M12-EH-001", name: "產品 C (六角螺栓)" },
];

const getModulesForProduct = (productId: string, stockId: string, year: string): DppModule[] => {
  const basePath = `data/${stockId}/${year}/outputs/e2e_roadmap-sprint1`;
  return [
    // Info: (20260608 - Tzuhan)
    { id: 1, name: "基本與製造商資訊", state: "pending", mockFile: `${basePath}/${stockId}_company_persona.html` },
    { id: 2, name: "供應鏈溯源", state: "pending", mockFile: `${basePath}/system_ingestion/mes_work_orders.csv` },
    { id: 3, name: "物質與成分構成", state: "pending", mockFile: `${basePath}/mock_sources/boms_and_precursors.csv` },
    { id: 4, name: "專業技術手冊", state: "pending", missingDesc: "所有上傳文件中皆未發現電路圖與維修拆解指南" },
    { id: 5, name: "合規稽核", state: "pending", missingDesc: "RoHS 報告已過期 (2022年)，且缺乏 CE 測試報告" },
    { id: 6, name: "生產批次", state: "na", missingDesc: "將於批次生產階段動態處理" },
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
  const [selectedProductId, setSelectedProductId] = useState(PRODUCTS[0].id);

  // Info: (20260608 - Tzuhan) Options (Mock data context)
  const stockId = "2066";
  const [year, setYear] = useState("2024");
  const [availableYears, setAvailableYears] = useState<string[]>(["2024"]);
  const basePath = `data/${stockId}/${year}/outputs/e2e_roadmap-sprint1`;

  // Info: (20260608 - Tzuhan) SKU Audit State
  const [modules, setModules] = useState<DppModule[]>(getModulesForProduct(PRODUCTS[0].id, stockId, year));
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
  const [publishedPassports, setPublishedPassports] = useState<PublishedPassport[]>([]);
  const [selectedPassport, setSelectedPassport] = useState<PublishedPassport | null>(null);

  // Info: (20260608 - Tzuhan) Handle Product Change
  useEffect(() => {
    setModules(getModulesForProduct(selectedProductId, stockId, year));
    setScanComplete(false);
    setSkuReady(false);
    setSelectedFilePath(null);
    setSelectedPassport(null);
    setActiveTab("sku");
  }, [selectedProductId, year]);

  // Info: (20260608 - Tzuhan) Fetch available years
  useEffect(() => {
    fetch('/api/dpp-demo/options')
      .then(res => res.json())
      .then(data => {
        if (data && data[stockId] && data[stockId].length > 0) {
          const sortedYears = data[stockId].sort();
          setAvailableYears(sortedYears);
          setYear(prev => sortedYears.includes(prev) ? prev : sortedYears[0]);
        }
      })
      .catch(err => console.error("Failed to load options", err));
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

      await new Promise(r => setTimeout(r, 500));

      currentModules = [...currentModules];
      currentModules[i].state = [4, 5].includes(currentModules[i].id) ? "missing" : "found";
      setModules(currentModules);
    }

    setIsScanning(false);
    setScanComplete(true);
    showToast("AI 稽核完成，偵測到合規資料缺漏！");
  };

  const handleFixMissing = async () => {
    showToast("模擬補傳文件中...");
    await new Promise(r => setTimeout(r, 1500));
    const fixed = modules.map(m => {
      if (m.id === 4) return { ...m, state: "found" as ModuleState, mockFile: `${basePath}/${selectedProductId}/mock_sources/fastener_blueprint.png` };
      if (m.id === 5) return { ...m, state: "found" as ModuleState, mockFile: `${basePath}/${selectedProductId}/system_ingestion/${selectedProductId}_dpp_compliance_declaration.pdf` };
      return m;
    });
    setModules(fixed);
    setSkuReady(true);
    showToast("資料已全數補齊！SKU 合規標章已發布。");
  };

  const handleAutoFill = () => {
    setBatchId(`BAT-${year}-Q3-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
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
    await new Promise(r => setTimeout(r, 2000));
    setIsPublishing(false);

    const newPassport: PublishedPassport = {
      id: `did:isunfa:dpp:batch:0x${Math.random().toString(16).substring(2, 10)}`,
      batchId,
      date: new Date().toLocaleString(),
      productId: selectedProductId,
      pdfPath: `${basePath}/${selectedProductId}/system_ingestion/${selectedProductId}_dpp_ground_truth_dashboard.html`
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
      fetch(`/api/dpp-demo/files?action=serve&path=${encodeURIComponent(selectedFilePath)}`)
        .then(res => res.text())
        .then(text => {
          setTextContent(text);
          setIsTextLoading(false);
        })
        .catch(err => {
          console.error(err);
          setTextContent("Failed to load file content.");
          setIsTextLoading(false);
        });
    }
  }, [selectedFilePath]);

  const parseCsvRow = (str: string) => {
    const result = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '"') {
        inQuotes = !inQuotes;
      } else if (str[i] === ',' && !inQuotes) {
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
    const rows = lines.map(line => parseCsvRow(line.trim()));
    const header = rows[0];
    const body = rows.slice(1);

    return (
      <div className="w-full">
        <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs sticky top-0 z-10">
            <tr>
              {header.map((col, i) => (
                <th key={i} className="px-4 py-3 border-b border-gray-200">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3">{cell}</td>
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
      case "pending": return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">待解析</span>;
      case "scanning": return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold animate-pulse">解析中...</span>;
      case "found": return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">已偵測</span>;
      case "missing": return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">未發現</span>;
      case "na": return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 text-[10px] font-bold">N/A</span>;
    }
  };

  const missingModules = modules.filter(m => m.state === "missing");

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] w-full gap-5 pb-4 font-sans relative">

      {/* Info: (20260608 - Tzuhan) Toast Notification */}
      {toastMsg && (
        <div className="fixed top-24 right-8 bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center animate-in fade-in slide-in-from-top-5 z-50">
          <CheckCircle2 className="w-5 h-5 mr-3" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Info: (20260608 - Tzuhan) Page Header & Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 pt-5 pb-0 flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mr-4">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI SKU 稽核與批次自動化中心</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                先定義產品基因（SKU）並透過 AI 檢驗合規性，再極速發佈產品批次（Batch）護照。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Enterprise</span>
              <div className="h-9 px-3 flex items-center bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold border border-slate-200 shadow-sm cursor-not-allowed">
                2066 世德工業
              </div>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Year</span>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                className="h-9 px-3 bg-white text-slate-800 rounded-lg text-sm font-semibold border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-sm appearance-none outline-none pr-8 relative bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")` }}
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Product SKU</span>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="h-9 px-3 bg-white text-slate-800 rounded-lg text-sm font-semibold border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-sm appearance-none outline-none pr-8 relative bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")` }}
              >
                {PRODUCTS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-8 border-b border-gray-200 mt-2">
          <button
            onClick={() => setActiveTab("sku")}
            className={`pb-3 px-1 text-sm font-bold transition-all border-b-2 ${activeTab === "sku" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Phase 1: SKU 基石建立
          </button>
          <button
            onClick={() => setActiveTab("batch")}
            className={`pb-3 px-1 text-sm font-bold transition-all border-b-2 ${activeTab === "batch" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"} ${!skuReady && "opacity-50 cursor-not-allowed"}`}
            disabled={!skuReady}
          >
            Phase 2: 批次生產發佈
          </button>
        </div>
      </div>

      {/* Info: (20260608 - Tzuhan) Workspace Area */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">

        {activeTab === "sku" && (
          <>
            {/* Info: (20260608 - Tzuhan) Left: AI Chapter Detector */}
            <div className="w-full lg:w-[380px] flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
              <div className="p-4 bg-slate-50/80 border-b border-gray-200 flex flex-col gap-3 sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Chapter Detector</span>
                  {skuReady && <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1" /> SKU READY</span>}
                </div>
                {!scanComplete && !isScanning && (
                  <button onClick={handleStartScan} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm shadow-sm flex items-center justify-center transition-colors">
                    <UploadCloud className="w-4 h-4 mr-2" /> 模擬拖曳上傳並開始 AI 稽核
                  </button>
                )}
                {isScanning && (
                  <button disabled className="w-full bg-blue-50 text-blue-600 font-medium py-2 rounded-lg text-sm shadow-sm flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI 深度掃描中...
                  </button>
                )}
                {scanComplete && !skuReady && (
                  <button onClick={handleFixMissing} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg text-sm shadow-sm flex items-center justify-center transition-colors animate-pulse">
                    <FilePlus className="w-4 h-4 mr-2" /> 模擬補件 (上傳缺失手冊)
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar p-2">
                {modules.map(mod => (
                  <div
                    key={mod.id}
                    onClick={() => mod.state === "found" && mod.mockFile && setSelectedFilePath(mod.mockFile)}
                    className={`flex items-start p-3 mb-1 rounded-xl border ${mod.state === "found" ? "cursor-pointer hover:bg-blue-50 border-transparent hover:border-blue-100" : "border-transparent opacity-70"}`}
                  >
                    <div className="mt-0.5 mr-3">
                      {mod.state === "found" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                        mod.state === "missing" ? <AlertCircle className="w-5 h-5 text-red-500" /> :
                          mod.state === "scanning" ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> :
                            <div className="w-5 h-5 rounded-full border-2 border-slate-200" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${mod.state === "missing" ? "text-red-700" : "text-slate-700"}`}>
                          {mod.id}. {mod.name}
                        </span>
                        {renderStateBadge(mod.state)}
                      </div>
                      {mod.state === "missing" && <p className="text-xs text-red-500 mt-1">{mod.missingDesc}</p>}
                      {mod.state === "na" && <p className="text-xs text-slate-400 mt-1">{mod.missingDesc}</p>}
                      {mod.state === "found" && <p className="text-xs text-slate-400 mt-1 flex items-center"><File className="w-3 h-3 mr-1" /> 點擊檢視來源檔案</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info: (20260608 - Tzuhan) Right: Gap Analysis / Viewer */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden relative">
              {missingModules.length > 0 && !selectedFilePath ? (
                <div className="flex-1 flex flex-col p-8 bg-red-50/30">
                  <div className="flex items-center text-red-600 mb-6">
                    <AlertCircle className="w-8 h-8 mr-3" />
                    <h2 className="text-2xl font-bold">Gap Analysis Dashboard</h2>
                  </div>
                  <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm">
                    <h3 className="font-bold text-red-800 mb-4">SKU 合規缺失清單</h3>
                    <ul className="space-y-4">
                      {missingModules.map(m => (
                        <li key={m.id} className="flex items-start bg-red-50 p-4 rounded-lg border border-red-100">
                          <span className="w-6 h-6 bg-red-100 text-red-700 font-bold rounded flex items-center justify-center text-xs mr-3">{m.id}</span>
                          <div>
                            <p className="font-semibold text-red-900">{m.name}</p>
                            <p className="text-sm text-red-700 mt-1">{m.missingDesc}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-slate-500 mt-6 pt-4 border-t border-red-100">請透過左側「模擬補件」按鈕上傳對應資料，以解鎖 SKU Readiness Seal。</p>
                  </div>
                </div>
              ) : selectedFilePath ? (
                <div className="flex-1 flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                    <div className="flex items-center text-slate-700 text-sm font-medium">
                      <File className="w-4 h-4 mr-2 text-slate-400" />
                      {selectedFilePath.split('/').pop()}
                    </div>
                    <button onClick={() => setSelectedFilePath(null)} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1 bg-white border border-slate-200 rounded-md">
                      關閉預覽
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden p-6 bg-slate-100 flex items-center justify-center relative">
                    {selectedFilePath.match(/\.(pdf|html)$/i) ? (
                      <iframe src={`/api/dpp-demo/files?action=serve&path=${encodeURIComponent(selectedFilePath)}`} className="w-full h-full rounded-xl shadow-sm border border-gray-200 bg-white" />
                    ) : selectedFilePath.match(/\.(png|jpg|jpeg)$/i) ? (
                      <div className="w-full h-full rounded-xl shadow-sm border border-gray-200 bg-white flex items-center justify-center overflow-hidden p-4">
                        <img src={`/api/dpp-demo/files?action=serve&path=${encodeURIComponent(selectedFilePath)}`} className="max-w-full max-h-full object-contain" alt="preview" />
                      </div>
                    ) : selectedFilePath.match(/\.(csv|json|md|txt)$/i) ? (
                      <div className={`w-full h-full rounded-xl shadow-sm border border-gray-200 bg-white overflow-auto custom-scrollbar ${selectedFilePath.endsWith(".csv") ? "p-0" : "p-6 text-sm font-mono text-slate-700 whitespace-pre"}`}>
                        {isTextLoading ? <div className="flex h-full items-center justify-center text-slate-400">Loading content...</div> : selectedFilePath.endsWith(".csv") ? renderCsvTable(textContent) : textContent}
                      </div>
                    ) : (
                      <iframe src={`/api/dpp-demo/files?action=serve&path=${encodeURIComponent(selectedFilePath)}`} className="w-full h-full rounded-xl shadow-sm border border-gray-200 bg-white" />
                    )}
                  </div>
                </div>
              ) : skuReady ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-emerald-50/30">
                  <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-emerald-100 mb-6 relative">
                    <div className="absolute inset-0 border-4 border-emerald-400 rounded-full animate-ping opacity-20"></div>
                    <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-emerald-800 mb-2">SKU Readiness Seal</h2>
                  <p className="text-emerald-600 font-medium mb-8">此產品之靜態合規資料已全數驗證通過</p>
                  <button onClick={() => setActiveTab("batch")} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-colors flex items-center text-lg">
                    前往批次發佈階段 <ChevronRight className="w-5 h-5 ml-2" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-slate-500 p-8 text-center bg-slate-50/50">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-200">
                    <Search className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-xl font-bold text-slate-700 mb-2">等待 AI 解析</p>
                  <p className="text-sm text-slate-500 max-w-sm">請點擊左側開始進行文件稽核。Smart Viewer 將在此處顯示稽核結果或檔案預覽。</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "batch" && (
          <>
            {/* Info: (20260608 - Tzuhan) Left: Form and List */}
            <div className="w-full lg:w-[450px] flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mr-3">
                      <Factory className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">批次發佈</h2>
                  </div>
                  <button
                    onClick={handleAutoFill}
                    className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm border border-emerald-200"
                  >
                    一鍵填寫
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">指定已稽核 SKU</label>
                    <div className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-lg p-2.5 font-medium text-sm">
                      {PRODUCTS.find(p => p.id === selectedProductId)?.name} (Ready for Passport)
                    </div>
                    <p className="text-[10px] text-emerald-600 mt-1 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> 已繼承 5 項靜態合規與技術文件</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">批次編號 (Batch ID)</label>
                    <input type="text" value={batchId} onChange={e => setBatchId(e.target.value)} placeholder="例：BAT-2025-08X" className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-lg p-2.5 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">生產日期</label>
                      <input type="date" value={mfgDate} onChange={e => setMfgDate(e.target.value)} className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">產地設施</label>
                      <input type="text" value={facility} onChange={e => setFacility(e.target.value)} placeholder="例：桃園龜山一廠" className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-lg p-2.5 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">產品序號範圍 (SN Range)</label>
                    <input type="text" value={snRange} onChange={e => setSnRange(e.target.value)} placeholder="例：SN001 - SN500" className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-lg p-2.5 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-sm" />
                  </div>
                </div>

                <button
                  onClick={handlePublishBatch}
                  disabled={isPublishing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center text-sm disabled:opacity-70 mb-8"
                >
                  {isPublishing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 合成與上鏈中...</> : <><Zap className="w-4 h-4 mr-2" /> 一鍵發佈數位護照</>}
                </button>

                <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 text-sm">已發佈護照列表</h3>
                {publishedPassports.filter(p => p.productId === selectedProductId).length === 0 ? (
                  <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-xs">
                    尚未發佈任何護照
                  </div>
                ) : (
                  <div className="space-y-2">
                    {publishedPassports.filter(p => p.productId === selectedProductId).map(p => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPassport(p)}
                        className={`p-3 border rounded-xl cursor-pointer transition-colors ${selectedPassport?.id === p.id ? "bg-emerald-50 border-emerald-500 shadow-sm" : "bg-white hover:bg-slate-50 border-slate-200"}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-emerald-800 text-sm">{p.batchId}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{p.date.split(' ')[0]}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 break-all bg-white px-2 py-1 rounded border border-slate-100">{p.id}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Info: (20260608 - Tzuhan) Right: Passport Viewer */}
            <div className="flex-1 bg-slate-100 rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden relative">
              {selectedPassport ? (
                <div className="flex-1 flex flex-col h-full">
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white sticky top-0 z-10 backdrop-blur-sm">
                    <div className="flex items-center text-slate-800 text-sm font-bold">
                      <FileText className="w-5 h-5 mr-2 text-emerald-600" />
                      護照發布預覽 ({selectedPassport.batchId})
                    </div>
                    <a
                      href={`/api/dpp-demo/files?action=serve&path=${encodeURIComponent(selectedPassport.pdfPath)}`}
                      download
                      target="_blank"
                      className="text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center transition-colors"
                    >
                      <Download className="w-3 h-3 mr-1" /> 獨立頁面開啟
                    </a>
                  </div>
                  <div className="flex-1 overflow-hidden p-0 bg-slate-200">
                    <iframe
                      src={`/api/dpp-demo/files?action=serve&path=${encodeURIComponent(selectedPassport.pdfPath)}`}
                      className="w-full h-full border-0 bg-white shadow-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-slate-500 p-8 text-center bg-slate-50/50">
                  <QrCode className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-lg font-bold text-slate-600">選擇左側護照以進行預覽</p>
                  <p className="text-sm text-slate-400 mt-2">護照發佈後，將呈現所有已掛載的 SKU 資料與生產批次資訊。</p>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
