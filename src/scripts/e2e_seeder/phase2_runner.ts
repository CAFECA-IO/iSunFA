import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";
import { MoneyUtil } from "@/lib/utils/money";
import { VoucherLinesParsingSkill } from "@/skills/document/voucher_lines_parsing";
import { EsgParsingSkill } from "@/skills/document/esg_parsing";
import { ChatService } from "@/services/chat.service";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { config } from "dotenv";
import sharp from "sharp";
import { Role } from "@/constants/role";
import { MeasurementUnit } from "@/constants/enums";

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

export const runPhase2ReceiptAnalysis = async (
  stockId: string,
  year: string = "2024",
  shouldClean: boolean = false,
) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const receiptsDir = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "receipts",
  );
  const receiptsPngDir = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "receipts_png",
  );
  const vouchersPath = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "simulated_vouchers.json",
  );

  if (!fs.existsSync(receiptsDir) || !fs.existsSync(vouchersPath)) {
    console.error(
      `[ERROR] Missing receipts or vouchers for ${stockId} (${year}).`,
    );
    process.exit(1);
  }

  if (!fs.existsSync(receiptsPngDir)) {
    fs.mkdirSync(receiptsPngDir, { recursive: true });
  }

  const vouchers = JSON.parse(
    fs.readFileSync(vouchersPath, "utf-8"),
  ) as ISimulatedVoucher[];

  const svgFiles = fs
    .readdirSync(receiptsDir)
    .filter((f) => f.endsWith(".svg"));

  console.log(`\n======================================================`);
  console.log(`🤖 [PHASE 2] AI Receipt Analysis Test for ${stockId}`);
  console.log(`======================================================`);

  // Info: (20260504 - Tzuhan) 1. 建立測試用的模擬資料庫實體
  let user = await prisma.user.findFirst({ where: { role: Role.USER } });

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
      },
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
    where: { teamId: team.id, userId: user.id },
  });

  if (!teamMember) {
    await prisma.teamMember.create({
      data: {
        id: `e2e-tm-global-${user.id.substring(0, 8)}`,
        teamId: team.id,
        userId: user.id,
        role: "OWNER",
      },
    });
  }

  const accountBook = await prisma.accountBook.upsert({
    where: { id: `e2e-book-${stockId}` },
    update: {},
    create: {
      id: `e2e-book-${stockId}`,
      name: `[E2E-${stockId}] ${year} Accounting Book`,
      country: "TW",
      currency: "TWD",
      rule: "IFRS",
      enterpriseId: stockId,
      teamId: team.id,
    },
  });

  console.log(
    `✅ [DB] Initialized E2E AccountBook: ${accountBook.name} (${accountBook.id})`,
  );

  // Info: (20260503 - Tzuhan) 如果傳入 `--clean` 參數，先清空該 AccountBook 之前的模擬傳票與 ESG 紀錄，確保資料冪等性 (Idempotent) 不會重複疊加
  if (shouldClean) {
    const existingVouchers = await prisma.voucher.findMany({
      where: { accountBookId: accountBook.id },
      select: { id: true },
    });
    if (existingVouchers.length > 0) {
      const voucherIds = existingVouchers.map((v) => v.id);
      await prisma.voucherLine.deleteMany({
        where: { voucherId: { in: voucherIds } },
      });
      await prisma.voucher.deleteMany({ where: { id: { in: voucherIds } } });
    }
    await prisma.esgRecord.deleteMany({
      where: { accountBookId: accountBook.id },
    });
    console.log(
      `🧹 [DB] Cleared previous Vouchers and ESG records for AccountBook: ${accountBook.id} to ensure clean state.`,
    );
  } else {
    console.log(
      `⏭️  [DB] Skipped cleaning Vouchers and ESG records for AccountBook: ${accountBook.id} (No --clean flag).`,
    );
  }

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
    const groundTruthVoucher = vouchers.find(
      (v) => v.voucherNumber === voucherNumber,
    );

    if (!groundTruthVoucher) continue;

    const svgContent = fs.readFileSync(path.join(receiptsDir, file), "utf-8");
    const pngBuffer = await sharp(Buffer.from(svgContent)).png().toBuffer();

    // Info: (20260504 - Tzuhan) 將轉檔後的 PNG 獨立儲存到 receipts_png 資料夾，方便檢視
    const pngPath = path.join(receiptsPngDir, file.replace(".svg", ".png"));
    fs.writeFileSync(pngPath, pngBuffer);

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
      "semanticCategory": "TELECOM_FEES",
      "particular": "摘要說明",
      "amount": 2253680,
      "isDebit": false
    }
  ]
}

【請注意，你必須從 UniversalAccountTag 列舉中選擇最符合的 semanticCategory，若無合適選項請填寫 UNKNOWN】。

確保數字準確，借貸平衡，不可有任何 markdown 標籤或其餘文字，直接輸出 JSON 即可。`;

      process.stdout.write(
        `  [${i + 1}/${sampleSize}] Parsing ${voucherNumber} via Core Skill... `,
      );

      let attempt = 0;
      const maxAttempts = 5;
      let result;

      while (attempt < maxAttempts) {
        try {
          const resultJsonStr = await skill.execute(
            task,
            mission,
            corePrompt,
            chatService,
          );
          result = JSON.parse(resultJsonStr);

          if (result.error) {
            console.log(
              `❌ AI Error on attempt ${attempt + 1}: ${result.error}`,
            );
            if (
              String(result.error).includes("429") ||
              String(result.error).includes("Too Many") ||
              String(result.error).includes("Quota")
            ) {
              const delay = 2000 * Math.pow(2, attempt);
              console.log(`⏳ Rate limited. Backing off for ${delay}ms...`);
              await new Promise((res) => setTimeout(res, delay));
              attempt++;
              continue;
            } else {
              // Info: (20260525 - Tzuhan) Not a rate limit error, but still failed. Retry a few times just in case it's transient.
              const delay = 2000 * Math.pow(2, attempt);
              await new Promise((res) => setTimeout(res, delay));
              attempt++;
              continue;
            }
          }
          break; // Info: (20260525 - Tzuhan) Success
        } catch (e) {
          console.log(`❌ AI Exception on attempt ${attempt + 1}: ${e}`);
          const delay = 2000 * Math.pow(2, attempt);
          await new Promise((res) => setTimeout(res, delay));
          attempt++;
        }
      }

      if (!result || result.error) {
        console.error(
          `🚨 FATAL: AI extraction failed for ${voucherNumber} after ${maxAttempts} attempts. Terminating pipeline to avoid silent drops.`,
        );
        process.exit(1);
      }

      const extractedData = result.data;
      totalVoucherTested++;

      // Info: (20260504 - Tzuhan) 評估邏輯：檢查預期的金額是否相符
      const mainLine =
        groundTruthVoucher.lines.find((l) => l.debitAmount > 0) ||
        groundTruthVoucher.lines[0];
      const expectedAmount =
        mainLine.debitAmount > 0 ? mainLine.debitAmount : mainLine.creditAmount;
      const expectedCode = mainLine.accountingCode;

      // Info: (20260504 - Tzuhan) AI 應該回傳 `lines` 陣列
      const extractedLines = extractedData.lines || [];
      const isMatch = extractedLines.some(
        (l: IExtractedLine) =>
          l.amount === expectedAmount &&
          (l.accountingCode === expectedCode ||
            l.accountingCode?.startsWith(expectedCode.substring(0, 2))),
      );

      if (isMatch) {
        correctVoucherCount++;
        console.log(
          `✅ Passed (Extracted: ${expectedAmount}, Code: ${expectedCode})`,
        );
      } else {
        console.log(
          `❌ Failed (Expected: ${expectedAmount} [${expectedCode}], Got: ${JSON.stringify(extractedLines)})`,
        );
      }

      // Info: (20260504 - Tzuhan) 寫入資料庫保存
      await prisma.voucher.create({
        data: {
          accountBookId: accountBook.id,
          userId: user.id,
          tradingDate: new Date(groundTruthVoucher.tradingDate),
          confidence: 85,
          analysisStatus: "COMPLETED",
          lines: {
            create: extractedLines.map((l: IExtractedLine) => ({
              accountingCode: l.accountingCode || "9999",
              particular: l.particular || "",
              amount: BigInt(
                MoneyUtil.toDecimal(l.amount || 0)
                  .round()
                  .toString(),
              ),
              isDebit: l.isDebit === true,
            })),
          },
        },
      });

      // Info: (20260504 - Tzuhan) ============================================
      // Info: (20260504 - Tzuhan) ESG 碳排放解析
      // Info: (20260504 - Tzuhan) ============================================
      const gtEsgRecords = groundTruthVoucher.lines.flatMap(
        (l) => l.esgRecords || [],
      );
      // Info: (20260504 - Tzuhan) 只有當具有 ESG 真實答案，或是隨機檢查時，我們才進行 ESG 測試
      // Info: (20260504 - Tzuhan) 為求簡化，我們全部測試並預期若與 ESG 無關時回傳 null

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
  "unit": "KWH",
  "fallbackCategory": "電力與能源",
  "confidence": 95
}
注意：
1. 若系統無對應係數，請根據行業知識估算 "fallbackCategory"，嚴禁自行推估係數或計算最終 emissions。
2. 若無碳排資訊，請合理給予 SCOPE_3 或預設值。不可有任何 markdown 標籤，直接輸出 JSON 即可。`;

      process.stdout.write(
        `  [${i + 1}/${sampleSize}] Parsing ${voucherNumber} via ESG Skill... `,
      );
      const esgResultStr = await esgSkill.execute(
        esgTask,
        mission,
        esgPrompt,
        chatService,
      );
      const esgResult = JSON.parse(esgResultStr);

      if (esgResult.error) {
        console.log(`❌ AI ESG Error: ${esgResult.error}`);
        continue;
      }

      const esgData = esgResult.data;

      if (gtEsgRecords.length > 0) {
        totalEsgTested++;
        // Info: (20260504 - Tzuhan) 預期分類應為 scope1 或 scope2 或 scope3
        const expectedScope = gtEsgRecords[0].category.toUpperCase(); // Info: (20260504 - Tzuhan) "SCOPE1" -> "SCOPE_1" 格式邏輯
        let formattedExpectedScope = "SCOPE_2";
        if (expectedScope.includes("SCOPE1"))
          formattedExpectedScope = "SCOPE_1";
        if (expectedScope.includes("SCOPE3"))
          formattedExpectedScope = "SCOPE_3";

        if (esgData.scope === formattedExpectedScope) {
          correctEsgCount++;
          console.log(
            `✅ ESG Passed (Extracted Scope: ${esgData.scope}, Fallback Category: ${esgData.fallbackCategory || "None"})`,
          );
        } else {
          console.log(
            `❌ ESG Failed (Expected: ${formattedExpectedScope}, Got: ${esgData.scope})`,
          );
        }
      } else {
        console.log(
          `ℹ️ No ESG Ground Truth, AI identified scope: ${esgData.scope || "None"}`,
        );
      }

      // Info: (20260504 - Tzuhan) 將 ESG 紀錄寫入資料庫
      await prisma.esgRecord.create({
        data: {
          accountBookId: accountBook.id,
          userId: user.id,
          tradingDate: new Date(
            esgData.tradingDate || groundTruthVoucher.tradingDate,
          ),
          scope: esgData.scope || "SCOPE_3",
          activityType: esgData.activityType || "UNKNOWN",
          vendor: esgData.vendor || "現金交易",
          amount: String(esgData.amount || "0"),
          unit: esgData.unit || MeasurementUnit.KG,
          emissions: String((esgData.amount || 0) * 1.5), // Info: (20260519 - Tzuhan) 模擬後端 MAX(factor) 行為
          isVerified: false,
          aiNote: `[AI_SPECULATIVE] E2E 模擬已套用最高係數. 原註記: ${esgData.aiNote || "系統預設給定之猜測數值"}`,
          confidence: esgData.confidence || 85,
          analysisStatus: "COMPLETED",
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.log(`⚠️ Exception: ${err.message}`);
      }
    }

    // Info: (20260503 - Tzuhan) 增加 2 秒延遲，避免觸發 Gemini API Rate Limit (429 Too Many Requests)
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const voucherAccuracy =
    totalVoucherTested > 0
      ? (correctVoucherCount / totalVoucherTested) * 100
      : 0;
  const esgAccuracy =
    totalEsgTested > 0 ? (correctEsgCount / totalEsgTested) * 100 : 0;

  // Info: (20260503 - Tzuhan) 手動寫入無法透過 OCR 解析的內部調整傳票 (例如: 期末折舊)
  const adjVouchers = vouchers.filter((v) =>
    v.voucherNumber.startsWith("ADJ-"),
  );
  for (const adjV of adjVouchers) {
    await prisma.voucher.create({
      data: {
        accountBookId: accountBook.id,
        userId: user.id,
        tradingDate: new Date(adjV.tradingDate),
        confidence: 100,
        analysisStatus: "COMPLETED",
        lines: {
          create: adjV.lines.map((l: ISimulatedVoucherLine) => ({
            accountingCode: l.accountingCode,
            particular: l.description,
            amount: BigInt(
              MoneyUtil.toDecimal(
                l.debitAmount > 0 ? l.debitAmount : l.creditAmount,
              )
                .round()
                .toString(),
            ),
            isDebit: l.debitAmount > 0,
          })),
        },
      },
    });
    console.log(
      `✅ [DB] Injected internal adjustment voucher: ${adjV.voucherNumber}`,
    );
  }

  console.log(`\n🎯 [PHASE 2 RESULT]`);
  console.log(`- Sample Size: ${totalVoucherTested}`);
  console.log(
    `- AI Accounting Classification Accuracy: ${voucherAccuracy.toFixed(2)}%`,
  );
  if (totalEsgTested > 0) {
    console.log(
      `- AI ESG Scope Identification Accuracy: ${esgAccuracy.toFixed(2)}%`,
    );
  }
  console.log(`======================================================\n`);
};

// Info: (20260502 - Tzuhan) 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  let targetYear = "2024";
  const yearArg = process.argv.find((a) => a.startsWith("--year="));
  if (yearArg) {
    targetYear = yearArg.split("=")[1];
  }
  if (!targetStock) {
    console.error(
      "Please provide a stock ID. Usage: tsx phase2_runner.ts 1538 [--year=2025]",
    );
    process.exit(1);
  }
  runPhase2ReceiptAnalysis(targetStock, targetYear).then(() => {
    prisma.$disconnect();
    process.exit(0);
  });
}
