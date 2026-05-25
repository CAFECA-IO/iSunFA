import cron from "node-cron";
import fs from "fs";
import path from "path";
import Decimal from "decimal.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const TIMEOUT_MS = 15000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Info: (20260514 - Julian) 抓取台灣銀行匯率 CSV
 */
async function fetchExchangeRatesWithRetry(dateStr?: string): Promise<string> {
  // Info: (20260514 - Julian) 最多重試 3 次
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const url = dateStr
        ? `https://rate.bot.com.tw/xrt/flcsv/0/${dateStr}`
        : "https://rate.bot.com.tw/xrt/flcsv/0/day";

      const response = await fetch(url, {
        signal: controller.signal,
      });

      // Info: (20260514 - Julian) 設定 fetch timeout，避免因為當機或是網路問題卡住
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error(
        `[Cron] Attempt ${i + 1} failed to fetch exchange rates for ${dateStr || "day"}:`,
        error,
      );
      if (i === MAX_RETRIES - 1) throw error;
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error("Failed to fetch exchange rates after retries");
}

/**
 * Info: (20260514 - Julian) 將抓取到的 CSV 資料存入 DB
 */
export async function syncExchangeRates() {
  console.log("[Cron] Starting exchange rate sync...");
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const yearStr = todayStr.substring(0, 4);

    // Info: (20260525 - Luphia) Read rate_YYYY.ts to find the latest date currently recorded
    let lastDateStr = `${yearStr}-01-01`;
    try {
      const constantsFilePath = path.join(
        process.cwd(),
        "src",
        "constants",
        "exchange_rate",
        `rate_${yearStr}.ts`,
      );
      if (fs.existsSync(constantsFilePath)) {
        const fileContent = fs.readFileSync(constantsFilePath, "utf-8");
        const matches = [
          ...fileContent.matchAll(/date:\s*["'](\d{4}-\d{2}-\d{2})["']/g),
        ];
        if (matches.length > 0) {
          const dates = matches.map((m) => m[1]);
          dates.sort();
          lastDateStr = dates[dates.length - 1];
        }
      }
    } catch (err) {
      console.error(
        `[Cron] Failed to read last date in rate_${yearStr}.ts:`,
        err,
      );
    }

    console.log(
      `[Cron] Last recorded date is ${lastDateStr}. Fetching all missing days up to ${todayStr}...`,
    );

    // Info: (20260525 - Luphia) Calculate dates to fetch (from lastDate + 1 day to today)
    const datesToFetch: string[] = [];
    const startDate = new Date(lastDateStr);
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() + 1);

    const current = new Date(startDate);
    while (current <= today) {
      const dateStr = current.toISOString().split("T")[0];
      datesToFetch.push(dateStr);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    if (datesToFetch.length === 0) {
      console.log(
        "[Cron] Already up-to-date! No missing exchange rates to sync.",
      );
      return;
    }

    const targetCurrencies = ["USD", "EUR", "JPY", "CNY", "HKD", "KRW"];
    let updatedCount = 0;
    const newRateEntries: {
      date: string;
      baseCurrency: string;
      targetCurrency: string;
      rate: string;
      note: string;
    }[] = [];

    // Info: (20260525 - Luphia) Process and collect exchange rates for each date sequentially (No DB writes as per user request)
    for (const targetDateStr of datesToFetch) {
      console.log(`[Cron] Fetching exchange rates for ${targetDateStr}...`);
      try {
        const csvData = await fetchExchangeRatesWithRetry(targetDateStr);
        if (!csvData.includes("幣別") && !csvData.includes("匯率")) {
          console.log(
            `[Cron] No valid exchange rate data for ${targetDateStr} (possibly weekend or holiday). Skipping.`,
          );
          continue;
        }

        const lines = csvData.split("\n");

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = line.split(",");
          const currency = cols[0];

          if (!targetCurrencies.includes(currency)) continue;

          /**
           * Info: (20260514 - Julian) 台灣銀行 CSV 結構：
           * 0: 幣別 (USD, EUR, etc.)
           * 1: 本行買入
           * 2: 現金買入 (Cash Buy)
           * 3: 即期買入 (Spot Buy)
           * ...
           * 11: 本行賣出
           * 12: 現金賣出 (Cash Sell)
           * 13: 即期賣出 (Spot Sell)
           */

          const spotBuy = new Decimal(cols[3] || 0);
          const spotSell = new Decimal(cols[13] || 0);

          let rateToSave = new Decimal(0);

          // Info: (20260514 - Julian) 優先使用「即期」匯率中價 (買進 + 賣出 / 2)
          if (spotBuy.gt(0) && spotSell.gt(0)) {
            rateToSave = spotBuy.add(spotSell).div(2);
          } else {
            // Info: (20260514 - Julian) 若無即期匯率，退而求其次使用「現金」匯率中價
            const cashBuy = new Decimal(cols[2] || 0);
            const cashSell = new Decimal(cols[12] || 0);
            if (cashBuy.gt(0) && cashSell.gt(0)) {
              rateToSave = cashBuy.add(cashSell).div(2);
            }
          }

          if (rateToSave.gt(0)) {
            newRateEntries.push({
              date: targetDateStr,
              baseCurrency: "TWD",
              targetCurrency: currency,
              rate: rateToSave.toString(),
              note: "從台灣銀行每日爬蟲更新",
            });

            updatedCount++;
          }
        }
      } catch (error) {
        console.error(
          `[Cron] Error syncing exchange rates for ${targetDateStr}:`,
          error,
        );
      }
    }

    console.log(
      `[Cron] Exchange rate sync completed. Collected ${updatedCount} rates across ${datesToFetch.length} requested days.`,
    );

    // Info: (20260515 - Julian) 將爬取的資料同步寫入 src/constants/exchange_rate 的 ts 檔案
    if (newRateEntries.length > 0) {
      try {
        const entriesByYear: { [key: string]: typeof newRateEntries } = {};
        for (const entry of newRateEntries) {
          const year = entry.date.substring(0, 4);
          if (!entriesByYear[year]) {
            entriesByYear[year] = [];
          }
          entriesByYear[year].push(entry);
        }

        for (const [year, entries] of Object.entries(entriesByYear)) {
          const constantsFilePath = path.join(
            process.cwd(),
            "src",
            "constants",
            "exchange_rate",
            `rate_${year}.ts`,
          );

          if (fs.existsSync(constantsFilePath)) {
            let fileContent = fs.readFileSync(constantsFilePath, "utf-8");
            fileContent = fileContent.replace(/\];?\s*$/, "");

            let appendContent = "";
            let appendedCount = 0;

            for (const entry of entries) {
              const existsRegex = new RegExp(
                `date:\\s*["']${entry.date}["'],\\s*baseCurrency:\\s*["']${entry.baseCurrency}["'],\\s*targetCurrency:\\s*["']${entry.targetCurrency}["']`,
                "m",
              );
              if (!existsRegex.test(fileContent)) {
                appendContent += `  {
    date: "${entry.date}",
    baseCurrency: "${entry.baseCurrency}",
    targetCurrency: "${entry.targetCurrency}",
    rate: "${entry.rate}",
    note: "${entry.note}",
  },\n`;
                appendedCount++;
              } else {
                console.log(
                  `[Cron] Entry for ${entry.targetCurrency} on ${entry.date} already exists in rate_${year}.ts, skipping append.`,
                );
              }
            }

            if (appendedCount > 0) {
              fileContent += appendContent + "];\n";
              fs.writeFileSync(constantsFilePath, fileContent, "utf-8");
              console.log(
                `[Cron] Successfully appended ${appendedCount} new rates to rate_${year}.ts`,
              );
            }
          } else {
            console.warn(
              `[Cron] File rate_${year}.ts does not exist, skipping file append.`,
            );
          }
        }
      } catch (err) {
        console.error("[Cron] Failed to write to constants file:", err);
      }
    }
  } catch (error) {
    console.error("[Cron] Error syncing exchange rates:", error);
  }
}

/**
 * Info: (20260514 - Julian) 啟動每天凌晨 02:00 的匯率爬蟲排程
 */
export const startExchangeRateCron = () => {
  cron.schedule("0 2 * * *", () => {
    syncExchangeRates();
  });
  console.log("[Cron] Scheduled exchange rate sync at 02:00 AM daily.");
};
