import React, { ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';

interface CashFlowA4TemplateProps {
  children: React.ReactNode;
  reportFinancial?: {
    company?: {
      code: string;
      name: string;
    };
  };
  curDate?: string;
  preDate?: string;
}

const CashFlowA4Template: React.FC<CashFlowA4TemplateProps> = ({
  children,
  reportFinancial,
  curDate,
  preDate,
}) => {
  const { t } = useTranslation(['reports']);
  const [firstBlockSplitPages, setFirstBlockSplitPages] = useState<ReactNode[][]>([]);
  const [secondBlockSplitPages, setSecondBlockSplitPages] = useState<ReactNode[][]>([]);

  // Info: (20241112 - Anna) 動態應用分頁樣式
  const printContainerClass =
    'mx-auto w-a4-width origin-top overflow-x-auto print:m-0  print:block  print:h-auto print:w-full print:p-0';
  const printContentClass = 'relative h-a4-height overflow-hidden';
  // Info: (20241111 - Anna) 分割內容為多頁
  const pages = React.Children.toArray(children);

  // Info: (20241120 - Anna) 使用遞迴方式將子節點展平
  const flattenChildren = (nodes: React.ReactNode): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    React.Children.forEach(nodes, (node) => {
      if (React.isValidElement(node) && node.props?.children) {
        // Info: (20241130 - Anna) 僅遞迴展平嵌套的子節點
        result.push(node, ...flattenChildren(node.props.children));
      } else {
        result.push(node); // Info: (20241130 - Anna) 保留完整的 React 元素或文本節點
      }
    });
    return result;
  };
  // Info: (20241120 - Anna) 新增分頁邏輯
  const splitTableRows = (rows: React.ReactNode[], rowsPerPage: number): Promise<ReactNode[][]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const validRows = rows.filter(
          (row) => React.isValidElement(row) && row.type === 'tr'
        ) as ReactNode[]; // Info: (20241130 - Anna) 強制轉換為 ReactNode[]
        const splitPages: ReactNode[][] = [];
        for (let i = 0; i < validRows.length; i += rowsPerPage) {
          splitPages.push(validRows.slice(i, i + rowsPerPage));
        }
        resolve(splitPages); // Info: (20241130 - Anna) 渲染完成後返回分頁結果
      }, 100); // Info: (20241130 - Anna) 模擬渲染耗時
    });
  };
  // Info: (20241120 - Anna) 處理 pages[0] 表格分頁
  const firstTableRows = flattenChildren((pages[0] as React.ReactElement)?.props?.children);
  const FirstBlockSplitPages = splitTableRows(firstTableRows, 10);
  // Deprecated: (20241130 - Anna) remove eslint-disable
  // eslint-disable-next-line no-console
  console.log('FirstBlockSplitPages', FirstBlockSplitPages);

  // Info: (20241120 - Anna) 提取表格渲染邏輯，確保每頁表格結構完整
  const renderTableWithRows = (
    rows: React.ReactNode[],
    headers: React.ReactNode,
    isFirstPage: boolean
  ) => (
    <table className="relative z-1 w-full border-collapse bg-white">
      {isFirstPage && <thead className="text-neutral-400">{headers}</thead>}
      <tbody className="text-neutral-400">{rows}</tbody>
    </table>
  );
  // Info: (20241120 - Anna) 處理 pages[1] 表格分頁
  const secondTableRows = flattenChildren((pages[1] as React.ReactElement)?.props?.children);
  const SecondBlockSplitPages = splitTableRows(secondTableRows, 10);
  // Deprecated: (20241130 - Anna) remove eslint-disable
  // eslint-disable-next-line no-console
  console.log('SecondBlockSplitPages', SecondBlockSplitPages);

  // Info: (20241130 - Anna) 在 useEffect 中使用 async/await 確保渲染完成後更新狀態
  useEffect(() => {
    (async () => {
      const performSplitFirstBlock = async () => {
        const splitPages = await splitTableRows(firstTableRows, 10); // Info: (20241130 - Anna) 等待分頁完成
        setFirstBlockSplitPages(splitPages); // Info: (20241130 - Anna) 更新狀態
      };

      if (firstTableRows) await performSplitFirstBlock(); // Info: (20241130 - Anna) 確保 rows 存在才執行
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const performSplitSecondBlock = async () => {
        const splitPages = await splitTableRows(secondTableRows, 10); // Info: (20241130 - Anna) 等待分頁完成
        setSecondBlockSplitPages(splitPages); // Info: (20241130 - Anna) 更新狀態
      };

      if (secondTableRows) await performSplitSecondBlock(); // Info: (20241130 - Anna) 確保 rows 存在才執行
    })();
  }, []);

  // Info: (20241120 - Anna)  確保表格分頁後保留表頭
  const firstTableHeaders = (
    <tr className="text-neutral-400">
      <th
        className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold"
        style={{ width: '55px' }}
      >
        {t('reports:TAX_REPORT.CODE_NUMBER')}
      </th>
      <th
        className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold"
        style={{ width: '261px' }}
      >
        {t('reports:REPORTS.ACCOUNTING_ITEMS')}
      </th>
      <th
        className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold print:whitespace-pre-line"
        style={{ width: '120px' }}
      >
        {curDate}
      </th>
      <th
        className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold print:whitespace-pre-line"
        style={{ width: '120px' }}
      >
        {preDate}
      </th>
    </tr>
  );

  // Info: (20241120 - Anna)  確保表格分頁後保留表頭
  const secondTableHeaders = (
    <tr className="text-neutral-400">
      <th
        className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold"
        style={{ width: '55px' }}
      >
        {t('reports:TAX_REPORT.CODE_NUMBER')}
      </th>
      <th
        className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold"
        style={{ width: '261px' }}
      >
        {t('reports:REPORTS.ACCOUNTING_ITEMS')}
      </th>
      <th
        className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold print:whitespace-pre-line"
        style={{ width: '120px' }}
      >
        {curDate}
      </th>
      <th
        className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold print:whitespace-pre-line"
        style={{ width: '120px' }}
      >
        {preDate}
      </th>
    </tr>
  );

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
                <p className="whitespace-nowrap text-left text-xs font-bold leading-5">
                  {curDate}
                  <br />
                  財務報告 - 現金流量表
                </p>
              </>
            )}
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-9/12 bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
    ) : (
      // Info: (20241112 - Anna) 渲染除第一頁以外的頁眉結構
      <header className="mb-25px flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
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
      {/* Info: (20241120 - Anna) 渲染第一塊分頁 */}
      {firstBlockSplitPages.map((rows, index) => (
        <div
          key={`first-block-page-${index + 1}`}
          className={printContainerClass}
          // style={{ pageBreakBefore: index === 0 ? 'auto' : 'always', pageBreakAfter: 'always' }}
          style={{
            pageBreakBefore: 'auto',
            pageBreakAfter: 'auto',
          }}
        >
          <div
            id={`first-block-page-${index + 1}`}
            className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
          >
            {renderedHeader(index === 0)}
            {renderTableWithRows(rows, firstTableHeaders, index >= 0)}
            {renderedFooter(index + 1)}
          </div>
        </div>
      ))}

      {/* Info: (20241120 - Anna) 渲染第二塊分頁 */}
      {secondBlockSplitPages.map((rows, index) => (
        <div
          key={`second-block-page-${index + 1}`}
          className={printContainerClass}
          // style={{ pageBreakBefore: 'always', pageBreakAfter: 'always' }}
          style={{
            pageBreakBefore: 'auto',
            pageBreakAfter: 'auto',
          }}
        >
          <div
            id={`second-block-page-${index + 1}`}
            className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
          >
            {renderedHeader(false)}
            {renderTableWithRows(rows, secondTableHeaders, index >= 0)}
            {renderedFooter(firstBlockSplitPages.length + index + 1)}
          </div>
        </div>
      ))}

      {/* Info: (20241120 - Anna) 渲染額外的內容 */}
      {pages.slice(2).map((pageContent, index) => (
        <div
          key={`additional-block-page-${index + 1}`}
          className={printContainerClass}
          // style={{ pageBreakBefore: 'always', pageBreakAfter: 'always' }}
          style={{
            pageBreakBefore: 'auto',
            pageBreakAfter: 'auto',
          }}
        >
          <div
            id={`additional-block-page-${
              firstBlockSplitPages.length + secondBlockSplitPages.length + index + 1
            }`}
            className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
          >
            {renderedHeader(false)}
            <div>{pageContent}</div> {/* Info: (20241130 - Anna) 渲染 pageContent */}
            {renderedFooter(firstBlockSplitPages.length + secondBlockSplitPages.length + index + 1)}
          </div>
        </div>
      ))}
    </>
  );
};

export default CashFlowA4Template;
