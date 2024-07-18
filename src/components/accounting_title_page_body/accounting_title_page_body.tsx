import Image from 'next/image';
import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import { FiSearch } from 'react-icons/fi';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { dummyAccountingTitleData } from '@/interfaces/accounting_account';
import Pagination from '@/components/pagination/pagination';
import AccountingTitleTable, {
  ActionType,
} from '@/components/accounting_title_table/accounting_title_table';

enum AssetOptions {
  ALL = 'All',
  CURRENT_ASSETS = 'Current Assets',
  NON_CURRENT_ASSETS = 'Non-Current Assets',
}

enum LiabilityOptions {
  ALL = 'All',
}

enum EquityOptions {
  ALL = 'All',
}

const AccountingTitlePageBody = () => {
  const [selectedAsset, setSelectedAsset] = useState(AssetOptions.ALL);
  const [selectedLiability, setSelectedLiability] = useState(LiabilityOptions.ALL);
  const [selectedEquity, setSelectedEquity] = useState(EquityOptions.ALL);

  const [currentPage, setCurrentPage] = useState(1);
  const totalPage = Math.ceil(dummyAccountingTitleData.length / 10);

  const {
    targetRef: assetRef,
    componentVisible: assetVisible,
    setComponentVisible: setAssetVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: liabilityRef,
    componentVisible: liabilityVisible,
    setComponentVisible: setLiabilityVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: equityRef,
    componentVisible: equityVisible,
    setComponentVisible: setEquityVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const assetDropmenuToggleHandler = () => setAssetVisible(!assetVisible);
  const liabilityDropmenuToggleHandler = () => setLiabilityVisible(!liabilityVisible);
  const equityDropmenuToggleHandler = () => setEquityVisible(!equityVisible);

  const favoriteAccountingTitleData = dummyAccountingTitleData.filter(
    (account) => account.isFavorite
  );

  const assetDropmenu = (
    <div
      ref={assetRef}
      className={`absolute left-0 top-12 z-10 grid w-full rounded-sm border border-input-stroke-input
      ${
        assetVisible
          ? 'grid-rows-1 border-dropdown-stroke-menu bg-input-surface-input-background shadow-dropmenu'
          : 'grid-rows-0 border-transparent'
      } overflow-hidden transition-all duration-300 ease-in-out`}
    >
      <ul className={`flex w-full flex-col items-start p-2`}>
        {Object.values(AssetOptions).map((asset) => (
          <li
            key={asset}
            onClick={() => setSelectedAsset(asset)}
            className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
          >
            {asset}
          </li>
        ))}
      </ul>
    </div>
  );

  const liabilityOptions = (
    <div
      ref={liabilityRef}
      className={`absolute left-0 top-12 z-10 grid w-full rounded-sm border border-input-stroke-input
    ${
      liabilityVisible
        ? 'grid-rows-1 border-dropdown-stroke-menu bg-input-surface-input-background shadow-dropmenu'
        : 'grid-rows-0 border-transparent'
    } overflow-hidden transition-all duration-300 ease-in-out`}
    >
      <ul className={`flex w-full flex-col items-start p-2`}>
        {Object.values(LiabilityOptions).map((liability) => (
          <li
            key={liability}
            onClick={() => setSelectedLiability(liability)}
            className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
          >
            {liability}
          </li>
        ))}
      </ul>
    </div>
  );

  const equityOptions = (
    <div
      ref={equityRef}
      className={`absolute left-0 top-12 z-10 grid w-full rounded-sm border border-input-stroke-input
  ${
    equityVisible
      ? 'grid-rows-1 border-dropdown-stroke-menu bg-input-surface-input-background shadow-dropmenu'
      : 'grid-rows-0 border-transparent'
  } overflow-hidden transition-all duration-300 ease-in-out`}
    >
      <ul className={`flex w-full flex-col items-start p-2`}>
        {Object.values(EquityOptions).map((equity) => (
          <li
            key={equity}
            onClick={() => setSelectedEquity(equity)}
            className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
          >
            {equity}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* Info: (20240717 - Julian) Title */}
      <div className="text-base font-semibold text-text-neutral-secondary lg:text-36px">
        <h1>Accounting Title Management</h1>
      </div>
      <hr className="my-16px border-divider-stroke-lv-4" />
      {/* Info: (20240717 - Julian) Filter */}
      <div className="mt-40px flex flex-col items-center gap-x-20px gap-y-8px lg:mt-0 lg:flex-row">
        {/* Info: (20240717 - Julian) Assets */}
        <div className="flex w-full flex-col gap-8px lg:w-200px">
          <p className="font-semibold text-input-text-primary">Assets</p>
          <div
            onClick={assetDropmenuToggleHandler}
            className={`relative flex items-center justify-between rounded-sm border bg-input-surface-input-background
                ${assetVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'}
            px-12px py-10px hover:cursor-pointer`}
          >
            <p className="text-input-text-input-placeholder">{selectedAsset}</p>
            <FaChevronDown />
            {assetDropmenu}
          </div>
        </div>
        {/* Info: (20240717 - Julian) Liability */}
        <div className="flex w-full flex-col gap-8px lg:w-200px">
          <p className="font-semibold text-input-text-primary">Liability</p>
          <div
            onClick={liabilityDropmenuToggleHandler}
            className={`relative flex items-center justify-between rounded-sm border bg-input-surface-input-background
                ${liabilityVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'}
            px-12px py-10px hover:cursor-pointer`}
          >
            <p className="text-input-text-input-placeholder">{selectedLiability}</p>
            <FaChevronDown />
            {liabilityOptions}
          </div>
        </div>
        {/* Info: (20240717 - Julian) Equity */}
        <div className="flex w-full flex-col gap-8px lg:w-200px">
          <p className="font-semibold text-input-text-primary">Equity</p>
          <div
            onClick={equityDropmenuToggleHandler}
            className={`relative flex items-center justify-between rounded-sm border bg-input-surface-input-background
                ${equityVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'}
            px-12px py-10px hover:cursor-pointer`}
          >
            <p className="text-input-text-input-placeholder">{selectedEquity}</p>
            <FaChevronDown />
            {equityOptions}
          </div>
        </div>
      </div>
      {/* Info: (20240717 - Julian) Search bar */}
      <div className="mt-20px flex w-full items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px placeholder:text-input-text-input-placeholder lg:mt-20px">
        <input
          type="text"
          placeholder="Search"
          className="flex-1 bg-transparent text-input-text-input-filled outline-none"
        />
        <FiSearch size={20} />
      </div>
      {/* Info: (20240717 - Julian) Favorite Accounting Title Divider */}
      <div className="my-40px flex items-center gap-4 lg:my-5">
        <div className="flex items-center gap-2 text-sm font-medium text-divider-text-lv-1">
          <Image src="/icons/favorite.svg" width={16} height={16} alt="favorite_icon" />
          <p>Favorite Accounting Title</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-3" />
      </div>
      {/* Info: (20240717 - Julian) Favorite Accounting Table */}
      <AccountingTitleTable
        accountingTitleData={favoriteAccountingTitleData}
        actionType={ActionType.FAV_AND_ADD}
      />
      {/* Info: (20240717 - Julian) My new accounting title Divider */}
      <div className="my-40px flex items-center gap-4 lg:my-5">
        <div className="flex items-center gap-2 text-sm font-medium text-divider-text-lv-1">
          <Image src="/icons/user.svg" width={16} height={16} alt="user_icon" />
          <p>My new accounting title</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-3" />
      </div>
      {/* Info: (20240717 - Julian) My new accounting title Table */}
      <AccountingTitleTable
        accountingTitleData={dummyAccountingTitleData.slice(0, 3)}
        actionType={ActionType.EDIT_AND_REMOVE}
      />
      {/* Info: (20240717 - Julian) Accounting Title Divider */}
      <div className="my-40px flex items-center gap-4 lg:my-5">
        <div className="flex items-center gap-2 text-sm font-medium text-divider-text-lv-1">
          <Image src="/icons/accounting.svg" width={16} height={16} alt="accounting_icon" />
          <p>Accounting Title</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-3" />
      </div>
      {/* Info: (20240717 - Julian) All Accounting Table */}
      <div className="flex flex-col items-center gap-y-32px">
        <AccountingTitleTable
          accountingTitleData={dummyAccountingTitleData}
          actionType={ActionType.FAV_AND_ADD}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default AccountingTitlePageBody;
