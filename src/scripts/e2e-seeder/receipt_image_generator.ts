import * as fs from "fs";
import * as path from "path";
import Decimal from "decimal.js";

interface ISimulatedVoucherLine {
  id: string;
  description: string;
  accountingCode: string;
  debitAmount: number;
  creditAmount: number;
  vendor?: string;
  esgRecords?: { carbonAmount: number }[];
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
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  totalAmount: number; // Info: (20260519 - Julian) 稅後總金額
  taxAmount: number; // Info: (20260519 - Julian) 稅額
  netAmount: number; // Info: (20260519 - Julian) 稅前金額
  esgRecord?: { carbonAmount: number };
  watermarkText?: string; // Info: (20260519 - Julian) 動態浮水印文字
}

// Info: (20260502 - Tzuhan) 產生隨機統一編號
const generateTaxId = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

// Info: (20260519 - Julian) 將金額拆分成 3~5 項明細，並計算未稅、稅額
const splitIntoItems = (
  totalAmount: number,
  baseDescription: string,
): IReceiptParams["items"] => {
  // Info: (20260519 - Julian) 假設傳入為未稅金額
  const amountDecimal = new Decimal(totalAmount);
  // Info: (20260519 - Julian) 隨機拆分 3~5 項
  const numItems = Math.floor(Math.random() * 3) + 3;
  const items: IReceiptParams["items"] = [];

  let remainingAmount = amountDecimal;

  for (let i = 0; i < numItems; i++) {
    if (i === numItems - 1) {
      // Info: (20260519 - Julian) 最後一筆吃掉剩下的金額
      const itemAmount = remainingAmount.toNumber();
      items.push({
        description: `${baseDescription} - 項目 ${i + 1}`,
        quantity: 1,
        unitPrice: itemAmount,
        amount: itemAmount,
      });
    } else {
      // Info: (20260519 - Julian) 隨機分配金額，最多分配剩下的一半，確保後面還有剩
      const portion = Math.random() * 0.4 + 0.1;
      let itemAmount = Math.floor(remainingAmount.mul(portion).toNumber());
      if (itemAmount === 0) itemAmount = 1;

      items.push({
        description: `${baseDescription} - 項目 ${i + 1}`,
        quantity: 1,
        unitPrice: itemAmount,
        amount: itemAmount,
      });
      remainingAmount = remainingAmount.minus(itemAmount);
    }
  }

  return items;
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
  } = params;

  const esgText = esgRecord
    ? `<text x="680" y="750" font-family="sans-serif" font-size="14" fill="#006600" text-anchor="end">本單據碳排量: ${esgRecord.carbonAmount.toFixed(4)} kg CO2e</text>`
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
    itemsSvg += `
      <text x="25" y="${currentY}" font-family="sans-serif" font-size="14" fill="#333">${item.description}</text>
      <text x="310" y="${currentY}" font-family="sans-serif" font-size="14" fill="#333" text-anchor="end">${item.quantity}</text>
      <text x="410" y="${currentY}" font-family="sans-serif" font-size="14" fill="#333" text-anchor="end">${item.unitPrice.toLocaleString()}</text>
      <text x="510" y="${currentY}" font-family="sans-serif" font-size="14" fill="#333" text-anchor="end">${item.amount.toLocaleString()}</text>
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
    <line x1="230" y1="250" x2="230" y2="${tableBottomY}" stroke="#000" stroke-width="1" />
    <line x1="320" y1="250" x2="320" y2="${tableBottomY}" stroke="#000" stroke-width="1" />
    
    <!-- Full table vertical lines (Extend to bottom of totals) -->
    <line x1="20" y1="250" x2="20" y2="${row3Y}" stroke="#000" stroke-width="1" />
    <line x1="420" y1="250" x2="420" y2="${row3Y}" stroke="#000" stroke-width="1" />
    <line x1="520" y1="250" x2="520" y2="${row3Y}" stroke="#000" stroke-width="1" />
    <line x1="680" y1="250" x2="680" y2="${row3Y}" stroke="#000" stroke-width="1" />
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
      <text x="350" y="400" font-family="sans-serif" font-size="48" font-weight="bold" fill="rgba(255, 0, 0, 0.15)" text-anchor="middle" transform="rotate(-30, 350, 400)">
        ${watermarkText}
      </text>
    `;
  }

  return `
  <svg width="700" height="800" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="noiseBlur">
        <feGaussianBlur stdDeviation="${blurLevel}" />
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="${isNoisy ? "#f9f8f5" : "#ffffff"}" stroke="#cccccc" stroke-width="1" />
    <g ${noiseFilter} ${transform}>
      <!-- Title -->
      <text x="350" y="45" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="#000">${sellerName}</text>
      <text x="350" y="75" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#000">電子發票證明聯</text>
      <text x="350" y="100" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#000">${tradingDate}</text>
      
      <!-- Top Left Info -->
      <text x="20" y="130" font-family="sans-serif" font-size="14" fill="#000">發票號碼: ${voucherNumber}</text>
      <text x="20" y="155" font-family="sans-serif" font-size="14" fill="#000">買　　方: ${buyerName}</text>
      <text x="20" y="180" font-family="sans-serif" font-size="14" fill="#000">統一編號: ${dropBuyerTaxId ? "--------" : taxId}</text>
      <text x="20" y="205" font-family="sans-serif" font-size="14" fill="#000">地　　址: </text>
      
      <!-- Top Right Info -->
      <text x="450" y="130" font-family="sans-serif" font-size="14" fill="#000">格　　式: 25</text>
      <text x="450" y="155" font-family="sans-serif" font-size="14" fill="#000">隨 機 碼: ${randomCode}</text>
      
      <text x="680" y="240" font-family="sans-serif" font-size="14" fill="#000" text-anchor="end">第1頁/共1頁</text>
      
      <!-- Table Border Top -->
      <line x1="20" y1="250" x2="680" y2="250" stroke="#000" stroke-width="1" />
      
      <!-- Table Header -->
      <text x="120" y="270" font-family="sans-serif" font-size="14" fill="#000" text-anchor="middle">品名</text>
      <text x="275" y="270" font-family="sans-serif" font-size="14" fill="#000" text-anchor="middle">數量</text>
      <text x="370" y="270" font-family="sans-serif" font-size="14" fill="#000" text-anchor="middle">單價</text>
      <text x="470" y="270" font-family="sans-serif" font-size="14" fill="#000" text-anchor="middle">金額</text>
      <text x="600" y="270" font-family="sans-serif" font-size="14" fill="#000" text-anchor="middle">備註</text>
      
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
      
      <!-- Info: (20260519 - Julian) 右下角賣方專用章資訊塊 -->
      <text x="525" y="${tableBottomY + 20}" font-family="sans-serif" font-size="11" fill="#000">營業人蓋統一發票專用章</text>
      ${sellerNameChunks.map((chunk, i) => `<text x="525" y="${tableBottomY + 40 + i * 20}" font-family="sans-serif" font-size="11" fill="#000">${i === 0 ? "賣　　方: " : "　　　　  "}${chunk}</text>`).join("\n      ")}
      <text x="525" y="${tableBottomY + 40 + extraLines * 20 + 20}" font-family="sans-serif" font-size="11" fill="#000">統一編號: ${sellerTaxId}</text>
      <text x="525" y="${tableBottomY + 40 + extraLines * 20 + 40}" font-family="sans-serif" font-size="11" fill="#000">地　　址: </text>
      
      ${esgText}
      
      <text x="350" y="780" font-family="sans-serif" font-size="12" text-anchor="middle" fill="#777">模擬憑證 - iSunFA End-to-End Test (Golden Dataset)</text>
      ${watermark}
    </g>
    ${noiseOverlay}
  </svg>
  `;
};

export const generateReceiptImages = (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/2024`);
  const vouchersPath = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "phase5_articulation_test",
    "simulated_vouchers.json",
  );
  const receiptsDir = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "phase5_articulation_test",
    "receipts",
  );

  if (!fs.existsSync(vouchersPath)) {
    console.error(`[ERROR] simulated_vouchers.json not found for ${stockId}.`);
    process.exit(1);
  }

  if (fs.existsSync(receiptsDir)) {
    fs.rmSync(receiptsDir, { recursive: true, force: true });
  }
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

  vouchers.forEach((voucher) => {
    // Info: (20260502 - Tzuhan) 僅為外部供應商或現金交易產生實體憑證。
    // Info: (20260502 - Tzuhan) 略過如折舊等無實體憑證的內部調整。
    if (voucher.voucherNumber.startsWith("ADJ-")) return;

    // Info: (20260502 - Tzuhan) 找出主要的分錄以取得描述與金額
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

    // Info: (20260519 - Julian) 模擬金額拆分與營業稅計算 (5%)
    const totalAmount =
      mainLine.debitAmount > 0 ? mainLine.debitAmount : mainLine.creditAmount;

    // Info: (20260519 - Julian) 計算含稅反推未稅
    const totalDecimal = new Decimal(totalAmount);
    // Info: (20260519 - Julian) netAmount = Math.round(total / 1.05)
    const netAmountDecimal = totalDecimal
      .div(1.05)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    const taxAmountDecimal = totalDecimal.minus(netAmountDecimal);

    const items = splitIntoItems(
      netAmountDecimal.toNumber(),
      mainLine.description,
    );

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
    };

    const isNoisy = Math.random() < 0.15;
    if (isNoisy) noiseCount++;

    const svgContent = buildReceiptSVG(params, isNoisy);

    const svgPath = path.join(receiptsDir, `${voucher.voucherNumber}.svg`);
    fs.writeFileSync(svgPath, svgContent.trim(), "utf-8");
    generatedCount++;
  });

  console.log(
    `[SUCCESS] Generated ${generatedCount} receipt SVGs (including ${noiseCount} noisy ones) for ${stockId} in ${receiptsDir}.`,
  );
};

// Info: (20260502 - Tzuhan) 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  if (!targetStock) {
    console.error(
      "Please provide a stock ID. Usage: tsx receipt_image_generator.ts 1538",
    );
    process.exit(1);
  }
  generateReceiptImages(targetStock);
}
