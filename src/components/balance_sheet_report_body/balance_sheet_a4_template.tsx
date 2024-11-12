import React from 'react';
import Image from 'next/image';

const BalanceSheetA4Template = ({ children }: { children: React.ReactNode }) => {
  // Info: (20241111 - Anna) 分割內容為多頁
  const pages = React.Children.toArray(children);
  const renderedFooter = (page: number) => (
    <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-surface-brand-secondary p-10px">
      <p className="text-xs text-white">{page}</p>
      <div className="text-base font-bold text-surface-brand-secondary">
        <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
      </div>
    </footer>
  );

  return (
    <div className="a4-template">
      {/* Info: (20241111 - Anna)第一頁 */}
      <div className="page">
        <header className="mb-12 flex justify-between pl-0 text-white">
          <div className="w-3/10 bg-surface-brand-secondary pb-14px pl-10px pr-14px pt-40px font-bold">
            <div>
              {/* Info: (20241111 - Anna) 假設 reportFinancial 和 curDate 從 props 或 context 中傳入 */}
              <h1 className="mb-30px text-h6">
                代碼 / 名稱 <br />
                公司名稱
              </h1>
              <p className="text-left text-xs font-bold leading-5">
                當前日期
                <br />
                財務報告 - 資產負債表
              </p>
            </div>
          </div>
          <div className="box-border w-35% text-right">
            <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
              Balance Sheet
              <span className="absolute -bottom-20px right-0 h-5px w-9/12 bg-surface-brand-secondary"></span>
            </h2>
          </div>
        </header>
        <div>{pages[0]}</div>
        {renderedFooter(1)}
      </div>

      {/* Info: (20241111 - Anna) 從第二頁開始到最後一頁 */}
      {pages.slice(1).map((pageContent, index) => (
        <div className="page" key={`page-${index + 2}`}>
          <div>{pageContent}</div>
          {renderedFooter(index + 2)}
        </div>
      ))}
    </div>
  );
};

export default BalanceSheetA4Template;
