import fs from 'node:fs';
import path from 'node:path';
import { TaskType, TaskStatus } from '@/generated/client';
import { prisma } from '@/lib/prisma';

interface ICompanyInfo {
    stockId: string;
    name: string;
    marketType: 'sii' | 'otc';
}

function parseCompanyData(rawItem: Record<string, string>): ICompanyInfo {
    const stockId = rawItem['公司代號'] || rawItem['SecuritiesCompanyCode'];
    const name = rawItem['公司簡稱'] || rawItem['CompanyAbbreviation'];
    const marketType = rawItem['marketType'] as 'sii' | 'otc';
    return { stockId, name, marketType };
}

async function main() {
    // Info: (20260401 - Tzuhan) 動態參數解析區, 預設值：2024 年，全市場
    let targetYears: number[] = [2024];
    let targetStockIds: string[] | 'ALL' = 'ALL';

    // Info: (20260401 - Tzuhan) 讀取終端機輸入的參數 (例如: --year=2023,2024 --stockId=1101)
    const args = process.argv.slice(2);
    for (const arg of args) {
        if (arg.startsWith('--year=')) {
            // Info: (20260401 - Tzuhan) 支援逗號分隔，例如 "2023,2024" -> [2023, 2024]
            const yearStr = arg.split('=')[1];
            targetYears = yearStr.split(',').map(y => parseInt(y.trim(), 10));
        }
        if (arg.startsWith('--stockId=')) {
            // Info: (20260401 - Tzuhan) 支援逗號分隔，例如 "1101,2330" -> ['1101', '2330']
            const stockStr = arg.split('=')[1];
            targetStockIds = stockStr.split(',').map(s => s.trim());
        }
    }

    console.log(`\n⚙️  任務生成設定：`);
    console.log(`   - 目標年度: ${targetYears.join(', ')}`);
    console.log(`   - 目標公司: ${targetStockIds === 'ALL' ? '全市場 (ALL)' : targetStockIds.join(', ')}\n`);

    // Info: (20260401 - Tzuhan) 我們要抓取的三種資料
    const requiredTaskTypes = [TaskType.FIN_REPORT, TaskType.ESG_REPORT, TaskType.ESG_METRICS];

    // Info: (20260401 - Tzuhan) 讀取全市場名單
    const dataPath = path.join(process.cwd(), 'poc_company_list.json');
    console.log(`📂 讀取公司名單: ${dataPath}`);
    let rawData: Record<string, string>[] = [];
    try {
        rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    } catch (error) {
        console.error(`❌ 無法讀取 JSON 檔案: ${dataPath}`, error);
        return;
    }

    const tasksToCreate = [];

    // Info: (20260401 - Tzuhan) 產生任務清單
    for (const item of rawData) {
        const company = parseCompanyData(item);

        // Info: (20260401 - Tzuhan) 過濾公司：如果指定了 stockId，就跳過不在名單內的公司
        if (targetStockIds !== 'ALL' && !targetStockIds.includes(company.stockId)) {
            continue;
        }

        // Info: (20260401 - Tzuhan) 針對每個指定年份、每種任務類型產生工單
        for (const year of targetYears) {
            for (const tType of requiredTaskTypes) {
                tasksToCreate.push({
                    stockId: company.stockId,
                    companyName: company.name,
                    marketType: company.marketType,
                    year: year,
                    taskType: tType,
                    status: TaskStatus.PENDING,
                    retryCount: 0
                });
            }
        }
    }

    if (tasksToCreate.length === 0) {
        console.log(`⚠️  沒有產生任何任務，請檢查輸入的公司代號是否在 JSON 名單中。`);
        return;
    }

    console.log(`⏳ 準備寫入 ${tasksToCreate.length} 筆任務到資料庫...`);

    const result = await prisma.reportDownloadTask.createMany({
        data: tasksToCreate,
        skipDuplicates: true, // Info: (20260401 - Tzuhan) 防呆機制：重複的任務會被自動忽略
    });

    console.log(`✅ 成功！資料庫新增了 ${result.count} 筆全新的 PENDING 任務。\n`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });