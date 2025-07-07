// Deprecated: (20241206 - Liz) This file is deprecated and will be removed in the future.
import React, { ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import { FinancialReport } from '@/interfaces/report';
import { useTranslation } from 'next-i18next';

interface IncomeStatementA4TemplateProps {
  children: React.ReactNode;
  financialReport?: FinancialReport;
  curDateFrom: string;
  curDateTo: string;
  // preDateFrom: string;
  // preDateTo: string;
}

const IncomeStatementA4Template: React.FC<IncomeStatementA4TemplateProps> = ({
  children,
  financialReport,
  curDateFrom,
  curDateTo,
  // preDateFrom,
  // preDateTo,
}) => {
  const { t } = useTranslation(['reports']);
  const [firstBlockSplitPages, setFirstBlockSplitPages] = useState<ReactNode[][]>([]);
  const [secondBlockSplitPages, setSecondBlockSplitPages] = useState<ReactNode[][]>([]);

  const printContainerClass =
    'mx-auto w-a4-width origin-top overflow-x-auto print:m-0  print:block  print:h-auto print:w-full print:p-0';
  const printContentClass = 'relative h-a4-height overflow-hidden';

  const pages = React.Children.toArray(children);

  const flattenChildren = (nodes: React.ReactNode): React.ReactNode[] => {
    const result: React.ReactNode[] = [];

    React.Children.forEach(nodes, (node, index) => {
      const key = `empty-${index}`;

      if (React.isValidElement(node)) {
        if (node.props?.children) {
          result.push(node, ...flattenChildren(node.props.children));
        } else {
          result.push(node);
        }
      } else if (typeof node === 'string' || typeof node === 'number') {
        result.push(node);
      } else if (node === null || node === undefined) {
        result.push(<div key={key} />);
      }
    });

    return result;
  };

  const firstTableRows = flattenChildren(
    React.isValidElement(pages[0]) ? pages[0].props.children : []
  );
  const secondTableRows = flattenChildren(
    React.isValidElement(pages[1]) ? pages[1].props.children : []
  );

  const splitTableRows = (rows: ReactNode[], rowsPerPage: number): Promise<ReactNode[][]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const validRows = rows.filter((row) => {
          return (
            React.isValidElement(row) && (row.type === 'tr' || row.props['data-is-tr'] === 'true')
          );
        }) as ReactNode[];
        const splitPages: ReactNode[][] = [];
        for (let i = 0; i < validRows.length; i += rowsPerPage) {
          splitPages.push(validRows.slice(i, i + rowsPerPage));
        }
        resolve(splitPages);
      }, 100);
    });
  };

  useEffect(() => {
    (async () => {
      const performSplitFirstBlock = async () => {
        const splitPages = await splitTableRows(firstTableRows, 10);
        setFirstBlockSplitPages(splitPages);
      };

      if (firstTableRows) await performSplitFirstBlock();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const performSplitSecondBlock = async () => {
        const splitPages = await splitTableRows(secondTableRows, 10);
        setSecondBlockSplitPages(splitPages);
      };

      if (secondTableRows) await performSplitSecondBlock();
    })();
  }, []);

  const renderTableWithRows = (rows: React.ReactNode[]) => (
    <table className="relative z-1 w-full border-collapse bg-white">
      <tbody className="text-neutral-400">{rows}</tbody>
    </table>
  );
  const renderHeader = (isFirstPage: boolean) => {
    return isFirstPage ? (
      <header className="mb-12 flex justify-between pl-0 text-white">
        <div className="w-3/10 bg-surface-brand-secondary pb-14px pl-10px pr-14px pt-40px font-bold">
          <div className="">
            {financialReport && financialReport.company && (
              <>
                <h1 className="mb-30px text-h6">
                  {financialReport.company.code} <br />
                  {financialReport.company.name}
                </h1>
                <p className="text-left text-xs font-bold leading-5">
                  {curDateFrom} <br /> {t('reports:COMMON.TO')} {curDateTo}
                  <br />
                  財務報告 - 損益表
                </p>
              </>
            )}
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute -bottom-20px right-0 h-5px w-9/12 bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
    ) : (
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
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
    );
  };
  const renderFooter = (page: number) => (
    <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-surface-brand-secondary p-10px">
      <p className="text-xs text-white">{page}</p>
      <div className="text-base font-bold text-surface-brand-secondary">
        <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
      </div>
    </footer>
  );

  return (
    <>
      {firstBlockSplitPages.map((rows, index) => {
        return (
          <div
            key={`first-block-page-${index + 1}`}
            className={printContainerClass}
            style={{
              pageBreakBefore: 'auto',
              pageBreakAfter: 'auto',
            }}
          >
            <div
              id={`first-block-page-${index + 1}`}
              className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
            >
              {renderHeader(index === 0)}
              {renderTableWithRows(rows)}
              {renderFooter(index + 1)}
            </div>
          </div>
        );
      })}

      {secondBlockSplitPages.map((rows, index) => (
        <div
          key={`second-block-page-${index + 1}`}
          className={printContainerClass}
          style={{
            pageBreakBefore: 'auto',
            pageBreakAfter: 'auto',
          }}
        >
          <div
            id={`second-block-page-${index + 1}`}
            className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
          >
            {renderHeader(false)}
            {renderTableWithRows(rows)}
            {renderFooter(firstBlockSplitPages.length + index + 1)}
          </div>
        </div>
      ))}

      {pages.slice(2).map((pageContent, index) => (
        <div
          key={`additional-block-page-${index + 1}`}
          className={printContainerClass}
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
            {renderHeader(false)}
            <div>{pageContent}</div>
            {renderFooter(firstBlockSplitPages.length + secondBlockSplitPages.length + index + 1)}
          </div>
        </div>
      ))}
    </>
  );
};

export default IncomeStatementA4Template;
