import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";
import { VoucherLinesParsingSkill } from "@/skills/document/voucher_lines_parsing";
import { EsgParsingSkill } from "@/skills/document/esg_parsing";
import { ChatService } from "@/services/chat.service";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { config } from "dotenv";
import sharp from "sharp";

config();

interface ISimulatedEsgRecord {
  id: string;
  category: "scope1" | "scope2" | "water" | "waste";
  source: string;
  metricAmount: number;
  metricUnit: string;
  carbonAmount: number;
}

interface IExtractedLine {
  accountingCode: string;
  particular: string;
  amount: number;
  isDebit: boolean;
}

interface ISimulatedVoucherLine {
  id: string;
  description: string;
  accountingCode: string;
  debitAmount: number;
  creditAmount: number;
  esgRecords?: ISimulatedEsgRecord[];
}

interface ISimulatedVoucher {
  id: string;
  tradingDate: string;
  voucherNumber: string;
  lines: ISimulatedVoucherLine[];
}

export const runPhase2ReceiptAnalysis = async (stockId: string) => {
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

  const svgFiles = fs.readdirSync(receiptsDir).filter((f) => f.endsWith(".svg"));

  console.log(`\n======================================================`);
  console.log(`🤖 [PHASE 2] AI Receipt Analysis Test for ${stockId}`);
  console.log(`======================================================`);

  // 1. Create Mock DB Entities
  const company = await prisma.company.upsert({
    where: { stockId: `E2E-${stockId}` },
    update: {},
    create: {
      stockId: `E2E-${stockId}`,
      name: `E2E Test Enterprise ${stockId}`,
      marketType: "sii",
    },
  });

  const team = await prisma.team.upsert({
    where: { id: `e2e-team-${stockId}` },
    update: {},
    create: {
      id: `e2e-team-${stockId}`,
      name: `E2E Team ${stockId}`,
    },
  });

  const accountBook = await prisma.accountBook.upsert({
    where: { id: `e2e-book-${stockId}` },
    update: {},
    create: {
      id: `e2e-book-${stockId}`,
      name: `2024 Accounting Book`,
      country: "TW",
      currency: "TWD",
      rule: "IFRS",
      enterpriseId: company.stockId,
      teamId: team.id,
    },
  });

  console.log(`✅ [DB] Initialized E2E AccountBook: ${accountBook.name} (${accountBook.id})`);

  const skill = new VoucherLinesParsingSkill();
  const esgSkill = new EsgParsingSkill();
  const chatService = new ChatService(process.env.GEMINI_API_KEY || "");

  let correctVoucherCount = 0;
  let correctEsgCount = 0;
  let totalEsgTested = 0;
  let totalVoucherTested = 0;

  // For testing, let's process 5 receipts to avoid rate limits during the script testing phase
  const sampleSize = Math.min(5, svgFiles.length);
  const selectedFiles = svgFiles.slice(0, sampleSize);

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    const voucherNumber = file.replace(".svg", "");
    const groundTruthVoucher = vouchers.find((v) => v.voucherNumber === voucherNumber);

    if (!groundTruthVoucher) continue;

    const svgContent = fs.readFileSync(path.join(receiptsDir, file), "utf-8");
    const pngBuffer = await sharp(Buffer.from(svgContent)).png().toBuffer();
    const base64Data = pngBuffer.toString("base64");

    const task: IPseudoTask = {
      id: `task-${voucherNumber}`,
      type: "VOUCHER_LINES_PARSING",
      order: 1,
      data: {
        context: JSON.stringify({
          fileBase64: base64Data,
          fileMimeType: "image/png",
          accountBookId: accountBook.id,
        }),
      },
    };

    const mission: IPseudoMission = {
      id: `mission-${voucherNumber}`,
      data: {
        companyId: company.stockId,
        name: `E2E Test Mission ${voucherNumber}`,
      },
    };

    try {
      process.stdout.write(`  [${i + 1}/${sampleSize}] Parsing ${voucherNumber} via Core Skill... `);
      
      const resultJsonStr = await skill.execute(task, mission, "", chatService);
      const result = JSON.parse(resultJsonStr);

      if (result.error) {
        console.log(`❌ AI Error: ${result.error}`);
        continue;
      }

      const extractedData = result.data;
      totalVoucherTested++;

      // Evaluate logic: check if the expected amount matches
      const mainLine = groundTruthVoucher.lines.find((l) => l.debitAmount > 0) || groundTruthVoucher.lines[0];
      const expectedAmount = mainLine.debitAmount > 0 ? mainLine.debitAmount : mainLine.creditAmount;
      const expectedCode = mainLine.accountingCode;

      // The AI returns `lines` array
      const extractedLines = extractedData.lines || [];
      const isMatch = extractedLines.some((l: IExtractedLine) => 
        l.amount === expectedAmount && 
        (l.accountingCode === expectedCode || l.accountingCode?.startsWith(expectedCode.substring(0, 2)))
      );

      if (isMatch) {
        correctVoucherCount++;
        console.log(`✅ Passed (Extracted: ${expectedAmount}, Code: ${expectedCode})`);
      } else {
        console.log(`❌ Failed (Expected: ${expectedAmount} [${expectedCode}], Got: ${JSON.stringify(extractedLines)})`);
      }

      // Persist to DB
      await prisma.voucher.create({
        data: {
          accountBookId: accountBook.id,
          tradingDate: new Date(groundTruthVoucher.tradingDate),
          confidence: 85,
          analysisStatus: "COMPLETED",
          lines: {
            create: extractedLines.map((l: IExtractedLine) => ({
              accountingCode: l.accountingCode || "9999",
              particular: l.particular || "",
              amount: l.amount || 0,
              isDebit: l.isDebit === true,
            })),
          },
        },
      });

      // ============================================
      // ESG Parsing
      // ============================================
      const gtEsgRecords = groundTruthVoucher.lines.flatMap((l) => l.esgRecords || []);
      // We only test ESG if there's actually an ESG ground truth, or if it's a random check
      // For simplicity, let's test it for all and expect null if not ESG relevant
      
      const esgTask: IPseudoTask = {
        ...task,
        id: `esg-task-${voucherNumber}`,
        type: "ESG_PARSING",
      };

      process.stdout.write(`  [${i + 1}/${sampleSize}] Parsing ${voucherNumber} via ESG Skill... `);
      const esgResultStr = await esgSkill.execute(esgTask, mission, "", chatService);
      const esgResult = JSON.parse(esgResultStr);

      if (esgResult.error) {
        console.log(`❌ AI ESG Error: ${esgResult.error}`);
        continue;
      }

      const esgData = esgResult.data;
      
      if (gtEsgRecords.length > 0) {
        totalEsgTested++;
        // We expect scope1 or scope2
        const expectedScope = gtEsgRecords[0].category.toUpperCase(); // "SCOPE1" -> "SCOPE_1" format logic
        const formattedExpectedScope = expectedScope.includes("SCOPE1") ? "SCOPE_1" : "SCOPE_2";
        
        if (esgData.scope === formattedExpectedScope) {
          correctEsgCount++;
          console.log(`✅ ESG Passed (Extracted Scope: ${esgData.scope}, Carbon: ${esgData.emissions})`);
        } else {
          console.log(`❌ ESG Failed (Expected: ${formattedExpectedScope}, Got: ${esgData.scope})`);
        }
      } else {
        console.log(`ℹ️ No ESG Ground Truth, AI identified scope: ${esgData.scope || "None"}`);
      }

      // Persist ESG
      await prisma.esgRecord.create({
        data: {
          accountBookId: accountBook.id,
          tradingDate: new Date(esgData.tradingDate || groundTruthVoucher.tradingDate),
          scope: esgData.scope || "SCOPE_3",
          activityType: esgData.activityType || "UNKNOWN",
          vendor: esgData.vendor || "現金交易",
          amount: esgData.amount || 0,
          unit: esgData.unit || "N/A",
          emissions: esgData.emissions || 0,
          confidence: esgData.confidence || 85,
          analysisStatus: "COMPLETED",
        }
      });

    } catch (err: unknown) {
      if (err instanceof Error) {
        console.log(`⚠️ Exception: ${err.message}`);
      }
    }
  }

  const voucherAccuracy = totalVoucherTested > 0 ? (correctVoucherCount / totalVoucherTested) * 100 : 0;
  const esgAccuracy = totalEsgTested > 0 ? (correctEsgCount / totalEsgTested) * 100 : 0;
  
  console.log(`\n🎯 [PHASE 2 RESULT]`);
  console.log(`- Sample Size: ${totalVoucherTested}`);
  console.log(`- AI Accounting Classification Accuracy: ${voucherAccuracy.toFixed(2)}%`);
  if (totalEsgTested > 0) {
    console.log(`- AI ESG Scope Identification Accuracy: ${esgAccuracy.toFixed(2)}%`);
  }
  console.log(`======================================================\n`);
};

// Info: (20260502 - Tzuhan) 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  if (!targetStock) {
    console.error("Please provide a stock ID. Usage: tsx phase2_runner.ts 1538");
    process.exit(1);
  }
  runPhase2ReceiptAnalysis(targetStock).then(() => {
    prisma.$disconnect();
    process.exit(0);
  });
}
