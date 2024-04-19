import Head from 'next/head';
import { useState } from 'react';
import NavBar from '../../components/nav_bar/nav_bar';
import AccountingSidebar from '../../components/accounting_sidebar/accounting_sidebar';
import JournalListTab from '../../components/journal_list_tab/journal_list_tab';

const AccountingPage = () => {
  const [currentTab, setCurrentTab] = useState<'journal' | 'journal_list' | 'subpoena_list'>(
    'journal'
  );

  const journalTab = <div className="flex min-h-screen w-full flex-col p-10">Main Page</div>;

  const overview = currentTab === 'journal' ? journalTab : <JournalListTab />;

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
          <AccountingSidebar setCurrentTab={setCurrentTab} />
          {/* ToDo: (20240416 - Julian) Overview */}
          <div className="flex h-full w-full bg-gray-100">
            <div className="ml-80px mt-100px flex-1">{overview}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountingPage;
