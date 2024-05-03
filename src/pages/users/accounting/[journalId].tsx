import Head from 'next/head';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { PiCopySimpleBold } from 'react-icons/pi';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import NavBar from '../../../components/nav_bar/nav_bar';
import AccountingSidebar from '../../../components/accounting_sidebar/accounting_sidebar';
import { ISUNFA_ROUTE } from '../../../constants/url';

interface IJournalDetailPageProps {
  journalId: string;
}

const JournalDetailPage = ({ journalId }: IJournalDetailPageProps) => {
  // ToDo: (20240503 - Julian) Get real data from API
  const tokenContract = '0x00000000219ab540356cBB839Cbe05303d7705Fa';
  const tokenId = '37002036';

  const copyTokenContractHandler = () => {
    navigator.clipboard.writeText(tokenContract);
  };

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: (20240503 - Julian) i18n */}
        <title>Journal {journalId} - iSunFA</title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          {/* Info: (20240503 - Julian) Sidebar */}
          <AccountingSidebar />
          {/* ToDo: (20240503 - Julian) Overview */}
          <div className="flex h-full w-full bg-gray-100">
            <div className="mt-100px flex-1 md:ml-80px">
              <div className="flex min-h-screen w-full flex-col px-16px pb-80px pt-32px md:p-40px">
                {/* Info: (20240503 - Julian) Title */}
                <div className="flex h-45px items-center gap-24px">
                  <Link
                    href={ISUNFA_ROUTE.JOURNAL_LIST}
                    className="rounded border border-navyBlue p-12px text-navyBlue hover:border-primaryYellow hover:text-primaryYellow"
                  >
                    <FaArrowLeft />
                  </Link>
                  <h1 className="text-base font-semibold text-lightGray5 md:text-4xl">
                    View Journal-{journalId}
                  </h1>
                </div>
                {/* Info: (20240503 - Julian) Divider */}
                <hr className="my-20px w-full border-lightGray6" />
                {/* Info: (20240503 - Julian) Journal detail */}
                <div className="flex flex-col py-10px">
                  <div className="flex items-center gap-80px">
                    {/* Info: (20240503 - Julian) Token Contract */}
                    <div className="flex items-center text-base text-lightGray4">
                      <p>Token Contract</p>
                      <p className="ml-20px text-darkBlue">{tokenContract}</p>
                      <button
                        type="button"
                        onClick={copyTokenContractHandler}
                        className="p-10px text-secondaryBlue"
                      >
                        <PiCopySimpleBold size={16} />
                      </button>
                    </div>
                    {/* Info: (20240503 - Julian) Token ID */}
                    <div className="flex items-center text-base text-lightGray4">
                      <p>Token ID</p>
                      <p className="ml-20px text-darkBlue">{tokenId}</p>
                      <button
                        type="button"
                        onClick={copyTokenContractHandler}
                        className="p-10px text-secondaryBlue"
                      >
                        <PiCopySimpleBold size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-40px flex">
                    <div className="flex flex-col gap-y-30px">
                      <div className="h-300px w-236px bg-slate-400">I am Certificate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.journalId || typeof params.journalId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      journalId: params.journalId,
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};

export default JournalDetailPage;
