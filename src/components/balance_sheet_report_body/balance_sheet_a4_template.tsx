import React from 'react';
import Image from 'next/image';

interface BalanceSheetA4TemplateProps {
  children: React.ReactNode;
  reportFinancial?: {
    company?: {
      code: string;
      name: string;
    };
  };
  curDate?: string;
}

const BalanceSheetA4Template: React.FC<BalanceSheetA4TemplateProps> = ({
  children,
  reportFinancial,
  curDate,
}) => {
  // Info: (20241111 - Anna) 分割內容為多頁
  const pages = React.Children.toArray(children);
  // Info: (20241112 - Anna) 將頁眉封裝成函數，並使用 `isFirstPage` 參數區分不同頁面
  const renderedHeader = (isFirstPage: boolean) => {
    return isFirstPage ? (
      <header className="mb-12 flex justify-between pl-0 text-white">
        <div className="w-3/10 bg-surface-brand-secondary pb-14px pl-10px pr-14px pt-40px font-bold">
          <div className="">
            {reportFinancial && reportFinancial.company && (
              <>
                <h1 className="mb-30px text-h6">
                  {reportFinancial.company.code} <br />
                  {reportFinancial.company.name}
                </h1>
                <p className="text-left text-xs font-bold leading-5">
                  {curDate}
                  <br />
                  財務報告 - 資產負債表
                </p>
              </>
            )}
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-9/12 bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
    ) : (
      // Info: (20241112 - Anna) 渲染除第一頁以外的頁眉結構
      <header className="flex justify-between text-white">
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-9/12 bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
    );
  };
  const renderedFooter = (page: number) => (
    <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-surface-brand-secondary p-10px">
      <p className="text-xs text-white">{page}</p>
      <div className="text-base font-bold text-surface-brand-secondary">
        <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
      </div>
    </footer>
  );

  return (
    <>
      {/* Info: (20241111 - Anna)第一頁 */}
      <div id="1" className="relative h-a4-height overflow-y-hidden">
        {/* Info: (20240723 - Shirley) watermark logo */}
        <div className="relative right-0 top-16 z-0">
          <Image
            className="absolute right-0 top-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={400}
            height={300}
          />
        </div>
        {renderedHeader(true) /* Info: (20241112 - Anna) 第一頁使用 `renderedHeader(true)` */}
        <div>{pages[0]}</div>

        {renderedFooter(1)}
      </div>
      {/* Info: (20241111 - Anna) 從第二頁開始到最後一頁 */}
      {pages.slice(1).map((pageContent, index) => (
        <div key={`page-${index + 2}`}>
          {/* Info: (20241112 - Anna) 動態設置 `id`，以便與頁碼匹配 */}
          <div id={`${index + 2}`} className="relative h-a4-height overflow-y-hidden">
            {renderedHeader(false) /* Info: (20241112 - Anna) 其他頁使用 `renderedHeader(false)` */}
            <div>{pageContent}</div>
            {renderedFooter(index + 2)}
          </div>
        </div>
      ))}
    </>
  );
};

export default BalanceSheetA4Template;
