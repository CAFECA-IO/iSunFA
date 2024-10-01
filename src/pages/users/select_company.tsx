import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useModalContext } from '@/contexts/modal_context';
import SelectCompanyPageBody from '@/components/select_company_page_body/select_company_page_body';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ToastId } from '@/constants/toast_id';
import NavBar from '@/components/nav_bar/nav_bar';
import { ILocale } from '@/interfaces/locale';
import { useUserCtx } from '@/contexts/user_context';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import LoginAnimation from '@/components/login/login_animation';

const SelectCompanyPage = () => {
  const { t } = useTranslation(['common', 'kyc']);
  const { isAuthLoading } = useUserCtx();
  const { eliminateToast } = useModalContext();
  const [isAnimationShowing, setIsAnimationShowing] = useState(true);
  // Info: (20241001 - Liz) 先預設都要顯示動畫，之後會依照是否有建立過「角色」來判斷是否要顯示動畫

  useEffect(() => {
    // Info: (20240513 - Julian) 回到選擇公司頁面時，要把提醒試用版的 Toast 關掉
    eliminateToast(ToastId.TRIAL);
  }, []);

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <div className="bg-surface-neutral-main-background pt-16">
      {isAnimationShowing ? (
        <LoginAnimation setIsAnimationShowing={setIsAnimationShowing} />
      ) : (
        <SelectCompanyPageBody />
      )}
    </div>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('kyc:SELECT_COMPANY.SELECT_COMPANY_ISUNFA')}</title>
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

      <div className="h-screen bg-white">
        <div className="">
          <NavBar />
        </div>
        {displayedBody}
      </div>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, [
        'common',
        'report_401',
        'journal',
        'kyc',
        'project',
        'setting',
        'terms',
        'salary',
        'asset',
      ])),
    },
  };
};

export default SelectCompanyPage;
