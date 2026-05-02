import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("FATAL: GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  },
});

interface ISimulatedVoucherLine {
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

export const runOcrStressTest = async (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}`);
  const receiptsDir = path.join(dataDir, "receipts");
  const vouchersPath = path.join(dataDir, "simulated_vouchers.json");

  if (!fs.existsSync(receiptsDir) || !fs.existsSync(vouchersPath)) {
    console.error(`[ERROR] Missing receipts or vouchers for ${stockId}.`);
    process.exit(1);
  }

  const vouchers = JSON.parse(
    fs.readFileSync(vouchersPath, "utf-8"),
  ) as ISimulatedVoucher[];

  // Get all SVG files
  const svgFiles = fs
    .readdirSync(receiptsDir)
    .filter((f) => f.endsWith(".svg"));

  // To avoid hitting API rate limits or taking 10 minutes, we will randomly sample 10 SVGs (5 clean, 5 dirty if possible)
  const sampleSize = Math.min(10, svgFiles.length);
  const selectedFiles = svgFiles
    .sort(() => 0.5 - Math.random())
    .slice(0, sampleSize);

  console.log(
    `\n🤖 [OCR STRESS TEST] Starting AI parsing on ${selectedFiles.length} sampled receipts...`,
  );

  let correctCount = 0;
  const testResults = [];

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    const voucherNumber = file.replace(".svg", "");
    const isDirty = fs
      .readFileSync(path.join(receiptsDir, file), "utf-8")
      .includes("DIRTY");

    // Find ground truth
    const groundTruthVoucher = vouchers.find(
      (v) => v.voucherNumber === voucherNumber,
    );
    if (!groundTruthVoucher) continue;

    const mainLine =
      groundTruthVoucher.lines.find((l) => l.debitAmount > 0) ||
      groundTruthVoucher.lines[0];
    const expectedAmount =
      mainLine.debitAmount > 0 ? mainLine.debitAmount : mainLine.creditAmount;

    // Send to Gemini
    const svgContent = fs.readFileSync(path.join(receiptsDir, file), "utf-8");
    const prompt = `
      You are an OCR extraction engine. Below is the raw SVG code of a physical receipt/invoice.
      Some receipts are marked as DIRTY and have missing or blurred fields.
      If a field has "XX/XX" or "--------" or seems obscured, return null for it.
      
      Extract the following information and return pure JSON:
      {
        "amount": 1000, // Number, the total amount
        "date": "2024-05-12", // String, YYYY-MM-DD format
        "isLegible": true // Boolean, false if you think it's too dirty or missing critical data
      }

      [SVG CONTENT]:
      ${svgContent}
    `;

    try {
      process.stdout.write(
        `  [${i + 1}/${selectedFiles.length}] Parsing ${voucherNumber} (Dirty: ${isDirty})... `,
      );
      const result = await model.generateContent(prompt);
      const aiResponse = JSON.parse(result.response.text());

      const amountMatched = aiResponse.amount === expectedAmount;
      // We only strictly check amount here for the stress test pass/fail

      if (amountMatched) {
        correctCount++;
        console.log("✅ Passed");
      } else {
        console.log("❌ Failed");
      }

      testResults.push({
        voucherNumber,
        isDirty,
        expectedAmount,
        aiExtractedAmount: aiResponse.amount,
        aiExtractedDate: aiResponse.date,
        isLegibleFlag: aiResponse.isLegible,
        amountMatched,
      });
    } catch {
      console.log("⚠️ API Error/Timeout");
    }
  }

  const accuracy = (correctCount / selectedFiles.length) * 100;

  const report = {
    metadata: {
      stockId,
      timestamp: new Date().toISOString(),
      sampleSize: selectedFiles.length,
      accuracyRate: `${accuracy}%`,
    },
    results: testResults,
  };

  const reportPath = path.join(dataDir, "ocr_stress_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n🎯 [OCR STRESS TEST RESULT]`);
  console.log(`- Sample Size: ${selectedFiles.length}`);
  console.log(`- Exact Amount Matches: ${correctCount}`);
  console.log(`- Accuracy: ${accuracy}%`);
  console.log(
    `📄 Saved detailed report to data/${stockId}/ocr_stress_report.json`,
  );
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  if (!targetStock) {
    console.error(
      "Please provide a stock ID. Usage: tsx ocr_stress_tester.ts 1538",
    );
    process.exit(1);
  }
  runOcrStressTest(targetStock).then(() => process.exit(0));
}
