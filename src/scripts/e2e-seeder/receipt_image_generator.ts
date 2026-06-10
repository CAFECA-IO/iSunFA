import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import Decimal from "decimal.js";
import { SystemAccountNodes } from "@/constants/system_account_codes";

interface ISimulatedVoucherLine {
  id: string;
  description: string;
  accountingCode: string;
  debitAmount: number;
  creditAmount: number;
  vendor?: string;
  esgRecords?: { carbonAmount: number }[];
  items?: {
    productCode?: string;
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    amount: number;
  }[];
}

interface ISimulatedVoucher {
  id: string;
  tradingDate: string;
  voucherNumber: string;
  lines: ISimulatedVoucherLine[];
}

// Info: (20260519 - Julian) 新增 IReceiptParams 結構化發票資料
interface IReceiptParams {
  tradingDate: string;
  voucherNumber: string;
  buyerName: string; // Info: (20260519 - Julian) 發票上的買方
  sellerName: string; // Info: (20260519 - Julian) 發票上的賣方
  taxId: string; // Info: (20260519 - Julian) 買方統編
  sellerTaxId: string; // Info: (20260519 - Julian) 賣方統編
  items: {
    productCode?: string;
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    amount: number;
  }[];
  totalAmount: number; // Info: (20260519 - Julian) 稅後總金額
  taxAmount: number; // Info: (20260519 - Julian) 稅額
  netAmount: number; // Info: (20260519 - Julian) 稅前金額
  esgRecord?: { carbonAmount: number };
  watermarkText?: string; // Info: (20260519 - Julian) 動態浮水印文字
  isSales?: boolean;
  isBankReceipt?: boolean;
}

// Info: (20260502 - Tzuhan) 產生隨機統一編號
const generateTaxId = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

// Info: (20260606 - Tzuhan) 智慧推測合理的單位與隨機拆分邏輯已完全拔除，改由源頭 (chronological_reverse_engineer.ts) 賦予真實明細

interface ITheme {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
}

const getTheme = (
  sellerName: string,
  isSales: boolean,
  isNoisy: boolean,
): ITheme => {
  if (isSales) {
    return {
      primary: "#2C3E50",
      secondary: "#7F8C8D",
      accent: "#E74C3C",
      bg: isNoisy ? "#f3f4f6" : "#f8f9fa",
      text: "#2C3E50",
    };
  }

  const name = sellerName || "";
  if (
    name.includes("電力") ||
    name.includes("台電") ||
    name.includes("Taipower")
  ) {
    return {
      primary: "#0055A5",
      secondary: "#003A70",
      accent: "#FFD100",
      bg: isNoisy ? "#f0f4f8" : "#f5f9fc",
      text: "#002040",
    };
  }
  if (
    name.includes("自來水") ||
    name.includes("水廠") ||
    name.includes("Water")
  ) {
    return {
      primary: "#0080FF",
      secondary: "#0066CC",
      accent: "#33D1FF",
      bg: isNoisy ? "#f0f8ff" : "#f4faff",
      text: "#003366",
    };
  }
  if (
    name.includes("天然氣") ||
    name.includes("瓦斯") ||
    name.includes("Gas")
  ) {
    return {
      primary: "#D35400",
      secondary: "#A04000",
      accent: "#F39C12",
      bg: isNoisy ? "#fdf5e6" : "#fffaf0",
      text: "#5E2F00",
    };
  }
  if (
    name.includes("環保") ||
    name.includes("廢棄物") ||
    name.includes("清運") ||
    name.includes("回收") ||
    name.includes("Eco")
  ) {
    return {
      primary: "#27AE60",
      secondary: "#1E824C",
      accent: "#2ECC71",
      bg: isNoisy ? "#f4fcf6" : "#f9fdfa",
      text: "#145A32",
    };
  }

  return {
    primary: "#2C3E50",
    secondary: "#7F8C8D",
    accent: "#E74C3C",
    bg: isNoisy ? "#f9f8f5" : "#ffffff",
    text: "#2C3E50",
  };
};

const buildReceiptSVG = (params: IReceiptParams, isNoisy: boolean): string => {
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
    esgRecord,
    watermarkText,
    isSales = false,
  } = params;

  const theme = getTheme(sellerName, isSales, isNoisy);

  const esgText = esgRecord
    ? `<text x="680" y="750" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="13" fill="#27AE60" font-weight="bold" text-anchor="end">本單據碳排量: ${esgRecord.carbonAmount.toFixed(4)} kg CO2e</text>`
    : "";

  // Info: (20260519 - Julian) 產生隨機碼(4碼)
  const randomCode = Math.random()
    .toString(36)
    .substring(2)
    .toUpperCase()
    .slice(0, 4);

  let itemsSvg = "";
  let currentY = 300;
  items.forEach((item) => {
    const prodCode = item.productCode || "-";
    const unitText = item.unit || "PCS";
    itemsSvg += `
      <text x="25" y="${currentY}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="12" fill="${theme.text}" text-anchor="start">${item.description}</text>
      <text x="230" y="${currentY}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="12" fill="${theme.text}" text-anchor="start">${prodCode}</text>
      <text x="385" y="${currentY}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="12" fill="${theme.text}" text-anchor="end">${item.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</text>
      <text x="420" y="${currentY}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="12" fill="${theme.text}" text-anchor="middle">${unitText}</text>
      <text x="525" y="${currentY}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="12" fill="${theme.text}" text-anchor="end">${item.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</text>
      <text x="665" y="${currentY}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="12" fill="${theme.text}" text-anchor="end">${item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</text>
    `;
    currentY += 25;
  });

  const tableBottomY = currentY + 10;

  // Info: (20260519 - Julian) 處理賣方名稱換行與動態高度
  const chunkString = (str: string, size: number) => {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  };
  // Info: (20260519 - Julian) 每 9 個字換行
  const sellerNameChunks = chunkString(sellerName, 9);
  const extraLines = Math.max(0, sellerNameChunks.length - 1);
  const extraHeight = extraLines * 20;

  const row1Y = tableBottomY + 30;
  const row2Y = tableBottomY + 60;
  const row3Y = tableBottomY + 90 + extraHeight;

  // Info: (20260519 - Julian) 格線
  const vLines = `
    <!-- Top table vertical lines (Items area) -->
    <line x1="225" y1="250" x2="225" y2="${tableBottomY}" stroke="${theme.primary}" stroke-width="1" />
    <line x1="335" y1="250" x2="335" y2="${tableBottomY}" stroke="${theme.primary}" stroke-width="1" />
    <line x1="395" y1="250" x2="395" y2="${tableBottomY}" stroke="${theme.primary}" stroke-width="1" />
    <line x1="445" y1="250" x2="445" y2="${tableBottomY}" stroke="${theme.primary}" stroke-width="1" />
    
    <!-- Full table vertical lines (Extend to bottom of totals) -->
    <line x1="20" y1="250" x2="20" y2="${row3Y}" stroke="${theme.primary}" stroke-width="1" />
    <line x1="535" y1="250" x2="535" y2="${row3Y}" stroke="${theme.primary}" stroke-width="1" />
    <line x1="680" y1="250" x2="680" y2="${row3Y}" stroke="${theme.primary}" stroke-width="1" />
  `;

  // Info: (20260519 - Julian) 雜訊效果
  const noiseFilter = isNoisy ? `filter="url(#noiseBlur)"` : "";
  const transform = isNoisy
    ? `transform="rotate(${Math.random() * 1 - 0.5}, 350, 400)"`
    : "";
  const dropBuyerTaxId = isNoisy && Math.random() < 0.3;
  const blurLevel = isNoisy ? (Math.random() * 1.5 + 0.5).toFixed(1) : "0";

  let noiseOverlay = "";
  if (isNoisy) {
    noiseOverlay = `
        <!-- Info: (20260502 - Tzuhan) 隨機雜訊偽影 -->
        <path d="M 0 ${Math.random() * 800} Q 350 ${Math.random() * 800} 700 ${Math.random() * 800}" stroke="rgba(0,0,0,0.15)" stroke-width="2" fill="transparent" />
        <path d="M ${Math.random() * 700} 0 L ${Math.random() * 700} 800" stroke="rgba(0,0,0,0.1)" stroke-width="5" />
    `;
  }

  let watermark = "";
  if (watermarkText) {
    watermark = `
      <!-- Info: (20260519 - Julian) 動態印章浮水印 -->
      <text x="350" y="400" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="48" font-weight="bold" fill="rgba(255, 0, 0, 0.08)" text-anchor="middle" transform="rotate(-30, 350, 400)">
        ${watermarkText}
      </text>
    `;
  }

  // Info: (20260520 - Julian) Red official stamp setup
  const stampTextLine1 =
    sellerName.length > 10 ? sellerName.substring(0, 10) : sellerName;
  const stampTextLine2 = isSales ? "統一發票專用章" : "收訖專用章";
  const stampTextLine3 = tradingDate;
  const stampY = tableBottomY + 25;
  const officialStampHtml = `
    <!-- Red Official Stamp (Tilt-rotated -12deg, low-opacity) -->
    <g transform="translate(555, ${stampY}) rotate(-12)" opacity="0.8">
      <ellipse cx="60" cy="40" rx="55" ry="35" fill="none" stroke="#E74C3C" stroke-width="3" />
      <ellipse cx="60" cy="40" rx="51" ry="31" fill="none" stroke="#E74C3C" stroke-width="1" />
      <text x="60" y="24" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="10" font-weight="bold" fill="#E74C3C" text-anchor="middle">${stampTextLine1}</text>
      <text x="60" y="42" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="12" font-weight="bold" fill="#E74C3C" text-anchor="middle">${stampTextLine2}</text>
      <text x="60" y="58" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="9" font-weight="bold" fill="#E74C3C" text-anchor="middle">${stampTextLine3}</text>
    </g>
  `;

  return `
  <svg width="700" height="800" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;family=Noto+Sans+TC:wght@400;700&amp;display=swap');
        .receipt-text {
          font-family: 'Inter', 'Noto Sans TC', sans-serif;
        }
      </style>
      <filter id="noiseBlur">
        <feGaussianBlur stdDeviation="${blurLevel}" />
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="${theme.bg}" stroke="${theme.primary}" stroke-width="1" />
    <g ${noiseFilter} ${transform} class="receipt-text">
      <!-- Title -->
      <text x="350" y="45" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="${theme.primary}">${sellerName}</text>
      <text x="350" y="75" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="${theme.primary}">${params.isBankReceipt ? "銀行入帳憑單" : "電子發票證明聯"}</text>
      <text x="350" y="100" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="18" text-anchor="middle" fill="${theme.text}">${tradingDate}</text>
      
      <!-- Top Left Info -->
      <text x="20" y="130" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="14" fill="${theme.text}">發票號碼: ${voucherNumber}</text>
      <text x="20" y="155" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="14" fill="${theme.text}">買　　方: ${buyerName}</text>
      <text x="20" y="180" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="14" fill="${theme.text}">統一編號: ${dropBuyerTaxId ? "--------" : taxId}</text>
      <text x="20" y="205" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="14" fill="${theme.text}">地　　址: </text>
      
      <!-- Top Right Info -->
      <text x="450" y="130" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="14" fill="${theme.text}">格　　式: 25</text>
      <text x="450" y="155" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="14" fill="${theme.text}">隨 機 碼: ${randomCode}</text>
      
      <text x="680" y="240" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="14" fill="${theme.text}" text-anchor="end">第1頁/共1頁</text>
      
      <!-- Table Border Top -->
      <line x1="20" y1="250" x2="680" y2="250" stroke="${theme.primary}" stroke-width="1.5" />
      
      <!-- Table Header -->
      <text x="25" y="270" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="13" font-weight="bold" fill="${theme.primary}" text-anchor="start">品名</text>
      <text x="230" y="270" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="13" font-weight="bold" fill="${theme.primary}" text-anchor="start">商品編號</text>
      <text x="385" y="270" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="13" font-weight="bold" fill="${theme.primary}" text-anchor="end">數量</text>
      <text x="420" y="270" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="13" font-weight="bold" fill="${theme.primary}" text-anchor="middle">單位</text>
      <text x="525" y="270" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="13" font-weight="bold" fill="${theme.primary}" text-anchor="end">單價</text>
      <text x="665" y="270" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="13" font-weight="bold" fill="${theme.primary}" text-anchor="end">金額</text>
      
      <!-- Table Border Under Header -->
      <line x1="20" y1="280" x2="680" y2="280" stroke="${theme.primary}" stroke-width="1" />
      
      <!-- Items -->
      ${itemsSvg}
      
      <!-- Table Border Bottom of Items -->
      <line x1="20" y1="${tableBottomY}" x2="680" y2="${tableBottomY}" stroke="${theme.primary}" stroke-width="1.5" />
      
      <!-- Horizontal lines for totals -->
      <line x1="20" y1="${row1Y}" x2="535" y2="${row1Y}" stroke="${theme.primary}" stroke-width="1" />
      <line x1="20" y1="${row2Y}" x2="535" y2="${row2Y}" stroke="${theme.primary}" stroke-width="1" />
      <line x1="20" y1="${row3Y}" x2="680" y2="${row3Y}" stroke="${theme.primary}" stroke-width="1.5" />
      
      <!-- Vertical line specific to Tax row -->
      <line x1="120" y1="${row1Y}" x2="120" y2="${row2Y}" stroke="${theme.primary}" stroke-width="1" />
      
      <!-- Vertical Lines -->
      ${vLines}
      
      <!-- Totals -->
      <text x="25" y="${tableBottomY + 20}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="14" fill="${theme.text}">銷售額合計</text>
      <text x="525" y="${tableBottomY + 20}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="14" fill="${theme.text}" text-anchor="end">${netAmount.toLocaleString()}</text>
      
      <text x="25" y="${tableBottomY + 50}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="14" fill="${theme.text}">營業稅</text>
      <text x="135" y="${tableBottomY + 50}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="14" fill="${theme.text}">應稅 [ V ]　　零稅率 [　 ]　　免稅 [　 ]</text>
      <text x="525" y="${tableBottomY + 50}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="14" fill="${theme.text}" text-anchor="end">${taxAmount.toLocaleString()}</text>
      
      <text x="25" y="${tableBottomY + 80 + extraHeight / 2}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="16" font-weight="bold" fill="${theme.text}">總計</text>
      <text x="525" y="${tableBottomY + 80 + extraHeight / 2}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="16" font-weight="bold" fill="${theme.text}" text-anchor="end">${totalAmount.toLocaleString()}</text>
      
      <!-- Info: (20260519 - Julian) 右下角賣方專用章資訊塊 -->
      <text x="545" y="${tableBottomY + 20}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="11" fill="${theme.text}" font-weight="bold">營業人蓋統一發票專用章</text>
      ${sellerNameChunks.map((chunk, i) => `<text x="545" y="${tableBottomY + 40 + i * 20}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="11" fill="${theme.text}">${i === 0 ? "賣　　方: " : "　　　　  "}${chunk}</text>`).join("\n      ")}
      <text x="545" y="${tableBottomY + 40 + extraLines * 20 + 20}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="11" fill="${theme.text}">統一編號: ${sellerTaxId}</text>
      <text x="545" y="${tableBottomY + 40 + extraLines * 20 + 40}" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="11" fill="${theme.text}">地　　址: </text>
      
      ${esgText}
      
      <text x="350" y="780" font-family="'Inter', 'Noto Sans TC', sans-serif" font-size="12" text-anchor="middle" fill="${theme.secondary}">模擬憑證 - iSunFA End-to-End Test (Golden Dataset)</text>
      ${watermark}
      ${officialStampHtml}
    </g>
    ${noiseOverlay}
  </svg>
  `;
};

export const generateReceiptImages = async (
  stockId: string,
  year: string = "2024",
) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);

  const vouchersPath = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "simulated_vouchers.json",
  );

  const receiptsDir = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "receipts",
  );

  if (!fs.existsSync(vouchersPath)) {
    console.error(`[ERROR] Vouchers JSON not found at ${vouchersPath}.`);
    process.exit(1);
  }

  // if (fs.existsSync(receiptsDir)) {
  //   fs.rmSync(receiptsDir, { recursive: true, force: true });
  // }
  fs.mkdirSync(receiptsDir, { recursive: true });

  const vouchers = JSON.parse(
    fs.readFileSync(vouchersPath, "utf-8"),
  ) as ISimulatedVoucher[];

  const companyProfilePath = path.join(
    dataDir,
    "inputs",
    "golden_data",
    "company_profile.json",
  );
  let buyerCompanyName = "";
  if (fs.existsSync(companyProfilePath)) {
    const profile = JSON.parse(fs.readFileSync(companyProfilePath, "utf-8"));
    buyerCompanyName = profile["公司名稱"] || "";
  }

  let generatedCount = 0;
  let noiseCount = 0;

  for (const voucher of vouchers) {
    // Info: (20260502 - Tzuhan) 僅為外部供應商或現金交易產生實體憑證。
    // Info: (20260502 - Tzuhan) 略過如折舊等無實體憑證的內部調整。
    if (voucher.voucherNumber.startsWith("ADJ-")) continue;

    // Info: (20260502 - Tzuhan) 找出主要的分錄以取得描述與金額
    if (
      voucher.lines.length === 0 ||
      (voucher.lines[0].debitAmount === 0 &&
        voucher.lines[0].creditAmount === 0)
    ) {
      continue;
    }
    const mainLine =
      voucher.lines.find((l) => l.debitAmount > 0) || voucher.lines[0];
    const vendorName = mainLine.vendor || "現金交易客戶/供應商";

    // Info: (20260519 - Julian) 判斷交易方向：包含 4 開頭會計科目即為銷貨(Sales)
    const isSales = voucher.lines.some((l) => l.accountingCode.startsWith("4"));

    // Info: (20260519 - Julian) 銷貨：我們是賣方，外部客戶是買方；採購：我們是買方，外部廠商是賣方
    const buyerName = isSales ? vendorName : buyerCompanyName || "本公司";
    const sellerName = isSales ? buyerCompanyName || "本公司" : vendorName;

    // Info: (20260519 - Julian) 如果是銷貨，浮水印蓋「記帳聯」；如果是採購/費用，浮水印蓋「財務部收訖」
    const watermarkText = isSales
      ? `${buyerCompanyName || "本公司"} - 記帳聯`
      : `${buyerCompanyName || "本公司"} - 財務部收訖`;

    // Info: (20260605 - Tzuhan) 憑證上的金額是以「千元」為單位（為吻合財報），但實體發票必須還原為「元」，因此乘上 1000
    const totalAmount =
      (mainLine.debitAmount > 0
        ? mainLine.debitAmount
        : mainLine.creditAmount) * 1000;

    // Info: (20260601 - Tzuhan) 判斷是否為籌資或借款等銀行往來憑證 (股本 3110, 短期借款 2100)
    const isBankReceipt = voucher.lines.some(
      (l) =>
        l.accountingCode === SystemAccountNodes.COMMON_STOCK_CAPITAL ||
        l.accountingCode === SystemAccountNodes.SHORT_TERM_BORROWINGS,
    );
    const totalDecimal = new Decimal(totalAmount);
    let netAmountDecimal: Decimal;
    let taxAmountDecimal: Decimal;

    if (isBankReceipt) {
      netAmountDecimal = totalDecimal;
      taxAmountDecimal = new Decimal(0);
    } else {
      netAmountDecimal = totalDecimal
        .div(1.05)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
      taxAmountDecimal = totalDecimal.minus(netAmountDecimal);
    }

    // Info: (20260606 - Tzuhan) 明細直接吃模擬引擎產出的底層單一真相 (Single Source of Truth)
    // 並且將「千元」轉換回真實發票金額 (* 1000)
    const items =
      mainLine.items && mainLine.items.length > 0
        ? mainLine.items.map((item) => ({
            productCode: item.productCode || "-",
            description: item.description,
            quantity: item.quantity || 1,
            unit: item.unit || "式",
            unitPrice: (item.unitPrice || item.amount) * 1000,
            amount: item.amount * 1000,
          }))
        : [
            {
              productCode: "-",
              description: mainLine.description || "未提供說明",
              quantity: 1,
              unit: "式",
              unitPrice: netAmountDecimal.toNumber(),
              amount: netAmountDecimal.toNumber(),
            },
          ];

    const params: IReceiptParams = {
      tradingDate: new Date(voucher.tradingDate).toISOString().split("T")[0],
      voucherNumber: voucher.voucherNumber,
      buyerName,
      sellerName,
      taxId: generateTaxId(),
      sellerTaxId: generateTaxId(),
      items,
      totalAmount,
      taxAmount: taxAmountDecimal.toNumber(),
      netAmount: netAmountDecimal.toNumber(),
      esgRecord: mainLine.esgRecords?.[0],
      watermarkText,
      isSales,
      isBankReceipt,
    };

    // User Update: 現階段先不測髒汙雜訊，純驗證解析邏輯是否正確
    const isNoisy = false; // Math.random() < 0.1;
    if (isNoisy) noiseCount++;

    const svgContent = buildReceiptSVG(params, isNoisy);

    const pngPath = path.join(receiptsDir, `${voucher.voucherNumber}.png`);
    await sharp(Buffer.from(svgContent.trim())).png().toFile(pngPath);
    generatedCount++;
  }

  console.log(
    `[SUCCESS] Generated ${generatedCount} receipt PNGs (including ${noiseCount} noisy ones) for ${stockId} in ${receiptsDir}.`,
  );
};

// Info: (20260502 - Tzuhan) 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  const stockId = process.argv[2];
  const year = process.argv[3] || "2024";
  if (!stockId) {
    console.error("Usage: tsx receipt_image_generator.ts <stockId>");
    process.exit(1);
  }
  generateReceiptImages(stockId, year).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
