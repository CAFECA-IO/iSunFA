import fs from 'node:fs';
import path from 'node:path';

/**
 * Info: (20260402 - Tzuhan)
 * 下載 MOPS 股東會年報 (F04)
 * @param stockId 公司代號
 * @param year 西元年份
 * @param savePath 完整存檔路徑 (含檔名)
 * @returns {Promise<boolean>} 是否下載成功
 */
export async function downloadFinancialReport(stockId: string, year: number, savePath: string): Promise<boolean> {
    const taiwanYear = (year - 1911).toString();
    const url = 'https://doc.twse.com.tw/server-java/t57sb01';

    const headers = {
        'Referer': 'https://doc.twse.com.tw/server-java/t57sb01',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    try {
        fs.mkdirSync(path.dirname(savePath), { recursive: true });

        const formParams = new URLSearchParams({
            step: '1',
            colorchg: '1',
            co_id: stockId,
            year: taiwanYear,
            seamon: '',
            mtype: 'F',
            ptype: 'F'
        });

        const searchRes = await fetch(url, { method: 'POST', headers, body: formParams.toString() });
        const htmlText = Buffer.from(await searchRes.arrayBuffer()).toString('latin1');

        if (htmlText.includes('d߹Lq') || htmlText.includes('查詢過繁')) {
            console.warn(`⛔ 觸發 MOPS 防爬蟲機制，請等待幾分鐘...`);
            return false;
        }

        // Info: (20260331 - Tzuhan) 檔名必須包含 F04 (股東會年報)
        const filenameMatch = htmlText.match(/([a-zA-Z0-9_]*F04[a-zA-Z0-9_]*\.pdf)/i);

        if (!filenameMatch || !filenameMatch[1]) {
            console.warn(`⚠️ 找不到 ${stockId} (${year}) 的「股東會年報(F04)」(可能尚未上傳或非此格式)`);
            return false;
        }

        const fileName = filenameMatch[1];

        // Info: (20260331 - Tzuhan) 請求過渡頁面
        const step2Url = `${url}?step=9&kind=F&co_id=${stockId}&filename=${fileName}`;
        const step2Res = await fetch(step2Url, { method: 'GET', headers });
        const step2Buffer = Buffer.from(await step2Res.arrayBuffer());

        // Info: (20260402 - Tzuhan) 如果直接拿到 PDF 就結束任務
        if (step2Buffer.subarray(0, 4).toString('ascii') === '%PDF') {
            fs.writeFileSync(savePath, step2Buffer);
            return true;
        }

        // Info: (20260331 - Tzuhan) 取得過渡頁面的 HTML
        const step2Text = step2Buffer.toString('utf-8');

        // Info: (20260331 - Tzuhan) 增強 Regex：同時尋找 href, url=, 或是 window.open 的連結
        const realUrlMatch =
            step2Text.match(/href=['"]?(\/server-java\/t57sb01\?[^'"]+)['"]?/i) ||
            step2Text.match(/url=['"]?([^'"]+)['"]?/i) ||
            step2Text.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i) ||
            step2Text.match(/<a[^>]+href=['"]([^'"]+)['"]/i);

        if (!realUrlMatch) {
            console.error(`❌ 找不到過渡連結。預覽 HTML: ${step2Text.replace(/\s+/g, ' ').substring(0, 200)}`);
            return false;
        }

        // Info: (20260331 - Tzuhan) 組裝最終網址
        let finalDownloadUrl = realUrlMatch[1];
        if (finalDownloadUrl.startsWith('/')) {
            finalDownloadUrl = `https://doc.twse.com.tw${finalDownloadUrl}`;
        } else if (!finalDownloadUrl.startsWith('http')) {
            finalDownloadUrl = `https://doc.twse.com.tw/server-java/${finalDownloadUrl}`;
        }
        // Info: (20260331 - Tzuhan) 下載 PDF 檔案
        const finalRes = await fetch(finalDownloadUrl, { method: 'GET', headers });
        const finalBuffer = Buffer.from(await finalRes.arrayBuffer());

        if (finalBuffer.subarray(0, 4).toString('ascii') !== '%PDF') {
            console.error(`❌ [年報] ${stockId} 最終下載仍非 PDF 格式。`);
            return false;
        }

        fs.writeFileSync(savePath, finalBuffer);
        return true;
    } catch (error) {
        console.error(`❌ [年報] ${stockId} 發生未預期錯誤:`, error);
        return false;
    }
}
