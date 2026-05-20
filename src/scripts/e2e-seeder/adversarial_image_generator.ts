/*
 ** Info: (20260520 - Julian) 對抗性樣本生成腳本 (Adversarial Samples Generator)
 ** 這個腳本會在憑證中加入混合科目(mixed accounting)、干擾文字(distractor text)、異常單位(abnormal unit)。
 ** 生成「有問題」的憑證，來測試 AI 在處理異常資料時的表現。
 */

import * as fs from "fs";
import * as path from "path";

// Info: (20260520 - Julian) 對抗性項目資料結構
interface IAdversarialItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  unit: string; // Info: (20260520 - Julian) 實際單位，如：LITER, KWH, KG, 桶, 箱
  remark?: string;
}

// Info: (20260520 - Julian) 對抗性憑證參數結構
interface IAdversarialParams {
  tradingDate: string;
  voucherNumber: string;
  buyerName: string;
  sellerName: string;
  taxId: string;
  sellerTaxId: string;
  items: IAdversarialItem[];
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  watermarkText?: string;
  distractorText?: string; // Info: (20260520 - Julian) 干擾文字
}

// Info: (20260520 - Julian) 產生隨機統一編號
const generateTaxId = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

// Info: (20260520 - Julian) 繪製對抗性憑證 SVG 圖片
const buildAdversarialSVG = (params: IAdversarialParams): string => {
  const {
    sellerName,
    buyerName,
    taxId,
    sellerTaxId,
    tradingDate,
    voucherNumber,
    items,
    netAmount,
    taxAmount,
    totalAmount,
    watermarkText,
    distractorText,
  } = params;

  // Info: (20260520 - Julian) 產生隨機碼(4碼)
  const randomCode = Math.random()
    .toString(36)
    .substring(2)
    .toUpperCase()
    .slice(0, 4);

  let itemsSvg = "";
  let currentY = 300;
  items.forEach((item) => {
    itemsSvg += `
      <text x="25" y="${currentY}" font-family="sans-serif" font-size="13" fill="#333">${item.description}</text>
      <text x="310" y="${currentY}" font-family="sans-serif" font-size="13" fill="#333" text-anchor="end">${item.quantity} ${item.unit}</text>
      <text x="410" y="${currentY}" font-family="sans-serif" font-size="13" fill="#333" text-anchor="end">${item.unitPrice.toLocaleString()}</text>
      <text x="510" y="${currentY}" font-family="sans-serif" font-size="13" fill="#333" text-anchor="end">${item.amount.toLocaleString()}</text>
      <text x="600" y="${currentY}" font-family="sans-serif" font-size="12" fill="#555" text-anchor="middle">${item.remark || ""}</text>
    `;
    currentY += 25;
  });

  const tableBottomY = currentY + 10;

  // Info: (20260520 - Julian) 處理賣方名稱換行
  const chunkString = (str: string, size: number) => {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  };
  const sellerNameChunks = chunkString(sellerName, 9);
  const extraLines = Math.max(0, sellerNameChunks.length - 1);
  const extraHeight = extraLines * 20;

  const row1Y = tableBottomY + 30;
  const row2Y = tableBottomY + 60;
  const row3Y = tableBottomY + 90 + extraHeight;

  // Info: (20260520 - Julian) 欄位垂直分水嶺格線
  const vLines = `
    <!-- Top table vertical lines (Items area) -->
    <line x1="230" y1="250" x2="230" y2="${tableBottomY}" stroke="#000" stroke-width="1" />
    <line x1="320" y1="250" x2="320" y2="${tableBottomY}" stroke="#000" stroke-width="1" />
    
    <!-- Full table vertical lines (Extend to bottom of totals) -->
    <line x1="20" y1="250" x2="20" y2="${row3Y}" stroke="#000" stroke-width="1" />
    <line x1="420" y1="250" x2="420" y2="${row3Y}" stroke="#000" stroke-width="1" />
    <line x1="520" y1="250" x2="520" y2="${row3Y}" stroke="#000" stroke-width="1" />
    <line x1="680" y1="250" x2="680" y2="${row3Y}" stroke="#000" stroke-width="1" />
  `;

  // Info: (20260520 - Julian) 渲染浮水印
  let watermark = "";
  if (watermarkText) {
    watermark = `
      <!-- Info: (20260520 - Julian) 動態印章浮水印 -->
      <text x="350" y="400" font-family="sans-serif" font-size="44" font-weight="bold" fill="rgba(255, 0, 0, 0.12)" text-anchor="middle" transform="rotate(-30, 350, 400)">
        ${watermarkText}
      </text>
    `;
  }

  // Info: (20260520 - Julian) 渲染干擾性文字條幅
  let distractorBanner = "";
  if (distractorText) {
    distractorBanner = `
      <!-- Info: (20260520 - Julian) 刻意植入之干擾性大字體宣告 -->
      <g transform="translate(0, 10)">
        <rect x="20" y="215" width="660" height="30" fill="#FFF2E2" stroke="#FFA726" stroke-width="1.5" rx="4" />
        <text x="350" y="235" font-family="sans-serif" font-weight="bold" font-size="12" fill="#E65100" text-anchor="middle">
          🚨 ${distractorText}
        </text>
      </g>
    `;
  }

  return `
  <svg width="700" height="850" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ffffff" stroke="#cccccc" stroke-width="1" />
    <g>
      <!-- Title -->
      <text x="350" y="45" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="#000">${sellerName}</text>
      <text x="350" y="75" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#000">電子發票證明聯</text>
      <text x="350" y="100" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#000">${tradingDate}</text>
      
      <!-- Top Left Info -->
      <text x="20" y="130" font-family="sans-serif" font-size="14" fill="#000">發票號碼: ${voucherNumber}</text>
      <text x="20" y="155" font-family="sans-serif" font-size="14" fill="#000">買　　方: ${buyerName}</text>
      <text x="20" y="180" font-family="sans-serif" font-size="14" fill="#000">統一編號: ${taxId}</text>
      <text x="20" y="205" font-family="sans-serif" font-size="14" fill="#000">地　　址: 測試隔離儲存區</text>
      
      <!-- Top Right Info -->
      <text x="450" y="130" font-family="sans-serif" font-size="14" fill="#000">格　　式: 25</text>
      <text x="450" y="155" font-family="sans-serif" font-size="14" fill="#000">隨 機 碼: ${randomCode}</text>
      
      <text x="680" y="240" font-family="sans-serif" font-size="14" fill="#000" text-anchor="end">第1頁/共1頁</text>
      
      <!-- Distractor Banner if exists -->
      ${distractorBanner}
      
      <!-- Table Border Top -->
      <line x1="20" y1="250" x2="680" y2="250" stroke="#000" stroke-width="1" />
      
      <!-- Table Header -->
      <text x="120" y="270" font-family="sans-serif" font-size="14" fill="#000" text-anchor="middle">品名明細</text>
      <text x="275" y="270" font-family="sans-serif" font-size="14" fill="#000" text-anchor="middle">數量單位</text>
      <text x="370" y="270" font-family="sans-serif" font-size="14" fill="#000" text-anchor="middle">單價</text>
      <text x="470" y="270" font-family="sans-serif" font-size="14" fill="#000" text-anchor="middle">金額</text>
      <text x="600" y="270" font-family="sans-serif" font-size="14" fill="#000" text-anchor="middle">課稅別</text>
      
      <!-- Table Border Under Header -->
      <line x1="20" y1="280" x2="680" y2="280" stroke="#000" stroke-width="1" />
      
      <!-- Items -->
      ${itemsSvg}
      
      <!-- Table Border Bottom of Items -->
      <line x1="20" y1="${tableBottomY}" x2="680" y2="${tableBottomY}" stroke="#000" stroke-width="1" />
      
      <!-- Horizontal lines for totals -->
      <line x1="20" y1="${row1Y}" x2="520" y2="${row1Y}" stroke="#000" stroke-width="1" />
      <line x1="20" y1="${row2Y}" x2="520" y2="${row2Y}" stroke="#000" stroke-width="1" />
      <line x1="20" y1="${row3Y}" x2="680" y2="${row3Y}" stroke="#000" stroke-width="1" />
      
      <!-- Vertical line specific to Tax row -->
      <line x1="120" y1="${row1Y}" x2="120" y2="${row2Y}" stroke="#000" stroke-width="1" />
      
      <!-- Vertical Lines -->
      ${vLines}
      
      <!-- Totals -->
      <text x="25" y="${tableBottomY + 20}" font-family="sans-serif" font-size="14" fill="#000">銷售額合計</text>
      <text x="510" y="${tableBottomY + 20}" font-family="sans-serif" font-size="14" fill="#000" text-anchor="end">${netAmount.toLocaleString()}</text>
      
      <text x="25" y="${tableBottomY + 50}" font-family="sans-serif" font-size="14" fill="#000">營業稅</text>
      <text x="135" y="${tableBottomY + 50}" font-family="sans-serif" font-size="14" fill="#000">應稅 [ V ]　　零稅率 [　 ]　　免稅 [　 ]</text>
      <text x="510" y="${tableBottomY + 50}" font-family="sans-serif" font-size="14" fill="#000" text-anchor="end">${taxAmount.toLocaleString()}</text>
      
      <text x="25" y="${tableBottomY + 80 + extraHeight / 2}" font-family="sans-serif" font-size="16" font-weight="bold" fill="#000">總計</text>
      <text x="510" y="${tableBottomY + 80 + extraHeight / 2}" font-family="sans-serif" font-size="16" font-weight="bold" fill="#000" text-anchor="end">${totalAmount.toLocaleString()}</text>
      
      <!-- Info block for seller -->
      <text x="525" y="${tableBottomY + 20}" font-family="sans-serif" font-size="11" fill="#000">營業人蓋統一發票專用章</text>
      ${sellerNameChunks.map((chunk, i) => `<text x="525" y="${tableBottomY + 40 + i * 20}" font-family="sans-serif" font-size="11" fill="#000">${i === 0 ? "賣　　方: " : "　　　　  "}${chunk}</text>`).join("\n      ")}
      <text x="525" y="${tableBottomY + 40 + extraLines * 20 + 20}" font-family="sans-serif" font-size="11" fill="#000">統一編號: ${sellerTaxId}</text>
      
      <text x="350" y="820" font-family="sans-serif" font-size="12" text-anchor="middle" fill="#777" font-weight="bold">對抗性樣本 - 專供防呆管線攔截與盲測測試</text>
      ${watermark}
    </g>
  </svg>
  `;
};

// Info: (20260520 - Julian) 主程序，生成三種對抗性測試憑證
export const generateAdversarialSamples = (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/2024`);
  const testingDir = path.join(dataDir, "inputs", "testing", "adversarial");
  const goldenDataDir = path.join(dataDir, "inputs", "golden_data");

  // Info: (20260520 - Julian) 清理並建立隔離測試目錄
  if (fs.existsSync(testingDir)) {
    fs.rmSync(testingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testingDir, { recursive: true });

  // Info: (20260520 - Julian) 取出買方公司資料
  const buyerCompanyProfilePath = path.join(
    goldenDataDir,
    "company_profile.json",
  );
  const buyerCompanyName = JSON.parse(
    fs.readFileSync(buyerCompanyProfilePath, "utf-8"),
  )["公司名稱"];
  const buyerTaxId = JSON.parse(
    fs.readFileSync(buyerCompanyProfilePath, "utf-8"),
  )["統一編號"];
  const dateStr = "2024-05-20";

  // Info: (20260520 - Julian) 對抗性樣本 1: 混合科目憑證 (mixed_accounting)
  // 明細混合了辦公用品(5108 - 無碳排項目) 與 車用汽油(5151 - 高碳排項目)
  const mixedParams: IAdversarialParams = {
    tradingDate: dateStr,
    voucherNumber: "E2E-ADV-MIXED-001",
    buyerName: buyerCompanyName,
    sellerName: "亞太綜合辦公與石化燃料行",
    taxId: buyerTaxId,
    sellerTaxId: generateTaxId(),
    items: [
      {
        description: "公務車用九五無鉛汽油",
        quantity: 50,
        unit: "LITER",
        unitPrice: 30,
        amount: 1500,
        remark: "應稅",
      },
      {
        description: "高級三色原子筆與公務筆記本",
        quantity: 20,
        unit: "PIECE",
        unitPrice: 25,
        amount: 500,
        remark: "免稅",
      },
      {
        description: "影印室專用 A4 影印紙 (箱)",
        quantity: 5,
        unit: "PIECE",
        unitPrice: 200,
        amount: 1000,
        remark: "應稅",
      },
    ],
    totalAmount: 3000,
    taxAmount: 143,
    netAmount: 2857,
    watermarkText: "亞太綜合辦公與石化燃料行",
  };

  // Info: (20260520 - Antigravity) 對抗性樣本 2: 干擾性文字憑證 (distractor_text)
  // 圖片上印有大大的 "總量：1000 噸" 浮誇漂綠字眼，但實際明細是 "常規用電 10 度(KWH)"
  const distractorParams: IAdversarialParams = {
    tradingDate: dateStr,
    voucherNumber: "E2E-ADV-DISTRACT-001",
    buyerName: buyerCompanyName,
    sellerName: "台灣電力股份有限公司",
    taxId: buyerTaxId,
    sellerTaxId: "03795005",
    items: [
      {
        description: "常規營業場所用電費",
        quantity: 10,
        unit: "KWH",
        unitPrice: 5,
        amount: 50,
        remark: "應稅",
      },
    ],
    totalAmount: 50,
    taxAmount: 2,
    netAmount: 48,
    watermarkText: "亞太綜合辦公與石化燃料行",
    distractorText: "年度減碳統計宣稱：累積排放減碳量已達 1000 公噸 CO2e",
  };

  // Info: (20260520 - Antigravity) 對抗性樣本 3: 異常單位憑證 (invalid_unit)
  // 品項是車用柴油，但單位植入了不合規的 "桶" (Barrels)
  const invalidUnitParams: IAdversarialParams = {
    tradingDate: dateStr,
    voucherNumber: "E2E-ADV-INVALID-001",
    buyerName: buyerCompanyName,
    sellerName: "全球化工與燃料批發行",
    taxId: buyerTaxId,
    sellerTaxId: generateTaxId(),
    items: [
      {
        description: "工業級車用柴油",
        quantity: 200,
        unit: "桶", // Invalid unit (not in MeasurementUnit enum)
        unitPrice: 400,
        amount: 80000,
        remark: "應稅",
      },
    ],
    totalAmount: 80000,
    taxAmount: 3810,
    netAmount: 76190,
    watermarkText: "亞太綜合辦公與石化燃料行",
  };

  // Info: (20260520 - Antigravity) 寫入 SVGs
  const samples = [
    { name: "mixed_accounting", params: mixedParams },
    { name: "distractor_text", params: distractorParams },
    { name: "invalid_unit", params: invalidUnitParams },
  ];

  samples.forEach((sample) => {
    const svgContent = buildAdversarialSVG(sample.params);
    const svgPath = path.join(testingDir, `${sample.name}.svg`);
    fs.writeFileSync(svgPath, svgContent.trim(), "utf-8");
    console.log(`✅ Generated SVG: ${sample.name}.svg`);
  });

  // Info: (20260520 - Antigravity) 生成 metadata JSON 與總 manifest
  const mixedMeta = {
    voucherNumber: mixedParams.voucherNumber,
    description:
      "混合科目憑證：一張發票包含多項品目，要求能把無碳排項目（原子筆與影印紙，科目 5108）與高碳排項目（汽油，科目 5151）精確分離，ESG 僅計算汽油之排放。",
    expectedBehavior:
      "Voucher lines successfully mapped to different account codes. Only gasoline line produces ESG record. Supplies lines ignored or produce 0 emissions.",
    expectedErrors: [],
    verificationRules: {
      totalVoucherLines: 3,
      emissiveLines: [
        {
          accountingCode: "5151",
          unit: "LITER",
          amount: 1500,
        },
      ],
      nonEmissiveLines: [
        {
          accountingCode: "5108",
          amount: 500,
        },
        {
          accountingCode: "5108",
          amount: 1000,
        },
      ],
    },
  };

  const distractorMeta = {
    voucherNumber: distractorParams.voucherNumber,
    description:
      "干擾性文字憑證：單據上印有誤導性巨大字體『1000 公噸 CO2e』減碳統計，但實際用電僅 10 度，測試 AI 是否不受大數字干擾。",
    expectedBehavior:
      "Successfully ignored distractor text '1000 公噸 CO2e' in header. Extracted exactly 10 KWH for electricity consumption.",
    expectedErrors: [],
    verificationRules: {
      expectedAmount: 10,
      expectedUnit: "KWH",
      maxAllowedHallucination: 15, // Ensure it doesn't extract 1000
    },
  };

  const invalidUnitMeta = {
    voucherNumber: invalidUnitParams.voucherNumber,
    description:
      "異常單位憑證：故意使用未列入 `MeasurementUnit` 列舉的單位『桶』，驗證系統阻斷或標記機制。",
    expectedBehavior:
      "System detects invalid unit '桶'. Rejects transaction or falls back to suspense state (isVerified = false, AI analysisStatus = FAILED or SUSPENSE warned).",
    expectedErrors: ["INVALID_UNIT"],
    verificationRules: {
      rejectedUnit: "桶",
      shouldTriggerWarning: true,
    },
  };

  // Info: (20260520 - Antigravity) 寫入各樣本 meta JSON
  fs.writeFileSync(
    path.join(testingDir, "mixed_accounting_meta.json"),
    JSON.stringify(mixedMeta, null, 2),
    "utf-8",
  );
  fs.writeFileSync(
    path.join(testingDir, "distractor_text_meta.json"),
    JSON.stringify(distractorMeta, null, 2),
    "utf-8",
  );
  fs.writeFileSync(
    path.join(testingDir, "invalid_unit_meta.json"),
    JSON.stringify(invalidUnitMeta, null, 2),
    "utf-8",
  );
  console.log("✅ Generated all sample metadata JSON files.");

  // Info: (20260520 - Antigravity) 生成總 manifest.json
  const manifest = {
    stockId,
    timestamp: new Date().toISOString(),
    testingCategory: "Sprint 2 Adversarial Validation (Anti-Hallucination)",
    testCases: [
      {
        id: "mixed_accounting",
        fileName: "mixed_accounting.svg",
        metaFile: "mixed_accounting_meta.json",
        expectedCategory: "MIXED_ACCOUNTING_CODES",
      },
      {
        id: "distractor_text",
        fileName: "distractor_text.svg",
        metaFile: "distractor_text_meta.json",
        expectedCategory: "DISTRACTOR_TEXT_EXCLUSION",
      },
      {
        id: "invalid_unit",
        fileName: "invalid_unit.svg",
        metaFile: "invalid_unit_meta.json",
        expectedCategory: "INVALID_UNIT_BLOCKING",
      },
    ],
  };

  fs.writeFileSync(
    path.join(testingDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );
  console.log("✅ Generated manifest.json");

  console.log(
    `\n🎉 [SUCCESS] Generated all adversarial testing samples successfully inside ${testingDir}.\n`,
  );
};

// Info: (20260520 - Antigravity) 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2] || "2330";
  generateAdversarialSamples(targetStock);
}
