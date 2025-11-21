import { NextApiRequest, NextApiResponse } from 'next';
import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import matter from 'gray-matter';

async function getLatestFile(dir: string) {
  try {
    // Info: (20251112 - Julian) 讀取資料夾中的所有檔案
    const files = await readdir(dir);
    let latestFile = '';
    let latestMtime = 0;

    for (const file of files) {
      // Info: (20251112 - Julian) 取得每個檔案的完整路徑及狀態
      const filePath = path.join(dir, file);
      const state = await stat(filePath);

      // Info: (20251112 - Julian) 比較修改時間，找出最新的檔案
      if (state.isFile() && state.mtimeMs > latestMtime) {
        latestMtime = state.mtimeMs;
        latestFile = filePath;
      }
    }

    return latestFile;
  } catch (err) {
    throw new Error('Error reading latest file: ' + err);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Info: (20251112 - Julian) 薪資計算機說明資料夾路徑
    const dir = 'documents/salary_calculator_operating_mechanism';

    // Info: (20251112 - Julian) 讀取資料夾中最新的 md 檔案
    const recentFile = await getLatestFile(dir);
    const source = await readFile(recentFile, 'utf-8');

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
