import Head from 'next/head';
import NavBar from '../../components/nav_bar/nav_bar';
import AccountingSidebar from '../../components/accounting_sidebar/accounting_sidebar';

const AccountingPage = () => {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: (20240416 - Julian) i18n */}
        <title>Accounting - iSunFA</title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          {/* Info: (20240416 - Julian) Sidebar */}
          <AccountingSidebar />
          {/* ToDo: (20240416 - Julian) Overview */}
          <div className="flex h-screen w-full"></div>
        </div>
      </div>
    </>
  );
};

export default AccountingPage;
