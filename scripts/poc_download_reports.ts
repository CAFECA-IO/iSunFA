import fs from 'node:fs';
import path from 'node:path';

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

/**
 * Info: (20260331 - Tzuhan) 核心 Service: 三段式下載 MOPS 股東會年報
 */
async function downloadAnnualReport(stockId: string, adYear: number, savePath: string): Promise<boolean> {
    const rocYear = (adYear - 1911).toString();
    const baseUrl = 'https://doc.twse.com.tw/server-java/t57sb01';

    const headers = {
        'Referer': 'https://doc.twse.com.tw/server-java/t57sb01',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    try {
        // Info: (20260331 - Tzuhan) Step 1: 取得動態檔名
        const formParams = new URLSearchParams({
            step: '1',
            colorchg: '1',
            co_id: stockId,
            year: rocYear,
            seamon: '',
            mtype: 'F',
            ptype: 'F'
        });

        const searchRes = await fetch(baseUrl, { method: 'POST', headers, body: formParams.toString() });
        const htmlText = Buffer.from(await searchRes.arrayBuffer()).toString('latin1');

        if (htmlText.includes('d߹Lq') || htmlText.includes('查詢過繁')) {
            console.warn(`   ⛔ 觸發 MOPS 防爬蟲機制，請等待幾分鐘...`);
            return false;
        }

        // Info: (20260331 - Tzuhan) 檔名必須包含 F04 (股東會年報)
        const fileNameMatch =
            htmlText.match(/filename=([a-zA-Z0-9_]*F04[a-zA-Z0-9_]*\.pdf)/i) ||
            htmlText.match(/([a-zA-Z0-9_]*F04[a-zA-Z0-9_]*\.pdf)/i);

        if (!fileNameMatch) {
            console.warn(`   ⚠️ 找不到 ${stockId} (${adYear}) 的「股東會年報(F04)」(可能尚未上傳或非此格式)`);
            return false;
        }

        const fileName = fileNameMatch[1] || fileNameMatch[0];
        console.log(`   🔍 [Step 1] 精準鎖定年報檔名: ${fileName}`);

        // Info: (20260331 - Tzuhan) 請求過渡頁面
        const step2Url = `${baseUrl}?step=9&kind=F&co_id=${stockId}&filename=${fileName}`;
        const step2Res = await fetch(step2Url, { method: 'GET', headers });
        const step2Buffer = Buffer.from(await step2Res.arrayBuffer());

        if (step2Buffer.subarray(0, 4).toString('ascii') === '%PDF') {
            fs.mkdirSync(path.dirname(savePath), { recursive: true });
            fs.writeFileSync(savePath, step2Buffer);
            return true;
        }

        // Info: (20260331 - Tzuhan) 取得過渡頁面的 HTML (轉成 Big5 常見的 utf-8 對應，確保中文字可讀)
        const step2Text = step2Buffer.toString('utf-8');

        // Info: (20260331 - Tzuhan) 增強 Regex：同時尋找 href, url=, 或是 window.open 的連結
        const realUrlMatch =
            step2Text.match(/href=['"]?(\/server-java\/t57sb01\?[^'"]+)['"]?/i) || // Info: (20260331 - Tzuhan) 標準 a href
            step2Text.match(/url=['"]?([^'"]+)['"]?/i) ||                          // Info: (20260331 - Tzuhan) meta refresh url
            step2Text.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i) ||   // Info: (20260331 - Tzuhan) JS location
            step2Text.match(/<a[^>]+href=['"]([^'"]+)['"]/i);                      // Info: (20260331 - Tzuhan) 任何 a href

        if (!realUrlMatch) {
            console.error(`   ❌ 無法從過渡頁面找到最終連結。`);
            console.log(`\n--- 🕵️ 伺服器回傳的過渡頁面 HTML (前 800 字元) ---`);
            console.log(step2Text.replace(/\s+/g, ' ').substring(0, 800));
            console.log(`--------------------------------------------------\n`);
            return false;
        }

        // Info: (20260331 - Tzuhan) 組裝最終網址 (處理相對路徑與絕對路徑)
        let finalDownloadUrl = realUrlMatch[1];
        if (finalDownloadUrl.startsWith('/')) {
            finalDownloadUrl = `https://doc.twse.com.tw${finalDownloadUrl}`;
        } else if (!finalDownloadUrl.startsWith('http')) {
            finalDownloadUrl = `https://doc.twse.com.tw/server-java/${finalDownloadUrl}`;
        }

        console.log(`   🔗 [Step 2] 找到最終下載網址，開始拉取 PDF...`);

        // Info: (20260331 - Tzuhan) 下載 PDF 檔案
        const finalRes = await fetch(finalDownloadUrl, { method: 'GET', headers });
        const finalBuffer = Buffer.from(await finalRes.arrayBuffer());

        if (finalBuffer.subarray(0, 4).toString('ascii') !== '%PDF') {
            throw new Error(`最終下載仍非 PDF 格式。`);
        }

        fs.mkdirSync(path.dirname(savePath), { recursive: true });
        fs.writeFileSync(savePath, finalBuffer);
        return true;

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`❌ 下載 ${stockId} 失敗: ${msg}`);
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
        rawData = JSON.parse(fileContent);
    } catch (error) {
        console.error(`❌ 無法讀取 JSON 檔案: ${dataPath}`, error);
        return;
    }

    console.log(`🚀 開始執行下載 PoC (三段式破解版)：嘗試下載 10 家公司\n`);

    for (const item of rawData) {
        const company = parseCompanyData(item as Record<string, string>);
        console.log(`⏳ 處理中: [${company.marketType.toUpperCase()}] ${company.stockId} ${company.name}`);

        const savePath = path.join(process.cwd(), `downloads/${targetYear}/${company.stockId}_financial.pdf`);

        const success = await downloadAnnualReport(company.stockId, targetYear, savePath);
        if (success) {
            console.log(`   ✅ 成功儲存至: ${savePath}`);
        }

        // Info: (20260331 - Tzuhan) 遇到反爬蟲後，必須將延遲拉長到 5 秒以上，模擬人類行為
        await delay(6000);
    }

    console.log(`\n🎉 下載 PoC 結束！請檢查 downloads/${targetYear}/ 資料夾。`);
}

runDownloadPoC();
