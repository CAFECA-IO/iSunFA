import * as fs from "fs";
import * as path from "path";

interface ISimulatedVoucherLine {
  id: string;
  description: string;
  accountingCode: string;
  debitAmount: number;
  creditAmount: number;
  vendor?: string;
}

interface ISimulatedVoucher {
  id: string;
  tradingDate: string;
  voucherNumber: string;
  lines: ISimulatedVoucherLine[];
}

// Generates a random Tax ID
const generateTaxId = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

export const generateReceiptImages = (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}`);
  const vouchersPath = path.join(dataDir, "simulated_vouchers.json");
  const receiptsDir = path.join(dataDir, "receipts");

  if (!fs.existsSync(vouchersPath)) {
    console.error(`[ERROR] simulated_vouchers.json not found for ${stockId}.`);
    process.exit(1);
  }

  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
  }

  const vouchers = JSON.parse(
    fs.readFileSync(vouchersPath, "utf-8"),
  ) as ISimulatedVoucher[];

  let generatedCount = 0;
  let noiseCount = 0;

  vouchers.forEach((voucher) => {
    // Only generate physical receipts for transactions with external vendors or cash payments.
    // Skip internal adjustments like depreciation (which has no physical receipt).
    if (voucher.voucherNumber.startsWith("ADJ-")) return;

    // Identify the main line for description and amount
    const mainLine =
      voucher.lines.find((l) => l.debitAmount > 0) || voucher.lines[0];
    const vendorName = mainLine.vendor || "現金交易客戶/供應商";
    const amount =
      mainLine.debitAmount > 0 ? mainLine.debitAmount : mainLine.creditAmount;
    const date = new Date(voucher.tradingDate).toISOString().split("T")[0];
    const taxId = generateTaxId();

    // 15% Chance to inject extreme noise (blur, missing data)
    const isNoisy = Math.random() < 0.15;
    let svgContent = "";

    if (isNoisy) {
      noiseCount++;
      // NOISE: Randomly drop Tax ID or Date, add blur filter, add random strike-through lines
      const dropTaxId = Math.random() < 0.5;
      const dropDate = Math.random() < 0.3;
      const blurLevel = (Math.random() * 2 + 1).toFixed(1); // 1.0 to 3.0 blur

      svgContent = `
      <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="noiseBlur">
            <feGaussianBlur stdDeviation="${blurLevel}" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="#f4f1ea" />
        <g filter="url(#noiseBlur)" transform="rotate(${Math.random() * 4 - 2}, 200, 300)">
          <text x="200" y="80" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#333">${vendorName}</text>
          <text x="200" y="120" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#555">電子發票證明聯 (DIRTY)</text>
          
          <line x1="40" y1="150" x2="360" y2="150" stroke="#999" stroke-width="2" stroke-dasharray="5,5" />
          
          <text x="50" y="200" font-family="monospace" font-size="16" fill="#333">日期: ${dropDate ? "XX/XX" : date}</text>
          <text x="50" y="240" font-family="monospace" font-size="16" fill="#333">統編: ${dropTaxId ? "--------" : taxId}</text>
          
          <text x="50" y="300" font-family="sans-serif" font-size="16" fill="#333">品名: ${mainLine.description}</text>
          <text x="50" y="340" font-family="sans-serif" font-size="16" fill="#333">金額: NT$ ${amount.toLocaleString()}</text>
          
          <line x1="40" y1="400" x2="360" y2="400" stroke="#999" stroke-width="2" />
          <text x="200" y="450" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#777">模擬雜訊憑證 - iSunFA End-to-End Test</text>
        </g>
        <!-- Random noise artifacts (scratches / folds) -->
        <path d="M 0 ${Math.random() * 600} Q 200 ${Math.random() * 600} 400 ${Math.random() * 600}" stroke="#rgba(0,0,0,0.2)" stroke-width="3" fill="transparent" />
        <path d="M ${Math.random() * 400} 0 L ${Math.random() * 400} 600" stroke="#rgba(0,0,0,0.1)" stroke-width="10" />
      </svg>
      `;
    } else {
      // CLEAN: Perfect receipt
      svgContent = `
      <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff" stroke="#cccccc" stroke-width="2" />
        <text x="200" y="80" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#000">${vendorName}</text>
        <text x="200" y="120" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#333">電子發票證明聯</text>
        
        <line x1="40" y1="150" x2="360" y2="150" stroke="#000" stroke-width="2" />
        
        <text x="50" y="200" font-family="monospace" font-size="16" fill="#000">日期: ${date}</text>
        <text x="50" y="240" font-family="monospace" font-size="16" fill="#000">統編: ${taxId}</text>
        
        <text x="50" y="300" font-family="sans-serif" font-size="16" fill="#000">品名: ${mainLine.description}</text>
        <text x="50" y="340" font-family="sans-serif" font-size="16" fill="#000">金額: NT$ ${amount.toLocaleString()}</text>
        
        <line x1="40" y1="400" x2="360" y2="400" stroke="#000" stroke-width="2" />
        <text x="200" y="450" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#555">模擬完美憑證 - iSunFA End-to-End Test</text>
      </svg>
      `;
    }

    const svgPath = path.join(receiptsDir, `${voucher.voucherNumber}.svg`);
    fs.writeFileSync(svgPath, svgContent.trim(), "utf-8");
    generatedCount++;
  });

  console.log(
    `[SUCCESS] Generated ${generatedCount} receipt SVGs (including ${noiseCount} noisy ones) for ${stockId} in ${receiptsDir}.`,
  );
};

// If run directly
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
