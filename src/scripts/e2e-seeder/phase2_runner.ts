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
  // Info: (20260503 - Tzuhan) 優先使用環境變數指定的 USER_ID，否則自動抓資料庫中第一位使用者（讓每個開發者的本地環境都能通用）
  const envUserId = process.env.E2E_USER_ID;
  let user = envUserId ? await prisma.user.findUnique({ where: { id: envUserId } }) : null;

  if (!user) {
    user = await prisma.user.findFirst();
  }

  // Info: (20260503 - Tzuhan) 如果資料庫是空的 (CI/CD 環境)，則建立預設測試帳號
  if (!user) {
    const defaultUserId = "e2e-system-user-0001";
    user = await prisma.user.upsert({
      where: { id: defaultUserId },
      update: {},
      create: {
        id: defaultUserId,
        address: `e2e-address-${defaultUserId}`,
        name: "E2E Test User",
      }
    });
  }

  const team = await prisma.team.upsert({
    where: { id: `e2e-global-test-team` },
    update: {},
    create: {
      id: `e2e-global-test-team`,
      name: `E2E Testing Team`,
    },
  });

  const teamMember = await prisma.teamMember.findFirst({
    where: { teamId: team.id, userId: user.id }
  });

  if (!teamMember) {
    await prisma.teamMember.create({
      data: {
        id: `e2e-tm-global-${user.id.substring(0, 8)}`,
        teamId: team.id,
        userId: user.id,
        role: "OWNER",
      }
    });
  }

  const accountBook = await prisma.accountBook.upsert({
    where: { id: `e2e-book-${stockId}` },
    update: {},
    create: {
      id: `e2e-book-${stockId}`,
      name: `[E2E-${stockId}] 2024 Accounting Book`,
      country: "TW",
      currency: "TWD",
      rule: "IFRS",
      enterpriseId: stockId,
      teamId: team.id,
    },
  });

  console.log(`✅ [DB] Initialized E2E AccountBook: ${accountBook.name} (${accountBook.id})`);

  // Info: (20260503 - Tzuhan) 每次重新執行前，先清空該 AccountBook 之前的模擬傳票與 ESG 紀錄，確保資料冪等性 (Idempotent) 不會重複疊加
  const existingVouchers = await prisma.voucher.findMany({ where: { accountBookId: accountBook.id }, select: { id: true } });
  if (existingVouchers.length > 0) {
    const voucherIds = existingVouchers.map(v => v.id);
    await prisma.voucherLine.deleteMany({ where: { voucherId: { in: voucherIds } } });
    await prisma.voucher.deleteMany({ where: { id: { in: voucherIds } } });
  }
  await prisma.esgRecord.deleteMany({ where: { accountBookId: accountBook.id } });
  console.log(`🧹 [DB] Cleared previous Vouchers and ESG records for AccountBook: ${accountBook.id} to ensure clean state.`);

  const skill = new VoucherLinesParsingSkill();
  const esgSkill = new EsgParsingSkill();
  const chatService = new ChatService(process.env.GEMINI_API_KEY || "");

  let correctVoucherCount = 0;
  let correctEsgCount = 0;
  let totalEsgTested = 0;
  let totalVoucherTested = 0;

  // Info: (20260503 - Tzuhan) 處理所有傳票，以達成 100% 準確率的全量擴展測試
  const sampleSize = svgFiles.length;
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
        companyId: stockId,
        name: `E2E Test Mission ${voucherNumber}`,
      },
    };

    try {
      const corePrompt = `請分析這張傳票/單據圖片，並將其轉換為會計分錄。
請回傳一個 JSON 格式的物件，且格式必須為：
{
  "lines": [
    {
      "accountingCode": "4111",
      "particular": "摘要說明",
      "amount": 2253680,
      "isDebit": false
    }
  ]
}

【請注意，你必須只能從以下會計項目代碼中選擇最符合的】：
- 1111: 現金 (資產)
- 4111: 銷貨收入 (收入)
- 6161: 水電瓦斯費 (營業費用)
- 6213: 交通費/公務車燃油費 (營業費用)
- 6288: 其他管理費用 (營業費用)
- 6184: 折舊費用 (營業費用)
- 1521: 累計折舊 (資產抵銷)

確保數字準確，借貸平衡，不可有任何 markdown 標籤或其餘文字，直接輸出 JSON 即可。`;

      process.stdout.write(`  [${i + 1}/${sampleSize}] Parsing ${voucherNumber} via Core Skill... `);
      
      const resultJsonStr = await skill.execute(task, mission, corePrompt, chatService);
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
          userId: user.id,
          tradingDate: new Date(groundTruthVoucher.tradingDate),
          confidence: 85,
          analysisStatus: "COMPLETED",
          isVerified: true,
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

      const esgPrompt = `請分析這張單據的碳排與 ESG 數據。
請回傳一個 JSON 格式的物件，且格式必須為：
{
  "scope": "SCOPE_2",
  "activityType": "用電",
  "vendor": "台灣電力公司",
  "amount": 5000,
  "unit": "度",
  "emissions": 2.47,
  "confidence": 95
}
若無碳排資訊，請合理給予 SCOPE_3 或預設值。不可有任何 markdown 標籤，直接輸出 JSON 即可。`;

      process.stdout.write(`  [${i + 1}/${sampleSize}] Parsing ${voucherNumber} via ESG Skill... `);
      const esgResultStr = await esgSkill.execute(esgTask, mission, esgPrompt, chatService);
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
          userId: user.id,
          tradingDate: new Date(esgData.tradingDate || groundTruthVoucher.tradingDate),
          scope: esgData.scope || "SCOPE_3",
          activityType: esgData.activityType || "UNKNOWN",
          vendor: esgData.vendor || "現金交易",
          amount: esgData.amount || 0,
          unit: esgData.unit || "N/A",
          emissions: esgData.emissions || 0,
          confidence: esgData.confidence || 85,
          analysisStatus: "COMPLETED",
          isVerified: true,
        }
      });

      // Rate Limit Delay removed since user is on a paid Gemini tier
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.log(`⚠️ Exception: ${err.message}`);
      }
    }
    
    // Info: (20260503 - Tzuhan) 增加 2 秒延遲，避免觸發 Gemini API Rate Limit (429 Too Many Requests)
    await new Promise((resolve) => setTimeout(resolve, 2000));
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
