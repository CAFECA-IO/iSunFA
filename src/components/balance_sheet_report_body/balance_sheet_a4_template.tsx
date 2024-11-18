import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { createRoot } from 'react-dom/client';

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
  //  Info: (20241111 - Anna) 初始化 `pages` 狀態
  const [pages, setPages] = useState<React.ReactNode[]>([]);

  // Info: (20241111 - Anna) 分割內容為多頁
  const initialPages = React.Children.toArray(children);

  // Info: (20241112 - Anna) 動態應用分頁樣式
  const printContainerClass =
    'mx-auto w-a4-width origin-top overflow-x-auto print:m-0  print:block  print:h-auto print:w-full print:p-0';
  const printContentClass = 'relative h-a4-height overflow-hidden';

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

  // Info: (20241118 - Anna) 假設頁眉、頁尾高度 ＆ A4 高度（含頁眉與頁尾）(px)
  const FirstPageHeaderHeight = 54;
  const AfterFirstPageHeaderHeight = 3;
  const footerHeight = 20;
  const PerPageMaxHeight = 843;

  // Info: (20241118 - Anna) 動態分頁邏輯
  // Info: (20241118 - Anna) 接收一個參數 contentPages，表示頁面的內容
  const splitPages = (contentPages: React.ReactNode[]) => {
    // Info: (20241118 - Anna) 在瀏覽器中建立一個隱藏的容器，將內容渲染到這個容器中，用來測量每個項目的實際高度。 >> 測量每個大標題的高度
    const splitContainer = document.createElement('div');
    splitContainer.style.position = 'absolute';
    splitContainer.style.visibility = 'hidden';
    splitContainer.style.width = '595px'; // Info: (20241118 - Anna) A4 寬度
    splitContainer.style.padding = '0';
    document.body.appendChild(splitContainer); // Info: (20241118 - Anna) 將容器附加到 body 中

    // Info: (20241118 - Anna) 當處理的內容高度（accumulatedHeight）超過一頁的最大高度時，會將 currentPage 推入 finalPages 作為一個完整的頁面。
    const finalPages: React.ReactNode[] = [];
    // Info: (20241118 - Anna) 然後清空 currentPage，開始處理下一頁的內容。
    let currentPage: React.ReactNode[] = [];
    // Info: (20241118 - Anna) 第一頁：FirstPageHeaderHeight + footerHeight >> 針對第一頁的初始設定
    // Info: (20241118 - Anna) 後續頁面：重置為 AfterFirstPageHeaderHeight + footerHeight。
    let accumulatedHeight = FirstPageHeaderHeight + footerHeight;
    let isFirstPage = true; // Info: (20241118 - Anna) 標記是否為第一頁

    // Info: (20241118 - Anna) 遍歷所有內容並測量高度
    const splitLargeContent = (PerInitialPage: React.ReactNode) => {
      let remainingContent = PerInitialPage; // Info: (20241118 - Anna) remainingContent 用於保存還未被分割的部分，初始值為整個項目

      while (remainingContent) {
        // Info: (20241118 - Anna) 建立一個子容器，將剩餘的內容渲染到容器中。 >> 進一步分割過大的內容
        const splitContentContainer = document.createElement('div');
        // Info: (20241118 - Anna)創建 React 渲染入口點
        const renderRoot = createRoot(splitContentContainer);
        renderRoot.render(<div>{remainingContent}</div>);
        // Info: (20241118 - Anna) 把渲染後的容器推到主容器中
        splitContainer.appendChild(splitContentContainer);

        // Info: (20241118 - Anna) 使用 getBoundingClientRect() 測量渲染後的高度。
        const remainingContentHeight = splitContentContainer.getBoundingClientRect().height;

        // Info: (20241118 - Anna) 判斷高度
        if (accumulatedHeight + remainingContentHeight > PerPageMaxHeight) {
          // Info: (20241118 - Anna) 如果當前頁面無法放置此部分，保存當前頁面並開始新頁
          finalPages.push(<div>{currentPage}</div>);
          currentPage = [];
          // Info: (20241118 - Anna) >> 切換到新頁面時重置頁面的起始高度，確保新頁面的高度計算從正確的頁眉和頁尾開始
          accumulatedHeight = isFirstPage
            ? FirstPageHeaderHeight + footerHeight
            : AfterFirstPageHeaderHeight + footerHeight;
          isFirstPage = false;
        }

        const splitRenderedContent = splitContentContainer.innerHTML; // Info: (20241118 - Anna) 分割後的一部分已渲染內容;記錄渲染結果;
        // Info: (20241118 - Anna) getRemainingContent 根據剩餘的可用高度，從 remainingContent 中取出適合的內容，並返回剩下部分（需要放到下一頁）
        remainingContent = getRemainingContent(
          remainingContent,
          PerPageMaxHeight - accumulatedHeight // Info: (20241118 - Anna) getRemainingContent 當前頁面還能容納的剩餘高度
        );

        // Info: (20241118 - Anna) 將 HTML 字串 splitRenderedContent 包裝成 React 元素並加入到 currentPage 中
        currentPage.push(<div dangerouslySetInnerHTML={{ __html: splitRenderedContent }} />);
        accumulatedHeight += remainingContentHeight;

        // Info: (20241118 - Anna) 清理子容器
        renderRoot.unmount(); // Info: (20241118 - Anna) 渲染完成後，使用 root.unmount() 卸載渲染的內容，並從 DOM 中移除容器。
        splitContainer.removeChild(splitContentContainer); // Info: (20241118 - Anna) 從主容器中移除
      }
    };
    // Info: (20241118 - Anna) 確保最後尚未加入的內容能被正確存入 finalPages ，避免遺漏。
    if (currentPage.length > 0) {
      finalPages.push(<div>{currentPage}</div>);
    }

    // Info: (20241118 - Anna) 清理容器
    document.body.removeChild(splitContainer);
    return finalPages;
  };

  // Info: (20241118 - Anna) 監聽 children 的變化，重新執行分頁邏輯
  useEffect(() => {
    const finalSplitPages = splitPages(initialPages); // Info: (20241118 - Anna) 將初始的內容陣列 initialPages 進一步分割。每個項目依高度分割為多頁。返回的結果是 finalSplitPages
    setPages(finalSplitPages); // Info: (20241118 - Anna) 將分頁後的結果存入狀態 pages
  }, [children]);

  return (
    <div className={`${printContainerClass}`} data-print-mode>
      {pages.map((pageContent, index) => (
        <div
          key={`page-${index + 1}`}
          className={`${printContentClass} relative h-a4-height overflow-y-hidden ${index > 0 ? 'break-before-page' : ''}`} // Info: (20241118 - Anna) 自動應用分頁樣式
        >
          {renderedHeader(index === 0)} {/* Info: (20241118 - Anna) 第一頁有完整頁眉 */}
          <div>{pageContent}</div>
          {renderedFooter(index + 1)} {/* Info: (20241118 - Anna) 每頁都有頁腳 */}
        </div>
      ))}
    </div>
  );
};

export default BalanceSheetA4Template;
