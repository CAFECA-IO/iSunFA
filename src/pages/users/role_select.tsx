import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import I18n from '@/components/i18n/i18n';
import { FiHome, FiArrowRight } from 'react-icons/fi';
import { TbLogout } from 'react-icons/tb';
import { HiPlus } from 'react-icons/hi2';
import { RoleName } from '@/constants/role';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useUserCtx } from '@/contexts/user_context';

interface JobRecordCardProps {
  roleName: string;
  roleIconSrc: string;
  roleAltText: string;
  jobAvatarSrc: string;
  jonAltText: string;
  lastLoginTime: string;
}

const jobsRecords = [
  {
    jobId: 1,
    roleId: RoleName.BOOKKEEPER,
    roleName: 'Bookkeeper',
    roleIconSrc: '/icons/information_desk.svg',
    roleAltText: 'information_desk',
    jobAvatarSrc: '/images/fake_job_avatar_01.svg',
    jonAltText: 'fake_job_avatar_01',
    lastLoginTime: '2024/09/09 15:30:30',
  },
  {
    jobId: 2,
    roleId: RoleName.EDUCATIONAL_TRIAL_VERSION,
    roleName: 'Educational',
    roleIconSrc: '/icons/graduation_cap.svg',
    roleAltText: 'graduation_cap',
    jobAvatarSrc: '/images/fake_job_avatar_02.svg',
    jonAltText: 'fake_job_avatar_02',
    lastLoginTime: '2024/09/09 15:30:30',
  },
];

const JobRecordCard = ({
  roleName,
  roleIconSrc,
  roleAltText,
  jobAvatarSrc,
  jonAltText,
  lastLoginTime,
}: JobRecordCardProps) => {
  // ToDo: (20241009 - Liz) 選擇 Job 功能
  const handleStart = () => {
    // Deprecated: (20241009 - Liz)
    // eslint-disable-next-line no-console
    console.log('選擇這個 Job 來開始工作');
  };

  return (
    <div className="relative flex h-480px w-280px flex-col items-center justify-between rounded-lg bg-surface-neutral-surface-lv1 p-40px shadow-Dropshadow_S">
      <div className="absolute left-20px top-20px opacity-30">
        <Image src={roleIconSrc} alt={roleAltText} width={64} height={64} />
      </div>

      <h2 className="text-32px font-bold text-text-neutral-primary">{roleName}</h2>

      <Image
        src={jobAvatarSrc}
        alt={jonAltText}
        width={120}
        height={120}
        className="rounded-full"
      ></Image>

      <div className="space-y-16px text-center text-lg font-medium">
        <p className="text-text-neutral-secondary">Last Login Time</p>

        <p className="text-text-neutral-tertiary">{lastLoginTime}</p>
      </div>

      <button
        type="button"
        className="flex items-center gap-8px rounded-xs bg-button-surface-strong-primary px-32px py-14px text-lg font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        onClick={handleStart}
      >
        <p>Start</p>
        <FiArrowRight size={24} />
      </button>
    </div>
  );
};

const JobRecordPage = () => {
  const { t } = useTranslation(['common']);
  const { signOut } = useUserCtx();

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('common:CREATED_ROLES.CREATED_ROLES')}</title>
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

      <div className="relative h-screen">
        <div className="absolute inset-0 z-0 h-full w-full bg-login_bg bg-cover bg-center bg-no-repeat blur-md"></div>

        <div className="absolute right-0 top-0 z-0 mr-40px mt-40px flex items-center gap-40px text-button-text-secondary">
          <I18n />

          {/* // ToDo: (20241009 - Liz) 回到主頁功能 */}
          <FiHome size={20} />
        </div>

        <button
          type="button"
          onClick={signOut}
          className="absolute left-0 top-0 z-0 ml-40px mt-40px flex items-center gap-25px text-button-text-secondary"
        >
          <TbLogout size={32} />
          <p className="font-semibold">Log out</p>
        </button>

        {/* // Info: (20241009 - Liz) Job Record Cards */}
        <section className="flex items-center justify-center gap-40px pt-120px">
          {jobsRecords.map((jobRecord) => (
            <JobRecordCard
              key={jobRecord.jobId}
              roleName={jobRecord.roleName}
              roleIconSrc={jobRecord.roleIconSrc}
              roleAltText={jobRecord.roleAltText}
              jobAvatarSrc={jobRecord.jobAvatarSrc}
              jonAltText={jobRecord.jonAltText}
              lastLoginTime={jobRecord.lastLoginTime}
            />
          ))}

          <Link
            href={ISUNFA_ROUTE.CREATE_ROLE}
            className="z-1 rounded-lg bg-surface-neutral-surface-lv1 p-18px text-text-neutral-secondary shadow-Dropshadow_S"
          >
            <HiPlus size={64} />
          </Link>
        </section>
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

export default JobRecordPage;
