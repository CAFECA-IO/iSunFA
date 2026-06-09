import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { companyRepo } from '@/repositories/company.repo';

export async function GET() {
  const dataDir = path.join(process.cwd(), 'data');
  const items = [];
  
  // Info: (20260609 - Tzuhan) 抓取所有公司資料來映射名稱
  const companies = await companyRepo.findMany();
  const companyMap = new Map(companies.map(c => [c.stockId, c.name]));

  if (fs.existsSync(dataDir)) {
    const stockIds = fs.readdirSync(dataDir).filter(f => !f.startsWith('.'));
    for (const stockId of stockIds) {
      const stockPath = path.join(dataDir, stockId);
      if (fs.statSync(stockPath).isDirectory()) {
        const years = fs.readdirSync(stockPath).filter(f => !f.startsWith('.'));
        for (const year of years) {
          const yearPath = path.join(stockPath, year);
          if (fs.statSync(yearPath).isDirectory()) {
            // Info: (20260609 - Tzuhan) 檢查 Day 1 進度
            const hasFin = fs.existsSync(path.join(yearPath, 'inputs', 'raw_reports', `${year}_FIN_REPORT.pdf`));
            const hasEsg = fs.existsSync(path.join(yearPath, 'inputs', 'raw_reports', `${year}_ESG_REPORT.pdf`));
            const hasPersonaHtml = fs.existsSync(path.join(yearPath, 'outputs', 'mock_sources', `${stockId}_enterprise_persona.html`));
            
            // Info: (20260609 - Tzuhan) Day 1 進度：下載財報、ESG報告、生成畫像
            const isComplete = hasFin && hasEsg && hasPersonaHtml;

            // Info: (20260609 - Tzuhan) 從資料庫撈取公司名稱，如果沒有則顯示企業+代號
            const companyName = companyMap.get(stockId) || `企業 ${stockId}`;
            
            items.push({
              id: `${stockId}-${year}`,
              stockId,
              year,
              name: companyName,
              progress: {
                hasFin,
                hasEsg,
                hasPersonaHtml
              },
              isComplete
            });
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true, payload: items });
}
