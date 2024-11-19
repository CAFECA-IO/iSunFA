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
  // Info: (20241112 - Anna) 動態應用分頁樣式
  const printContainerClass =
    'mx-auto w-a4-width origin-top overflow-x-auto print:m-0  print:block  print:h-auto print:w-full print:p-0';
  const printContentClass = 'relative h-a4-height overflow-hidden';
  // Info: (20241111 - Anna) 分割內容為多頁
  const pages = React.Children.toArray(children);

  // Info: (20241120 - Anna) 新增分頁邏輯
  // const splitTableRows = (rows: React.ReactNode[], rowsPerPage: number) => {
  //   const splitPages: React.ReactNode[] = [];
  //   for (let i = 0; i < rows.length; i += rowsPerPage) {
  //     splitPages.push(rows.slice(i, i + rowsPerPage));
  //   }
  //   return splitPages;
  // };
  const splitTableRows = (rows: React.ReactNode[], rowsPerPage: number) => {
    // 過濾非 <tr> 節點
    const validRows = rows.filter((row) => React.isValidElement(row) && row.type === 'tr');
    const splitPages: React.ReactNode[] = [];
    for (let i = 0; i < validRows.length; i += rowsPerPage) {
      splitPages.push(validRows.slice(i, i + rowsPerPage));
    }
    return splitPages;
  };

  // Info: (20241120 - Anna) 使用遞迴方式將子節點展平
  // const flattenChildren = (nodes: React.ReactNode): React.ReactNode[] => {
  //   const result: React.ReactNode[] = [];
  //   React.Children.forEach(nodes, (node) => {
  //     if (React.isValidElement(node) && node.props?.children) {
  //       result.push(...flattenChildren(node.props.children)); // 遞迴
  //     } else {
  //       result.push(node);
  //     }
  //   });
  //   return result;
  // };
  const flattenChildren = (nodes: React.ReactNode): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    React.Children.forEach(nodes, (node) => {
      if (React.isValidElement(node) && node.props?.children) {
        // 僅遞迴展平嵌套的子節點
        result.push(node, ...flattenChildren(node.props.children));
      } else {
        result.push(node); // 保留完整的 React 元素或文本節點
      }
    });
    return result;
  };

  // Info: (20241120 - Anna) 處理 pages[0] 表格分頁
  const firstTableRows = flattenChildren((pages[0] as React.ReactElement)?.props?.children);
  const FirstBlockSplitPages = splitTableRows(firstTableRows, 10);
  // eslint-disable-next-line no-console
  console.log('FirstBlockSplitPages', FirstBlockSplitPages);

  // Info: (20241120 - Anna) 處理 pages[1] 表格分頁
  const secondTableRows = flattenChildren((pages[1] as React.ReactElement)?.props?.children);
  const SecondBlockSplitPages = splitTableRows(secondTableRows, 13);
  // eslint-disable-next-line no-console
  console.log('SecondBlockSplitPages', SecondBlockSplitPages);

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

  // return (
  //   <>
  //     {/* Info: (20241111 - Anna)第一頁 */}
  //     <div className={`${printContainerClass}`} data-print-mode>
  //       <div id="1" className={`${printContentClass} relative h-a4-height overflow-y-hidden`}>
  //         {/* Info: (20240723 - Shirley) watermark logo */}
  //         <div className="relative right-0 top-16 z-0">
  //           <Image
  //             className="absolute right-0 top-0"
  //             src="/logo/watermark_logo.svg"
  //             alt="isunfa logo"
  //             width={400}
  //             height={300}
  //           />
  //         </div>
  //         {renderedHeader(true) /* Info: (20241112 - Anna) 第一頁使用 `renderedHeader(true)` */}
  //         <div>
  //           {/* {pages[0]} */}
  //           {FirstBlockSplitPages[0]}
  //         </div>

  //         {renderedFooter(1)}
  //       </div>
  //     </div>

  //     {/* Info: (20241111 - Anna) 從第二頁開始到最後一頁 */}
  //     <div className={`${printContainerClass}`} data-print-mode>
  //       {/* Info: (20241120 - Anna) 渲染 FirstBlockSplitPages 的第二頁到最後一頁 */}
  //       {/* {pages.slice(1).map((pageContent, index) => ( */}
  //       {FirstBlockSplitPages.slice(1).map((pageContent, index) => (
  //         <div key={`page-${index + 2}`}>
  //           {/* Info: (20241112 - Anna) 動態設置 `id`，以便與頁碼匹配 */}
  //           <div
  //             id={`${index + 2}`}
  //             className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
  //           >
  //             {
  //               renderedHeader(
  //                 false
  //               ) /* Info: (20241112 - Anna) 其他頁使用 `renderedHeader(false)` */
  //             }
  //             <div>{pageContent}</div>
  //             {renderedFooter(index + 2)}
  //           </div>
  //         </div>
  //       ))}

  //       {/* Info: (20241120 - Anna) 渲染 SecondBlockSplitPages 的每一頁 */}
  //       {SecondBlockSplitPages.map((pageContent, index) => (
  //         <div key={`second-block-page-${FirstBlockSplitPages.length + index + 1}`}>
  //           <div
  //             id={`${FirstBlockSplitPages.length + index + 1}`}
  //             className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
  //           >
  //             {renderedHeader(false)}
  //             <div>{pageContent}</div>
  //             {renderedFooter(FirstBlockSplitPages.length + index + 1)}
  //           </div>
  //         </div>
  //       ))}
  //       {/* Info: (20241120 - Anna) 渲染 pages[2], pages[3], pages[4] */}
  //       {pages.slice(2).map((pageContent, index) => (
  //         <div
  //           key={`page-${FirstBlockSplitPages.length + SecondBlockSplitPages.length + index + 1}`}
  //         >
  //           <div
  //             id={`${FirstBlockSplitPages.length + SecondBlockSplitPages.length + index + 1}`}
  //             className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
  //           >
  //             {renderedHeader(false)}
  //             <div>{pageContent}</div>
  //             {renderedFooter(
  //               FirstBlockSplitPages.length + SecondBlockSplitPages.length + index + 1
  //             )}
  //           </div>
  //         </div>
  //       ))}
  //     </div>
  //   </>
  // );
  return (
    <>
      {/* 渲染 FirstBlockSplitPages */}
      {FirstBlockSplitPages.map((pageContent, index) => (
        <div key={`first-block-page-${index + 1}`} className={`${printContainerClass}`}>
          <div
            id={`first-block-${index + 1}`}
            className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
          >
            {renderedHeader(index === 0)} {/* 第一頁渲染特定 Header */}
            <div>{pageContent}</div>
            {renderedFooter(index + 1)}
          </div>
        </div>
      ))}

      {/* 渲染 SecondBlockSplitPages */}
      {SecondBlockSplitPages.map((pageContent, index) => (
        <div
          key={`second-block-page-${FirstBlockSplitPages.length + index + 1}`}
          className={`${printContainerClass}`}
        >
          <div
            id={`second-block-${FirstBlockSplitPages.length + index + 1}`}
            className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
          >
            {renderedHeader(false)}
            <div>{pageContent}</div>
            {renderedFooter(FirstBlockSplitPages.length + index + 1)}
          </div>
        </div>
      ))}

      {/* 渲染剩餘的 pages */}
      {pages.slice(2).map((pageContent, index) => (
        <div
          key={`page-${FirstBlockSplitPages.length + SecondBlockSplitPages.length + index + 1}`}
          className={`${printContainerClass}`}
        >
          <div
            id={`${FirstBlockSplitPages.length + SecondBlockSplitPages.length + index + 1}`}
            className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
          >
            {renderedHeader(false)}
            <div>{pageContent}</div>
            {renderedFooter(FirstBlockSplitPages.length + SecondBlockSplitPages.length + index + 1)}
          </div>
        </div>
      ))}
    </>
  );
};

export default BalanceSheetA4Template;
