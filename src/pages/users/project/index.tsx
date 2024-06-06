import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import NavBar from '@/components/nav_bar/nav_bar';
import { Button } from '@/components/button/button';
import { FiPlusCircle } from 'react-icons/fi';
import ProjectList from '@/components/project_list/project_list';

const ProjectMainPage = () => {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: (2024606 - Julian) i18n */}
        <title>Project List - iSunFA</title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          {/* Info: (2024606 - Julian) Main */}
          <div className="flex min-h-screen w-full bg-gray-100">
            <div className="mx-120px mt-120px flex flex-1 flex-col gap-y-24px">
              {/* Info: (2024606 - Julian) Title */}
              <div className="flex items-center justify-between">
                <h1 className="text-4xl font-semibold text-text-neutral-secondary">Project</h1>
                <Button
                  type="button"
                  variant="tertiary"
                  className="flex items-center gap-4px px-4 py-8px"
                >
                  <FiPlusCircle size={24} />
                  Add Project
                </Button>
              </div>
              {/* Info: (2024606 - Julian) Divider */}
              <hr className="border-divider-stroke-lv-4" />
              {/* Info: (2024606 - Julian) Project List */}
              <ProjectList />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default ProjectMainPage;
