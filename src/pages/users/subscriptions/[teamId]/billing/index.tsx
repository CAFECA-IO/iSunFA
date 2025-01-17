import Head from 'next/head';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/beta/layout/layout';
import BillingPageBody from '@/components/beta/billing_page/billing_page_body';
import { IUserOwnedTeam, TPlanType, TPaymentStatus } from '@/interfaces/subscription';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import { ONE_DAY_IN_MS, THREE_DAYS_IN_MS } from '@/constants/time';

const FAKE_TEAM_DATA: IUserOwnedTeam = {
  id: 3,
  name: 'Team B',
  plan: TPlanType.ENTERPRISE,
  enableAutoRenewal: false,
  nextRenewalTimestamp: 1737268546000,
  expiredTimestamp: 1737268546000,
  paymentStatus: TPaymentStatus.UNPAID,
};

const BillingPage = () => {
  const { t } = useTranslation(['subscriptions']);
  const { toastHandler } = useModalContext();
  const router = useRouter();
  const { teamId } = router.query;
  const teamIdString = teamId ? (Array.isArray(teamId) ? teamId[0] : teamId) : '';
  // Deprecated: (20250113 - Liz)
  // eslint-disable-next-line no-console
  console.log('teamIdString:', teamIdString);

  // ToDo: (20250113 - Liz) 先暫時使用假資料 FAKE_TEAM_DATA
  // Deprecated: (20250115 - Liz) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [team, setTeam] = useState<IUserOwnedTeam | null>(FAKE_TEAM_DATA);

  // ToDo: (20250113 - Liz) 呼叫 API 利用 teamIdString 取得 team 的資料，並且設定到 team state
  // setTeam(teamData);

  // Info: (20250116 - Liz) team.paymentStatus 為 UNPAID 時，顯示付款失敗的 Toast
  useEffect(() => {
    if (!team) return;

    const PAYMENT_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${team.id}/payment`;

    // Info: (20250110 - Liz) 計算一個 timestamp 距離現在的剩餘天數
    const getRemainingDays = (timestamp: number) => {
      const now = Date.now();
      const diff = timestamp - now > 0 ? timestamp - now : 0;
      return Math.ceil(diff / ONE_DAY_IN_MS);
    };

    // Info: (20250110 - Liz) 付款失敗三天後會自動降級到 Beginner 方案
    const remainingDays = getRemainingDays(team.expiredTimestamp + THREE_DAYS_IN_MS);

    // Info: (20250117 - Liz) 付款失敗三天後提醒即將降級為 Beginner 方案
    if (team.paymentStatus === TPaymentStatus.UNPAID && remainingDays <= 3) {
      toastHandler({
        id: ToastId.SUBSCRIPTION_PAYMENT_STATUS_UNPAID,
        type: ToastType.ERROR,
        content: (
          <div className="flex items-center gap-32px">
            <p className="text-sm text-text-neutral-primary">
              <span className="font-semibold">
                {t('subscriptions:ERROR.TOAST_PAYMENT_FAILED_TITLE')}
              </span>

              <span className="font-normal">
                {t('subscriptions:ERROR.TOAST_PAYMENT_FAILED_MESSAGE_PREFIX') +
                  remainingDays +
                  t('subscriptions:ERROR.TOAST_PAYMENT_FAILED_MESSAGE_SUFFIX')}
              </span>
            </p>
            <Link href={PAYMENT_PAGE} className="text-base font-semibold text-link-text-error">
              {t('subscriptions:ERROR.UPDATE_PAYMENT')}
            </Link>
          </div>
        ),
        closeable: true,
      });
    }

    // Info: (20250117 - Liz) 到期日前三天
    const threeDaysBeforeExpiration = getRemainingDays(team.expiredTimestamp);

    // Info: (20250117 - Liz) 到期日前三天提醒
    if (team.paymentStatus === TPaymentStatus.UNPAID && threeDaysBeforeExpiration <= 3) {
      toastHandler({
        id: ToastId.PLAN_EXPIRED_REMINDER,
        type: ToastType.WARNING,
        content: (
          <div className="flex items-center gap-32px">
            <p className="text-sm text-text-neutral-primary">
              <span className="font-semibold">
                {t('subscriptions:ERROR.TOAST_EXPIRED_REMINDER_TITLE')}
              </span>

              <span className="font-normal">
                {t('subscriptions:ERROR.TOAST_EXPIRED_REMINDER_MESSAGE_PREFIX') +
                  threeDaysBeforeExpiration +
                  t('subscriptions:ERROR.TOAST_EXPIRED_REMINDER_MESSAGE_SUFFIX')}
              </span>
            </p>
            <Link href={PAYMENT_PAGE} className="text-base font-semibold text-link-text-error">
              {t('subscriptions:ERROR.UPDATE_PAYMENT')}
            </Link>
          </div>
        ),
        closeable: true,
      });
    }
  }, [t, team, toastHandler]);

  // ToDo: (20250113 - Liz) 如果 team 資料不存在，顯示錯誤頁面
  if (!team) {
    return (
      <Layout
        isDashboard={false}
        pageTitle={t('subscriptions:ERROR.TEAM_DATA_NOT_FOUND')}
        goBackUrl={ISUNFA_ROUTE.SUBSCRIPTIONS}
      >
        <h1 className="text-red-500">{t('subscriptions:ERROR.TEAM_DATA_NOT_FOUND')}</h1>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('subscriptions:SUBSCRIPTIONS_PAGE.META_TITLE')}</title>
        <meta
          name="description"
          content="iSunFA: Blockchain AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
        <meta name="author" content="CAFECA" />
        <meta name="keywords" content="區塊鏈,人工智慧,會計" />

        <meta property="og:title" content="iSunFA" />
        <meta
          property="og:description"
          content="iSunFA: Blockchain AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
      </Head>

      <Layout
        isDashboard={false}
        pageTitle={`${t('subscriptions:BILLING_PAGE.PAGE_TITLE_PREFIX')} ${team.name} ${t('subscriptions:BILLING_PAGE.PAGE_TITLE_SUFFIX')}`}
        goBackUrl={ISUNFA_ROUTE.SUBSCRIPTIONS}
      >
        <BillingPageBody team={team} />
      </Layout>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, [
        'common',
        'layout',
        'dashboard',
        'subscriptions',
      ])),
    },
  };
};

export default BillingPage;
