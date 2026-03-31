import fs from 'node:fs';
import path from 'node:path';
import { stringify } from 'csv-stringify/sync';

interface ICompanyInfo {
    stockId: string;
    name: string;
    marketType: 'sii' | 'otc';
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function parseCompanyData(rawItem: Record<string, string>): ICompanyInfo {
    const stockId = rawItem['公司代號'] || rawItem['SecuritiesCompanyCode'];
    const name = rawItem['公司簡稱'] || rawItem['CompanyAbbreviation'];
    const marketType = rawItem['marketType'] as 'sii' | 'otc';
    return { stockId, name, marketType };
}

// Info: (20260331 - Tzuhan) 核心 Service: ESG 數據下載 (JSON 原檔 + CSV 扁平化 雙軌保存)
async function fetchAndSaveEsgData(stockId: string, targetYear: number, saveDir: string): Promise<boolean> {
    const url = `https://esggenplus.twse.com.tw/api/api/mopsEsg/singleCompanyData`;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    const requestBody = {
        companyCode: stockId,
        yearList: [targetYear],
        companyName: null,
        year: targetYear
    };

    try {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(requestBody) });
        if (!res.ok) return false;

        const json = await res.json();
        if (!json.success || !json.data || json.data.length === 0) {
            console.warn(`   ⚠️ 找不到 ${stockId} 的 ESG 數據`);
            return false;
        }

        const companyData = json.data[0];

        //  Info: (20260331 - Tzuhan) 儲存 100% 完整的原始 JSON 檔案 (一字不漏的數位金庫)
        const rawJsonPath = path.join(saveDir, `${stockId}_esg_data.json`);
        fs.writeFileSync(rawJsonPath, JSON.stringify(companyData, null, 4), 'utf-8');

        //  Info: (20260331 - Tzuhan) 扁平化處理，萃取所有指標寫入 CSV (方便 Excel 閱讀)
        const flatMetrics: Record<string, string> = {
            '公司代號': companyData.companyCode || stockId,
            '公司名稱': companyData.companyName || '',
            '年度': companyData.year?.toString() || targetYear.toString()
        };

        if (companyData.treeModels && Array.isArray(companyData.treeModels)) {
            for (const category of companyData.treeModels) {
                // Info: (20260331 - Tzuhan) categoryString 會是 "環境"、"社會"、"治理"
                for (const item of category.items) {
                    for (const section of item.sections) {
                        for (const control of section.controls) {
                            // Info: (20260331 - Tzuhan) 組合欄位名稱：[類別] 項目 - 子項目 - 標題
                            const columnName = `[${category.categoryString}] ${item.declareItemShowName} - ${section.showName} - ${control.showTitle}`;
                            let value = control.value || '';
                            if (typeof value === 'string') value = value.replace(/[\r\n]+/g, ' ');
                            flatMetrics[columnName] = value;
                        }
                    }
                }
            }
        }

        const csvPath = path.join(saveDir, `${stockId}_esg_metrics.csv`);
        const csvString = stringify([flatMetrics], { header: true });
        fs.writeFileSync(csvPath, '\uFEFF' + csvString, 'utf-8');

        console.log(`   ✅ 成功儲存 JSON 與 CSV (共擷取 ${Object.keys(flatMetrics).length - 3} 項資料節點)`);
        return true;

    } catch (error) {
        console.error(`   ❌ 處理 ${stockId} 失敗:`, error);
        return false;
    }
}

// Info: (20260331 - Tzuhan) 主程式
async function runMetricsPoC() {
    const targetYear = 2024;
    const dataPath = path.join(process.cwd(), 'poc_company_list.json');
    let rawData: unknown[] = [];

    try {
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        rawData = JSON.parse(fileContent).slice(0, 10); // 測試 10 家
    } catch (error) {
        console.error(`❌ 無法讀取 JSON 檔案`, error);
        return;
    }

    console.log(`🚀 開始執行 ESG 數據下載 (100% 完整收錄版)：嘗試下載 ${rawData.length} 家公司\n`);

    const saveDir = path.join(process.cwd(), `downloads/${targetYear}`);
    fs.mkdirSync(saveDir, { recursive: true });

    for (const item of rawData) {
        const company = parseCompanyData(item as Record<string, string>);
        console.log(`⏳ 處理中: ${company.stockId} ${company.name}`);

        await fetchAndSaveEsgData(company.stockId, targetYear, saveDir);
        await delay(1000);
    }

    console.log(`\n🎉 下載結束！請檢查 downloads/${targetYear}/ 資料夾。`);
}

runMetricsPoC();