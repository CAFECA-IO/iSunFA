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
  const FirstPageHeaderHeight = 210;
  const AfterFirstPageHeaderHeight = 50;
  const footerHeight = 40;
  const PerPageMaxHeight = 842;

  // Info: (20241118 - Anna) 將 largeContentBlock 分割為可適配 availableHeight 的部分（splitLargeContentBlock）和剩餘部分（remainingContent）
const getRemainingContent = (largeContentBlock: React.ReactNode, availableHeight: number) => {
  // Info: (20241118 - Anna) 1. 建立一個隱藏的容器，用於測量內容高度
  const measureContainer = document.createElement('div');
  measureContainer.style.position = 'absolute';
  measureContainer.style.visibility = 'hidden';
  measureContainer.style.width = '595px'; // A4 寬度
  measureContainer.style.padding = '0';
  document.body.appendChild(measureContainer);

  // Info: (20241118 - Anna) 2. 渲染 largeContentBlock 到容器中
  const renderRoot = createRoot(measureContainer);
  renderRoot.render(<div>{largeContentBlock}</div>);

  const tableElement = Array.from(measureContainer.children).find(
    (el) => el.tagName.toLowerCase() === 'table'
  ); // Info: (20241118 - Anna) 尋找表格元素

  if (tableElement) {
    const rows = Array.from(tableElement.querySelectorAll('tr')); // Info: (20241118 - Anna) 獲取表格行
    let tableAccumulatedHeight = 0;
    let rowSplitIndex = 0;

    // Info: (20241118 - Anna) 遍歷表格行，計算累積高度
    rows.some((row) => {
      const rowHeight = row.getBoundingClientRect().height;
      if (tableAccumulatedHeight + rowHeight <= availableHeight) {
        tableAccumulatedHeight += rowHeight; // Info: (20241118 - Anna) 更新表格行的累積高度
        rowSplitIndex += 1;
        return false; // Info: (20241118 - Anna) 繼續
      }
      return true; // Info: (20241118 - Anna) 停止
    });

    // Info: (20241118 - Anna) 將表格的部分行分割出來，生成一個新的表格結構（splitTable），只包含可以容納於當前頁面高度的表格行
    const splitTable = (
      <table>
        <tbody>
          {/* Info: (20241118 - Anna) 取出原表格的部分行，範圍是從第 0 行到 rowSplitIndex（不包含rowSplitIndex） */}
          {/* Info: (20241118 - Anna) 遍歷這些行（由 slice 提取的部分），並為每一行生成一個新的 <tr> 元素 */}
          {rows.slice(0, rowSplitIndex).map((row) => {
            // Info: (20241118 - Anna) 以行的內容長度或行的 HTML 作為鍵的基礎，這樣可以避免僅使用索引
            const uniqueKey = `row-${row.innerHTML.length}-${row.outerHTML}`;
            return (
              <tr
                key={uniqueKey} // Info: (20241118 - Anna) 使用行的內容生成唯一鍵
                dangerouslySetInnerHTML={{ __html: row.innerHTML }}
              />
            );
          })}
        </tbody>
      </table>
    );

    const remainingTable = (
      <table>
        <tbody>
          {rows.slice(rowSplitIndex).map((row) => {
            // Info: (20241118 - Anna) 使用行的外部 HTML 或內容生成唯一鍵值
            const uniqueKey = `remaining-row-${row.innerHTML.length}-${row.outerHTML}`;
            return (
              <tr
                key={uniqueKey} // Info: (20241118 - Anna) 確保鍵值唯一
                dangerouslySetInnerHTML={{ __html: row.innerHTML }}
              />
            );
          })}
        </tbody>
      </table>
    );

    // Info: (20241118 - Anna) 將分割表格與其他內容組合
    const splitLargeContentBlock = <div>{splitTable}</div>;

    const remainingContent = <div>{remainingTable}</div>;

    // Info: (20241118 - Anna) 清理測量容器
    renderRoot.unmount(); // Info: (20241118 - Anna) 卸載渲染的內容
    document.body.removeChild(measureContainer); // Info: (20241118 - Anna) 移除測量容器

    // Info: (20241118 - Anna) 返回結果
    return { splitLargeContentBlock, remainingContent }; // Info: (20241118 - Anna) 返回分割表格與其餘內容
  }

  // Info: (20241118 - Anna) 如果沒有表格，返回原內容（無需分割）
  const splitLargeContentBlock = <div>{largeContentBlock}</div>;
  const remainingContent = null;

  // Info: (20241118 - Anna) 清理測量容器
  renderRoot.unmount();
  document.body.removeChild(measureContainer);

  // Info: (20241118 - Anna) 返回結果
  return { splitLargeContentBlock, remainingContent };
};

  // Info: (20241118 - Anna) 動態分頁邏輯
  // Info: (20241118 - Anna) 接收一個參數 contentPages，表示頁面的內容
  // Info: (20241118 - Anna) splitPages 實作
  const splitPages = () => {
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
    // Info: (20241118 - Anna) splitLargeContent 實作，使用 getRemainingContent
    const splitLargeContent = (PerInitialPage: React.ReactNode) => {
      let remainingContent = PerInitialPage; // Info: (20241118 - Anna) remainingContent 用於保存還未被分割的部分，初始值為整個項目

      while (remainingContent) {
        // Info: (20241118 - Anna) 建立一個子容器，將剩餘的內容渲染到容器中。 >> 進一步分割過大的內容
        const splitLargeContentBlockContainer = document.createElement('div');
        // Info: (20241118 - Anna)創建 React 渲染入口點
        const renderRoot = createRoot(splitLargeContentBlockContainer);
        renderRoot.render(<div>{remainingContent}</div>);
        // Info: (20241118 - Anna) 把渲染後的容器推到主容器中
        splitContainer.appendChild(splitLargeContentBlockContainer);

        // Info: (20241118 - Anna) 使用 getBoundingClientRect() 測量渲染後的高度。
        const remainingContentHeight =
          splitLargeContentBlockContainer.getBoundingClientRect().height;

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

        const splitRenderedContent = splitLargeContentBlockContainer.innerHTML; // Info: (20241118 - Anna) 分割後的一部分已渲染內容;記錄渲染結果;
        // Info: (20241118 - Anna) getRemainingContent 根據剩餘的可用高度，從 remainingContent 中取出適合的內容，並返回剩下部分（需要放到下一頁）
        remainingContent = getRemainingContent(
          remainingContent,
          PerPageMaxHeight - accumulatedHeight // Info: (20241118 - Anna) getRemainingContent 當前頁面還能容納的剩餘高度
        ).remainingContent;
        // .remainingContent 的作用：
        // 返回值結構： getRemainingContent 函數的返回值是一個物件，類似於以下結構：
        // {
        //   splitLargeContentBlock: React.ReactNode; // 可以放入當前頁面的部分，表示已經被切割出來並適合放入當前頁面的內容。
        //   remainingContent: React.ReactNode; // 需要放到下一頁的部分，表示無法放入當前頁面，應該繼續處理或移至下一頁的剩餘部分。
        // }
        // 使用 .remainingContent，我們提取出無法放入當前頁面的部分，賦值給 remainingContent，以便在下一次迴圈中繼續處理。
        //         每次調用 getRemainingContent，會切割內容，將部分內容放入當前頁面。
        // 剩餘的內容存放在 remainingContent 中，這個過程會持續進行，直到 remainingContent 被完全處理。

        // Info: (20241118 - Anna) 將 HTML 字串 splitRenderedContent 包裝成 React 元素並加入到 currentPage 中
        currentPage.push(<div dangerouslySetInnerHTML={{ __html: splitRenderedContent }} />);
        accumulatedHeight += remainingContentHeight;

        // Info: (20241118 - Anna) 清理子容器
        renderRoot.unmount(); // Info: (20241118 - Anna) 渲染完成後，使用 root.unmount() 卸載渲染的內容，並從 DOM 中移除容器。
        splitContainer.removeChild(splitLargeContentBlockContainer); // Info: (20241118 - Anna) 從主容器中移除
      }
    };
    // Info: (20241119 - Anna) 主邏輯：直接遍歷 initialPages，檢查每個項目是否超過 A4 高度 (PerPageMaxHeight)
    // Info: (20241119 - Anna) 如果單個項目太大，調用 splitLargeContent 進一步分割
    // Info: (20241119 - Anna) 如果能直接放入當前頁面，加入當前頁面
    // Info: (20241119 - Anna) 如果當前頁面空間不足，開啟新頁面
    initialPages.forEach((PerInitialPage) => {
      const contentContainer = document.createElement('div'); // Info: (20241119 - Anna) 為了測量高度，建立一個新的 div 作為容器
      const renderRoot = createRoot(contentContainer);
      renderRoot.render(<div>{PerInitialPage}</div>); // Info: (20241119 - Anna) 在這個容器中渲染子項目 PerInitialPage。
      splitContainer.appendChild(contentContainer); // Info: (20241119 - Anna) 將測量容器加入到 splitContainer 中，實際將子項目渲染到 DOM 中以進行測量。

      const contentHeight = contentContainer.getBoundingClientRect().height; // Info: (20241119 - Anna) 使用 getBoundingClientRect() 測量 contentContainer 的高度 (contentHeight) 判斷這個項目是否需要分割

      if (contentHeight > PerPageMaxHeight) {
        // Info: (20241119 - Anna) 調用 splitLargeContent 處理過大的內容
        splitLargeContent(PerInitialPage);
      } else {
        // Info: (20241119 - Anna) 如果將這個項目加入當前頁面後，超過 A4 高度 (PerPageMaxHeight)
        if (accumulatedHeight + contentHeight > PerPageMaxHeight) {
          finalPages.push(<div>{currentPage}</div>); // Info: (20241119 - Anna) 保存當前頁面：將 currentPage 加入 finalPages。
          currentPage = []; // Info: (20241119 - Anna) 開始新頁：清空 currentPage，重置累積高度 (accumulatedHeight)。
          // Info: (20241119 - Anna) 判斷頁面類型：
          // Info: (20241119 - Anna) 第一頁需要加上 FirstPageHeaderHeight 和 footerHeight。
          // Info: (20241119 - Anna) 後續頁面只需加上 AfterFirstPageHeaderHeight 和 footerHeight。
          // Info: (20241119 - Anna) 更新 isFirstPage 為 false
          accumulatedHeight = isFirstPage
            ? FirstPageHeaderHeight + footerHeight
            : AfterFirstPageHeaderHeight + footerHeight;
          isFirstPage = false;
        }

        // Info: (20241119 - Anna) 如果這個項目可以直接加入當前頁面：
        // Info: (20241119 - Anna) 將子項目加入 currentPage
        // Info: (20241119 - Anna) 更新累積高度 (accumulatedHeight)
        currentPage.push(PerInitialPage);
        accumulatedHeight += contentHeight;
      }

      // Info: (20241119 - Anna) 清理測量容器:
      // Info: (20241119 - Anna) 卸載渲染：用 renderRoot.unmount() 移除 React 渲染的內容。
      // Info: (20241119 - Anna) 清理 DOM：將測量容器從 splitContainer 中移除，確保乾淨。
      renderRoot.unmount();
      splitContainer.removeChild(contentContainer);
    });

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
    const finalSplitPages = splitPages(); // Info: (20241118 - Anna) 將初始的內容陣列 initialPages 進一步分割。每個項目依高度分割為多頁。返回的結果是 finalSplitPages
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
