import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { ITeamInvoice } from '@/interfaces/subscription';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import InvoiceDetail from '@/components/beta/invoice_page/invoice_detail';
import loggerFront from '@/lib/utils/logger_front';

const InvoicePrintPage = () => {
  const router = useRouter();
  const { teamId, invoiceId } = router.query;

  // Info: (20250117 - Julian) 取得發票資料 API
  const { trigger: getInvoiceDataAPI } = APIHandler<ITeamInvoice>(
    APIName.GET_SUBSCRIPTION_INVOICE_BY_TEAM_ID
  );

  const [invoice, setInvoice] = useState<ITeamInvoice | null>(null);

  useEffect(() => {
    // Info: (20250117 - Julian) 打 API 取得發票資料
    const getInvoiceData = async () => {
      if (!invoiceId) return;

      try {
        const { data: invoiceData, success } = await getInvoiceDataAPI({
          params: { teamId, invoiceId },
        });

        if (success && invoiceData) {
          setInvoice(invoiceData);
        }
      } catch (error) {
        loggerFront.error('取得發票資料失敗');
      }
    };

    getInvoiceData();
  }, [invoiceId]);

  if (!invoice) return <div>Something went wrong, please try again later.</div>;
  return <InvoiceDetail invoice={invoice} />;
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, [
        'layout',
        'dashboard',
        'subscriptions',
        'common',
      ])),
    },
  };
};

export default InvoicePrintPage;
