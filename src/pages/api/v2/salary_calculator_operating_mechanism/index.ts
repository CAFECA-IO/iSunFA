import { NextApiRequest, NextApiResponse } from 'next';
import { readFile } from 'fs/promises';
import { marked } from 'marked';
import matter from 'gray-matter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Info: (20251112 - Julian) 薪資計算機說明資料夾路徑
    const dir = 'src/salary_calculator_operating_mechanism';

    // Info: (20251112 - Julian) 讀取資料夾中最新的 md 檔案
    const source = await readFile(`${dir}/v100.md`, 'utf-8');

    // Info: (20251112 - Julian) 使用 gray-matter 解析 front matter
    const {
      data: { version, lastUpdated },
      content: rawData,
    } = matter(source);

    // Info: (20251112 - Julian) 使用 marked 將 markdown 轉換為 HTML
    const content = await marked(rawData);

    // Info: (20251112 - Julian) 組合回傳資料
    const responseData = {
      version,
      lastUpdated,
      content,
    };

    res.status(200).json(responseData);
  } catch (err) {
    res.status(500).json({ error: 'Cannot fetch operating mechanism data.', details: err });
  }
}
