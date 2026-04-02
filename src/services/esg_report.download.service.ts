import fs from 'node:fs';
import path from 'node:path';

interface IEsgReportData {
    twFirstReportDownloadId?: string;
    twEditReportDownloadId?: string;
}

interface IEsgApiResponse {
    success: boolean;
    data?: IEsgReportData[];
}

/**
 * Info: (20260402 - Tzuhan) 核心 Service: ESG 永續報告書下載 (動態上市櫃支援版)
 * @param stockId 公司代號
 * @param marketType 市場別 ('sii' | 'otc')
 * @param year 西元年份
 * @param savePath 完整存檔路徑 (含檔名)
 * @returns {Promise<boolean>} 是否下載成功
 */
export async function downloadEsgReport(stockId: string, marketType: 'sii' | 'otc', year: number, savePath: string): Promise<boolean> {
    const listUrl = `https://esggenplus.twse.com.tw/api/api/MopsSustainReport/data`;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
    };

    try {
        const marketTypeCode = marketType === 'otc' ? 1 : 0;
        const requestBody = {
            marketType: marketTypeCode,
            year: year,
            companyCodeList: [stockId],
            industryNameList: [],
            industryName: "all",
            companyCode: stockId
        };

        const listRes = await fetch(listUrl, { method: 'POST', headers, body: JSON.stringify(requestBody) });
        if (!listRes.ok) return false;

        const responseJson = await listRes.json() as IEsgApiResponse;
        if (!responseJson.success || !responseJson.data || responseJson.data.length === 0) {
            return false;
        }

        const report = responseJson.data[0];

        // Info: (20260402 - Tzuhan) 優先取「修正版」，若無則取「初始版」
        let fileId = report.twEditReportDownloadId;
        const emptyUuid = '00000000-0000-0000-0000-000000000000';

        if (!fileId || fileId === emptyUuid) {
            fileId = report.twFirstReportDownloadId;
        }

        if (!fileId || fileId === emptyUuid) {
            console.warn(`⚠️ 該公司雖有紀錄，但無有效的 PDF 檔案 ID`);
            return false;
        }

        const downloadUrl = `https://esggenplus.twse.com.tw/api/api/MopsSustainReport/data/FileStream?id=${fileId}`;
        const downloadRes = await fetch(downloadUrl, { method: 'GET', headers });

        if (!downloadRes.ok) {
            console.error(`❌ 檔案下載失敗 (HTTP ${downloadRes.status})`);
            return false;
        }

        const buffer = Buffer.from(await downloadRes.arrayBuffer());

        // Info: (20260402 - Tzuhan) 檔案防呆：驗證 Magic Number 是否為 PDF
        if (buffer.subarray(0, 4).toString('ascii') !== '%PDF') {
            console.error(`❌ 下載的檔案非 PDF 格式。`);
            return false;
        }

        // Info: (20260402 - Tzuhan) 確保路徑存在並存檔
        fs.mkdirSync(path.dirname(savePath), { recursive: true });
        fs.writeFileSync(savePath, buffer);

        return true;

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`❌ 處理 ${stockId} 失敗: ${msg}`);
        return false;
    }
}