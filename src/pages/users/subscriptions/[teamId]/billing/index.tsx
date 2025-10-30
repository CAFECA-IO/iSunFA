import Head from 'next/head';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/beta/layout/layout';
import BillingPageBody from '@/components/beta/billing_page/billing_page_body';
import { IUserOwnedTeam, TPaymentStatus } from '@/interfaces/subscription';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import { THREE_DAYS_IN_MS } from '@/constants/time';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { getRemainingDays } from '@/lib/utils/common';
import loggerFront from '@/lib/utils/logger_front';

const BillingPage = () => {
  const { t } = useTranslation(['subscriptions']);
  const { toastHandler } = useModalContext();
  const router = useRouter();
  const { teamId } = router.query;
  const teamIdString = teamId ? (Array.isArray(teamId) ? teamId[0] : teamId) : '';
  const [team, setTeam] = useState<IUserOwnedTeam | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Info: (20250117 - Liz) 取得使用者擁有的團隊資料 API (user is the owner of the team)
  const { trigger: getOwnedTeamAPI } = APIHandler<IUserOwnedTeam>(
    APIName.GET_SUBSCRIPTION_BY_TEAM_ID
  );

  // Info: (20250117 - Liz) 打 API 取得使用者擁有的團隊資料
  const getOwnedTeam = useCallback(async () => {
    if (!teamIdString) return;
    setIsLoading(true);

    try {
      const { data: teamData, success } = await getOwnedTeamAPI({
        params: { teamId: teamIdString },
      });

      if (success && teamData) {
        setTeam(teamData);
      }
    } catch (error) {
      loggerFront.error('取得團隊資料失敗');
      loggerFront.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [teamIdString]);

  useEffect(() => {
    getOwnedTeam();
  }, [getOwnedTeam]);

  // Info: (20250116 - Liz) team.paymentStatus 為 UNPAID 時，顯示付款失敗的 Toast
  useEffect(() => {
    if (!team) return;

    const PAYMENT_PAGE = `${ISUNFA_ROUTE.SUBSCRIPTIONS}/${team.id}/payment`;

    // Info: (20250110 - Liz) 距離付款失敗三天後的剩餘天數
    const remainingDays = getRemainingDays(team.expiredTimestamp + THREE_DAYS_IN_MS);

    // Info: (20250117 - Liz) 付款失敗後提醒三天後會降級為 Beginner 方案
    if (
      team.paymentStatus === TPaymentStatus.PAYMENT_FAILED &&
      remainingDays <= 3 &&
      remainingDays >= 0
    ) {
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
    if (
      team.paymentStatus === TPaymentStatus.PAYMENT_FAILED &&
      threeDaysBeforeExpiration <= 3 &&
      threeDaysBeforeExpiration >= 0
    ) {
      toastHandler({
        id: ToastId.PLAN_EXPIRED_REMINDER,
        type: ToastType.WARNING,
        content: (
          <div className="flex items-center gap-32px">
            <p className="text-sm text-text-neutral-primary">
              <span className="font-semibold">
                {t('subscriptions:ERROR.TOAST_EXPIRED_REMINDER_TITLE')}
              </span>

              {threeDaysBeforeExpiration === 0 ? (
                <span className="font-normal">
                  {t('subscriptions:ERROR.TOAST_EXPIRED_REMINDER_MESSAGE_FOR_TODAY')}
                </span>
              ) : (
                <span className="font-normal">
                  {t('subscriptions:ERROR.TOAST_EXPIRED_REMINDER_MESSAGE_PREFIX') +
                    threeDaysBeforeExpiration +
                    t('subscriptions:ERROR.TOAST_EXPIRED_REMINDER_MESSAGE_SUFFIX')}
                </span>
              )}
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

  // Info: (20250117 - Liz) 如果打 API 還在載入中，顯示載入中頁面
  if (isLoading) {
    return (
      <Layout isDashboard={false} goBackUrl={ISUNFA_ROUTE.SUBSCRIPTIONS}>
        <div className="flex items-center justify-center">
          <SkeletonList count={6} />
        </div>
      </Layout>
    );
  }

  // Info: (20250113 - Liz) 如果 team 資料不存在，顯示錯誤頁面
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
        <BillingPageBody team={team} getOwnedTeam={getOwnedTeam} />
      </Layout>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, [
        'layout',
        'dashboard',
        'subscriptions',
        'filter_section_type',
        'date_picker',
        'common',
        'search',
      ])),
    },
  };
};

export default BillingPage;
