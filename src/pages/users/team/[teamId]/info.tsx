import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Layout from '@/components/beta/layout/layout';
import { ISUNFA_ROUTE } from '@/constants/url';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { ITeam } from '@/interfaces/team';
import TeamInformationPageBody from '@/components/beta/team_information_page/team_info_page_body';
import loggerFront from '@/lib/utils/logger_front';

const TeamInfoPage = () => {
  const { t } = useTranslation(['team']);
  const hasFetched = useRef(false); // Info:(20250226 - Anna) 使用 useRef 避免 API 被執行兩次

  const router = useRouter();
  const { teamId } = router.query;

  const [team, setTeam] = useState<ITeam | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Info: (20250226 - Anna) 取得團隊 Info API
  const { trigger: getTeamInfoByTeamIdAPI } = APIHandler<ITeam>(APIName.GET_TEAM_BY_ID);

  // Info: (20250226 - Anna) 打 API 取得團隊 Info
  const getTeamInfoByTeamId = useCallback(async () => {
    setIsLoading(true);
    if (!teamId || hasFetched.current) return; // Info:(20250226 - Anna) 確保 API 只打一次
    hasFetched.current = true; // Info:(20250226 - Anna) 標記已執行過 API

    try {
      const { data: teamInfoData, success } = await getTeamInfoByTeamIdAPI({
        params: { teamId },
      });
      if (success && teamInfoData) {
        setTeam(teamInfoData);
      }
      setIsLoading(false);
    } catch (error) {
      loggerFront.error('取得團隊資訊失敗');
    }
  }, []);

  useEffect(() => {
    getTeamInfoByTeamId(); // Info: (20250226 - Anna) 在 useEffect 中調用 API
  }, [teamId]);

  // ToDo: (20250218 - Liz) 如果打 API 還在載入中，顯示載入中頁面
  if (isLoading) {
    return (
      <Layout isDashboard={false} goBackUrl={ISUNFA_ROUTE.MY_ACCOUNT_PAGE}>
        <div className="flex items-center justify-center">
          <SkeletonList count={6} />
        </div>
      </Layout>
    );
  }

  // ToDo: (20250218 - Liz) 如果 team 資料不存在，顯示錯誤頁面
  // Info: (20250327 - Tzuhan) 已經移除 FAKE_TEAM_LISTs
  if (!team) {
    return (
      <Layout
        isDashboard={false}
        pageTitle={t('team:ERROR.TEAM_DATA_NOT_FOUND')}
        goBackUrl={ISUNFA_ROUTE.MY_ACCOUNT_PAGE}
      >
        <h1 className="text-red-500">{t('team:ERROR.TEAM_DATA_NOT_FOUND')}</h1>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('team:TEAM_PAGE.META_TITLE')}</title>
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
        pageTitle={team.name.value}
        goBackUrl={ISUNFA_ROUTE.MY_ACCOUNT_PAGE}
      >
        <TeamInformationPageBody team={team} setTeam={setTeam} />
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
        'team',
        'account_book',
      ])),
    },
  };
};

export default TeamInfoPage;
