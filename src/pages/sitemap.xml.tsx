import { GetServerSideProps } from 'next';
import { ISUNFA_ROUTE } from '@/constants/url';

// Info: (20251113 - Julian) 預設匯出
export default function Sitemap() {
  return null;
}

// Info: (20251113 - Julian) 生成 XML 字串
async function generateSitemap(): Promise<string> {
  const domain = process.env.NEXT_PUBLIC_DOMAIN;
  const updated = new Date().toLocaleDateString('en-CA'); // Info: (20251113 - Julian) YYYY-MM-DD 格式

  // Info: (20251113 - Julian) iSunFA 小工具索引
  const pages: {
    url: string;
    updated: string;
  }[] = [
    { url: ISUNFA_ROUTE.DASHBOARD, updated },
    { url: ISUNFA_ROUTE.ADD_NEW_VOUCHER, updated },
    { url: ISUNFA_ROUTE.ASSET_LIST, updated },
    { url: ISUNFA_ROUTE.TODO_LIST_PAGE, updated },
    { url: ISUNFA_ROUTE.TRIAL_BALANCE, updated },
    { url: ISUNFA_ROUTE.SALARY_CALCULATOR, updated },
  ];

  // Info: (20251113 - Julian) 生成 XML 字串
  return `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    // Info: (20251113 - Julian) 將每個 URL 項目轉換成 XML 字串
    .map((page) => {
      return `<url>
      <loc>${domain}${page.url}</loc>
      <lastmod>${page.updated}</lastmod>
    </url>`;
    })
    // Info: (20251113 - Julian) 將所有 URL 項目拼接成一個完整的 sitemap 文檔
    .join('')}
      </urlset>`;
}

// Info: (20251113 - Julian) 生成 sitemap.xml
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // Info: (20251113 - Julian) 設置 response header 為 XML
  ctx.res.setHeader('Content-Type', 'text/xml');

  // Info: (20251113 - Julian) 生成 sitemap 內容
  const xml = await generateSitemap();

  // Info: (20251113 - Julian) 將 sitemap 寫入到 response 中
  ctx.res.write(xml);

  // Info: (20251113 - Julian) 結束 response
  ctx.res.end();

  // Info: (20251113 - Julian) 返回一個空的 props 對象，因為在 SSR 中必須返回一個包含數據的對象
  return {
    props: {},
  };
};
