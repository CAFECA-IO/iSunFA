import { businessMonitorService } from "@/services/business_monitor.service";
import dotenv from "dotenv";

// Info: (20260702 - Julian) 載入環境變數
dotenv.config();

/**
 * Info: (20260702 - Julian) 測試腳本：搜尋報告
 * 使用方式: npx tsx scripts/search_report.ts "台積電 2024 ESG"
 */
async function main() {
  const question = process.argv[2];

  if (!question) {
    console.error(
      '❌ 請提供問題內容。範例: npx tsx scripts/search_report.ts "台積電 2024 ESG"',
    );
    process.exit(1);
  }

  console.log(
    `\n🔍 [Search Script] 正在檢索關於「${question}」的相關背景知識...\n`,
  );

  try {
    const { matchedReports, context } =
      await businessMonitorService.searchContext(question);

    console.log(`\n==================================================`);
    console.log(`✅ 檢索完成，找到 ${matchedReports.length} 筆相關報告：`);
    console.log(`==================================================`);

    if (matchedReports.length === 0) {
      console.log("⚠️  未找到匹配的報告。");
    } else {
      matchedReports.forEach((report, index) => {
        console.log(
          `${index + 1}. [ID: ${report.id}] ${report.companyName} - ${report.title} (${report.reportYear}年)`,
        );
      });
    }

    console.log(`\n==================================================`);
    console.log(`📄 檢索出的背景知識片段 (Context Snippet):`);
    console.log(`==================================================`);
    console.log(context || "（無內容）");
    console.log(`\n==================================================\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ 檢索過程中發生錯誤:", error);
    process.exit(1);
  }
}

main();
