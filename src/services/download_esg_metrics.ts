import fs from 'node:fs';
import path from 'node:path';

interface IEsgDataResponse {
    success: boolean;
    data?: unknown[];
}

/**
 * Info: (20260402 - Tzuhan) 核心 Service: ESG 數據下載 (JSON 原檔 + CSV 扁平化 雙軌保存)
 * @param stockId 公司代號
 * @param year 西元年份
 * @param savePath 完整存檔路徑 (含檔名 .json)
 * @returns {Promise<boolean>} 是否下載成功
 */
export async function downloadEsgMetrics(stockId: string, year: number, savePath: string): Promise<boolean> {
    const url = `https://esggenplus.twse.com.tw/api/api/mopsEsg/singleCompanyData`;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    const requestBody = {
        companyCode: stockId,
        yearList: [year],
        companyName: null,
        year: year
    };

    try {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(requestBody) });
        if (!res.ok) return false;

        const json = await res.json() as IEsgDataResponse;

        if (!json.success || !json.data || json.data.length === 0) {
            return false;
        }

        // Info: (20260402 - Tzuhan) 確保目錄存在並直接寫入 JSON 字串 (保留完整結構供未來擴充使用)
        fs.mkdirSync(path.dirname(savePath), { recursive: true });
        fs.writeFileSync(savePath, JSON.stringify(json.data[0], null, 4), 'utf-8');

        return true;

    } catch (error) {
        console.error(`[Service Error] downloadEsgMetrics (${stockId}):`, error);
        return false;
    }
}