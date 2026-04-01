import fs from 'node:fs';
import path from 'node:path';

/**
 * Info: (20260331 - Tzuhan)
 * 外部 API 回傳的原始資料結構 (精簡版)
 * 我們明確定義需要的欄位，其餘欄位用 unknown 收容，確保後續操作的型別安全
 */
interface IOpenApiCompanyRecord {
    公司代號: string;
    公司名稱: string;
    [key: string]: unknown;
}

/**
 * Info: (20260331 - Tzuhan)
 * 處理後要存入本地 JSON 供後續測試用的資料結構
 */
interface IProcessedCompanyRecord extends IOpenApiCompanyRecord {
    marketType: 'sii' | 'otc';
}

/**
 * Info: (20260331 - Tzuhan)
 * 資料源設定型別
 */
interface IDataSource {
    name: string;
    marketType: 'sii' | 'otc';
    url: string;
}

// Info: (20260331 - Tzuhan) 核心邏輯 (Core Logic)
async function runPoC(): Promise<void> {
    console.log('🚀 開始執行 PoC: 嚴格型別模式，抓取上市/上櫃測試名單...');

    const sources: IDataSource[] = [
        {
            name: '上市公司 (sii)',
            marketType: 'sii',
            url: 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L'
        },
        {
            name: '上櫃公司 (otc)',
            marketType: 'otc',
            url: 'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O'
        }
    ];

    const outputFilePath = path.join(process.cwd(), 'poc_company_list.json');
    let allCompanies: IProcessedCompanyRecord[] = [];

    for (const source of sources) {
        console.log(`\n⏳ 正在抓取 ${source.name}...`);
        try {
            const response = await fetch(source.url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }

            const rawData = await response.json() as unknown;

            if (!Array.isArray(rawData)) {
                throw new Error(`❌ API 回傳格式非預期，預期為陣列。`);
            }

            const sampleRecords = rawData as IOpenApiCompanyRecord[];
            const formattedData: IProcessedCompanyRecord[] = sampleRecords.map((item) => ({
                ...item,
                marketType: source.marketType
            }));

            console.log(`✅ ${source.name} 抓取成功！已取前 ${formattedData.length} 筆作為測試樣本。`);
            allCompanies = [...allCompanies, ...formattedData];

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ ${source.name} 抓取失敗:`, errorMessage);
        }
    }

    // Info: (20260331 - Tzuhan) 將合併後的 10 筆測試名單寫入 JSON
    fs.writeFileSync(outputFilePath, JSON.stringify(allCompanies, null, 2), 'utf-8');

    console.log(`\n🎉 PoC 完成！總共抓取了 ${allCompanies.length} 筆測試資料。`);
    console.log(`📁 檔案已安全儲存至: ${outputFilePath}`);
}

runPoC();
