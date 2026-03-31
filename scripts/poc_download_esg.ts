import fs from 'node:fs';
import path from 'node:path';

interface ICompanyInfo {
    stockId: string;
    name: string;
    marketType: 'sii' | 'otc';
}

interface IEsgReportData {
    code: string;
    name: string;
    twFirstReportDownloadId: string;
    twEditReportDownloadId: string;
    [key: string]: unknown;
}

interface IEsgApiResponse {
    code: number;
    success: boolean;
    data: IEsgReportData[];
    message: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function parseCompanyData(rawItem: Record<string, string>): ICompanyInfo {
    const stockId = rawItem['公司代號'] || rawItem['SecuritiesCompanyCode'];
    const name = rawItem['公司簡稱'] || rawItem['CompanyAbbreviation'];
    const marketType = rawItem['marketType'] as 'sii' | 'otc';
    return { stockId, name, marketType };
}

// Info: (20260331 - Tzuhan) 核心 Service: ESG 永續報告書下載 (動態上市櫃支援版)
async function downloadEsgReportApi(stockId: string, marketType: string, targetYear: number, savePath: string): Promise<boolean> {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
    };

    try {
        const listUrl = `https://esggenplus.twse.com.tw/api/api/MopsSustainReport/data`;

        // Info: (20260331 - Tzuhan) 關鍵邏輯：上市 (sii) 為 0，上櫃 (otc) 為 1
        const marketTypeCode = marketType === 'otc' ? 1 : 0;

        const requestBody = {
            marketType: marketTypeCode,
            year: targetYear,
            industryNameList: [],
            companyCodeList: [stockId],
            industryName: "all",
            companyCode: stockId
        };

        const listRes = await fetch(listUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!listRes.ok) {
            console.error(`   ❌ 無法取得報告清單 (HTTP ${listRes.status})`);
            return false;
        }

        const responseJson = await listRes.json() as IEsgApiResponse;

        if (!responseJson.success || !Array.isArray(responseJson.data) || responseJson.data.length === 0) {
            console.warn(`   ⚠️ 找不到 ${stockId} 於 ${targetYear} 年度的永續報告書`);
            return false;
        }

        const report = responseJson.data[0];

        // Info: (20260331 - Tzuhan) 智慧判斷要下載哪一個版本 (優先取修正版)
        let fileId = report.twEditReportDownloadId;
        let version = '修正版';

        // Info: (20260331 - Tzuhan) 如果沒有修正版 (通常是空字串或全 0 的 UUID)，則降級使用初始版
        if (!fileId || fileId === '00000000-0000-0000-0000-000000000000') {
            fileId = report.twFirstReportDownloadId;
            version = '初始版';
        }

        if (!fileId || fileId === '00000000-0000-0000-0000-000000000000') {
            console.warn(`   ⚠️ 該公司雖有紀錄，但無有效的 PDF 檔案 ID`);
            return false;
        }

        console.log(`   🔍 成功取得 ${targetYear} 年度 FileId (${version}): ${fileId}`);

        // Info: (20260331 - Tzuhan) 呼叫 FileStream API 直接下載 PDF
        const downloadUrl = `https://esggenplus.twse.com.tw/api/api/MopsSustainReport/data/FileStream?id=${fileId}`;
        const downloadRes = await fetch(downloadUrl, { method: 'GET', headers });

        if (!downloadRes.ok) {
            console.error(`   ❌ 檔案下載失敗 (HTTP ${downloadRes.status})`);
            return false;
        }

        const buffer = Buffer.from(await downloadRes.arrayBuffer());

        if (buffer.subarray(0, 4).toString('ascii') !== '%PDF') {
            console.error(`   ❌ 下載的檔案非 PDF 格式。`);
            return false;
        }

        fs.mkdirSync(path.dirname(savePath), { recursive: true });
        fs.writeFileSync(savePath, buffer);
        return true;

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`❌ 處理 ${stockId} 失敗: ${msg}`);
        return false;
    }
}

// Info: (20260331 - Tzuhan) 主程式
async function runDownloadPoC() {
    const targetYear = 2024;
    const dataPath = path.join(process.cwd(), 'poc_company_list.json');
    let rawData: unknown[] = [];

    try {
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        // Info: (20260331 - Tzuhan) 為了確保測到上櫃，我們多拿幾筆資料 (例如前 20 筆或直接抓取)
        rawData = JSON.parse(fileContent).slice(0, 20);
    } catch (error) {
        console.error(`❌ 無法讀取 JSON 檔案: ${dataPath}`, error);
        return;
    }

    console.log(`🚀 開始執行 ESG 下載 PoC (上市櫃全通吃版)：嘗試下載 ${rawData.length} 家公司\n`);

    for (const item of rawData) {
        const company = parseCompanyData(item as Record<string, string>);
        console.log(`⏳ 處理中: [${company.marketType.toUpperCase()}] ${company.stockId} ${company.name}`);

        const savePath = path.join(process.cwd(), `downloads/${targetYear}/${company.stockId}_esg.pdf`);

        const success = await downloadEsgReportApi(company.stockId, company.marketType, targetYear, savePath);
        if (success) {
            console.log(`   ✅ 成功儲存至: ${savePath}`);
        }

        await delay(2000);
    }

    console.log(`\n🎉 ESG 下載 PoC 結束！請檢查 downloads/${targetYear}/ 資料夾。`);
}

runDownloadPoC();