import Head from 'next/head';
import { FaChevronDown } from 'react-icons/fa';
import { useState } from 'react';
import useOuterClick from '../../lib/hooks/use_outer_click';
import NavBar from '../../components/nav_bar/nav_bar';
import AccountingSidebar from '../../components/accounting_sidebar/accounting_sidebar';

const AccountingPage = () => {
  const [currentTab, setCurrentTab] = useState<'journal' | 'journal_list' | 'subpoena_list'>(
    'journal'
  );

  const {
    targetRef: typeMenuRef,
    componentVisible: isTypeMenuOpen,
    setComponentVisible: setIsTypeMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const [selectedJournalType, setSelectedJournalType] = useState<string>('All');

  const toggleTypeMenu = () => setIsTypeMenuOpen(!isTypeMenuOpen);
  const displayedTypeMenu = isTypeMenuOpen ? (
    <ul
      ref={typeMenuRef}
      className="absolute left-0 top-50px flex w-full flex-col rounded-md border border-lightGray3 bg-white p-8px"
    >
      {['All', 'Payment', 'Receiving', 'Transfer'].map((type: string) => (
        <li
          key={type}
          onClick={() => {
            setSelectedJournalType(type);
            setIsTypeMenuOpen(false);
          }}
          className="cursor-pointer px-3 py-2 text-navyBlue2 hover:bg-lightGray6"
        >
          {type}
        </li>
      ))}
    </ul>
  ) : null;

  const journalTab = <div className="flex w-full flex-col p-10">Main Page</div>;

  const journalListTab = (
    <div className="flex w-full flex-col p-10">
      {/* Info: (20240417 - Julian) Title */}
      <h1 className="text-4xl font-semibold text-lightGray5">View My Journal List</h1>
      {/* Info: (20240417 - Julian) Divider */}
      <hr className="my-20px w-full border-lightGray6" />
      {/* Info: (20240417 - Julian) Filter */}
      <div className="flex items-center gap-24px text-sm">
        {/* Info: (20240417 - Julian) Type */}
        <div className="flex flex-col items-start gap-8px">
          <p className="font-semibold text-navyBlue2">Type</p>
          <div
            onClick={toggleTypeMenu}
            className="relative flex h-44px w-130px cursor-pointer items-center justify-between rounded-md border border-lightGray3 bg-white p-10px"
          >
            <p className="text-lightGray4">{selectedJournalType}</p>
            <FaChevronDown />

            {displayedTypeMenu}
          </div>
        </div>
      </div>
    </div>
  );

  const overview = currentTab === 'journal' ? journalTab : journalListTab;

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
          <div className="flex h-screen w-full bg-gray-100">
            <div className="ml-80px mt-100px flex-1">{overview}</div>
        </div>
      </div>
    </>
  );
};

export default AccountingPage;
