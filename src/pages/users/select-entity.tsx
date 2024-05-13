import Head from 'next/head';
import SelectEntityPageBody from '@/components/select_entity_page_body/select_entity_page_body';
import NavBar from '../../components/nav_bar/nav_bar';

const SelectEntityPage = () => {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: i18n (20240409 - Shirley) */}
        <title>Select Company - iSunFA</title>
        <meta
          name="description"
          content="iSunFA: BOLT AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
        <meta name="author" content="CAFECA" />
        <meta name="keywords" content="區塊鏈,人工智慧,會計" />

        <meta property="og:title" content="iSunFA" />
        <meta
          property="og:description"
          content="iSunFA: BOLT AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
      </Head>

      <div className="h-screen bg-white">
        <div className="">
          <NavBar />
        </div>
        <div className="bg-surface-neutral-main-background pt-16">
          <SelectEntityPageBody />
        </div>
      </div>
    </>
  );
};

export default SelectEntityPage;
