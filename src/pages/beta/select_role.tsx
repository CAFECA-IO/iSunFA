import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import Introduction from '@/components/beta/select_role/introduction';
// import RoleCardContainer from '@/components/beta/select_role/role_card_container';
// ToDo: (20241004 - Liz) 還在實作角色卡片

const SelectRole = () => {
  const { t } = useTranslation(['common', 'kyc']);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('kyc:SELECT_ROLE.SELECT_ROLE_ISUNFA')}</title>
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

      <main className="flex h-screen flex-col justify-between overflow-x-hidden">
        <Introduction />

        <div className="mx-80px mb-40px flex gap-80px">
          <div className="relative flex h-120px w-360px skew-x-20 items-center rounded-sm border-4 border-orange-400 bg-yellow-200 text-text-neutral-primary transition-all duration-300 ease-in-out hover:border-yellow-400 hover:bg-yellow-300">
            <p className="-skew-x-20 pl-140px text-32px font-bold">Bookkeeper</p>

            <Image
              src={'/images/bookkeeper.png'}
              alt="bookkeeper"
              width={48}
              height={48}
              className="absolute -left-50px -top-30px w-160px -skew-x-20 rounded-full"
            ></Image>
          </div>

          <div className="relative flex h-120px w-360px skew-x-20 items-center rounded-sm border-4 border-orange-400 bg-yellow-200 text-text-neutral-primary transition-all duration-300 ease-in-out hover:border-yellow-400 hover:bg-yellow-300">
            <p className="-skew-x-20 pl-140px text-32px font-bold">Educational Trial Version</p>

            <Image
              src={'/images/educational_trial.png'}
              alt="educational_trial"
              width={48}
              height={48}
              className="absolute -left-50px -top-30px w-160px -skew-x-20 rounded-full"
            ></Image>
          </div>

          <div className="relative flex h-120px w-360px skew-x-20 items-center rounded-sm border-4 border-orange-400 bg-yellow-200 text-text-neutral-primary transition-all duration-300 ease-in-out hover:border-yellow-400 hover:bg-yellow-300">
            <p className="-skew-x-20 pl-140px text-32px font-bold">Accountant</p>

            <Image
              src={'/images/accountant.png'}
              alt="accountant"
              width={48}
              height={48}
              className="absolute -left-50px -top-30px w-160px -skew-x-20 rounded-full"
            ></Image>
          </div>
        </div>
      </main>
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

export default SelectRole;
