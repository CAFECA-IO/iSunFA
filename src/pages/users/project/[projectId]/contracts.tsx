import Head from 'next/head';
import { FaArrowLeft } from 'react-icons/fa';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import NavBar from '@/components/nav_bar/nav_bar';
import { GetServerSideProps } from 'next';
import ProjectSidebar from '@/components/project_sidebar/project_sidebar';
import { Button } from '@/components/button/button';
import { FiPlus } from 'react-icons/fi';
import ProjectContractsPageBody from '@/components/project_contracts_page_body/project_contracts_page_body';

interface IProjectContractPageProps {
  projectId: string;
}

const ProjectContractsPage = ({ projectId }: IProjectContractPageProps) => {
  // ToDo: (20240618 - Julian) replace with actual data
  const projectName = 'BAIFA';

  const backClickHandler = () => window.history.back();

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: (2024606 - Julian) i18n */}
        <title>Project Contract - iSunFA</title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          <ProjectSidebar projectId={projectId} />
          <div className="flex min-h-screen bg-gray-100">
            <div className="mt-120px flex-1 md:ml-80px">
              <div className="flex flex-col px-60px">
                <div className="flex w-full items-center justify-between">
                  {/* Info: (2024618 - Julian) Title */}
                  <div className="flex items-center gap-24px">
                    <button
                      type="button"
                      onClick={backClickHandler}
                      className="rounded border border-navyBlue p-12px text-navyBlue hover:border-primaryYellow hover:text-primaryYellow"
                    >
                      <FaArrowLeft />
                    </button>

                    <h1 className="text-base font-semibold text-text-neutral-secondary md:text-4xl">
                      {projectName} - Contracts
                    </h1>
                  </div>
                  {/* Info: (20240618 - Julian) stage selection (desktop) */}
                  <Button type="button" variant="tertiary">
                    <FiPlus size={24} />
                    <p>Add new contract</p>
                  </Button>
                </div>
                {/* Info: (20240618 - Julian) Divider */}
                <hr className="my-24px border border-divider-stroke-lv-4" />
                {/* Info: (2024606 - Julian) Content */}
                <ProjectContractsPageBody />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.projectId || typeof params.projectId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      projectId: params.projectId,
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};

export default ProjectContractsPage;
