import xlsx from "xlsx";
import { Prisma } from "@/generated";
import { prisma } from "@/lib/prisma";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { MoneyUtil } from "@/lib/utils/money";

// Info: (20260515 - Julian) 資料來源，之後可依需求變更
const DATA_SOURCE = "環境部溫室氣體排放係數";

// Info: (20260515 - Julian) 使用 Zod 定義護欄 (Guardrails)，確保入庫前資料型態與範圍絕對正確
const CoefficientSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string(),
  unit: z.string().min(1),
  // Info: (20260515 - Julian) 碳排係數必須是正數且具有合理上限，過濾掉不合理的值 (如年份或標號)
  emissionFactor: z
    .union([z.number(), z.string()])
    .refine(
      (val) =>
        MoneyUtil.toDecimal(val).gt(0) && MoneyUtil.toDecimal(val).lte(1000000),
    ),
  source: z.string(),
});

export async function seedEsgCoefficients() {
  console.log("🌱 開始讀取與寫入 ESG 碳排係數...");

  const filePath = path.join(
    process.cwd(),
    "src/resources/ghg_emission_factor_20240205.ods",
  );

  // Info: (20260515 - Julian) 讀取 ods 檔案並轉換為 JSON
  const workbook = xlsx.readFile(filePath);
  const coefficientsToInsert: Prisma.CoefficientCreateManyInput[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === "說明") continue;

    const worksheet = workbook.Sheets[sheetName];
    // Info: (20260515 - Julian) 將該 Sheet 轉換為 JSON 格式
    const rows = xlsx.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      // Info: (20260515 - Julian) 嚴格過濾與型別防護
      const strings = row.filter(
        (c): c is string => typeof c === "string" && c.trim().length > 0,
      );
      const numbers = row.filter((c): c is number => typeof c === "number");

      // Info: (20260515 - Julian) 排除欄位數大於 10 的列，因為那很可能是複雜的說明文字，而非排放係數
      if (strings.length > 0 && numbers.length > 0 && strings.length < 10) {
        const nameVal = strings[0].trim();
        const factorVal = numbers[numbers.length - 1];

        const unitVal =
          strings.find(
            (s) =>
              s !== nameVal &&
              (s.includes("/") || s.toLowerCase().includes("kg")),
          ) || "N/A";

        // Info: (20260515 - Julian) 引入 Zod 校驗 (Guardrails)
        const parsed = CoefficientSchema.safeParse({
          name: nameVal,
          description: sheetName,
          unit: unitVal,
          emissionFactor: factorVal,
          source: DATA_SOURCE,
        });

        if (parsed.success) {
          coefficientsToInsert.push({
            name: parsed.data.name,
            description: parsed.data.description,
            unit: parsed.data.unit.substring(0, 50),
            // Info: (20260515 - Julian) 確保寫入時精確轉換為 Prisma.Decimal 型別
            emissionFactor: new Prisma.Decimal(parsed.data.emissionFactor),
            source: parsed.data.source,
          });
        }
      }
    }
  }

  console.log(`總計解析出 ${coefficientsToInsert.length} 筆可能的係數資料。`);

  if (coefficientsToInsert.length > 0) {
    try {
      // Info: (20260515 - Julian) 查詢目前資料庫已存在的同來源係數，避免重複寫入
      const existingCoefficients = await prisma.coefficient.findMany({
        where: { source: DATA_SOURCE },
        select: { name: true },
      });
      const existingNames = new Set(existingCoefficients.map((c) => c.name));

      // Info: (20260515 - Julian) 過濾出尚未建立的係數資料
      const newCoefficients = coefficientsToInsert.filter(
        (c) => !existingNames.has(c.name),
      );

      if (newCoefficients.length > 0) {
        // Info: (20260515 - Julian) 透過 Prisma 批次寫入 Coefficient 資料表
        const result = await prisma.coefficient.createMany({
          data: newCoefficients,
          skipDuplicates: true,
        });
        console.log(`✅ 成功批次寫入 ${result.count} 筆新碳排係數！`);
      } else {
        console.log("⚠️ 所有解析到的係數皆已存在於資料庫，無須重複寫入。");
      }
    } catch (error) {
      console.error("❌ 寫入碳排係數時發生錯誤:", error);
    }
  } else {
    console.log("⚠️ 未從檔案中解析到任何有效的係數資料。");
  }
}

// Info: (20260515 - Julian) 供直接執行腳本使用
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  seedEsgCoefficients()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
