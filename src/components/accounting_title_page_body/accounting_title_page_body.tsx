import Image from 'next/image';
import { useState } from 'react';
import { FaChevronDown, FaRegSquarePlus } from 'react-icons/fa6';
import { FiSearch } from 'react-icons/fi';
import { FaRegStar, FaStar } from 'react-icons/fa';
import useOuterClick from '@/lib/hooks/use_outer_click';
import Pagination from '@/components/pagination/pagination';

// ToDo: (20240717 - Julian) to be removed
const dummyAccountingTitleData = [
  {
    id: '1',
    code: '1517',
    name: 'Consolidated financial assets',
    accountingType: 'Assets',
    assetType: 'Current assets',
    currentAssetType: 'Consolidated financial assets',
    favorite: false,
  },
  {
    id: '2',
    code: '1550',
    name: 'Equity-method investments',
    accountingType: 'Assets',
    assetType: 'Current assets',
    currentAssetType: 'Consolidated financial assets',
    favorite: false,
  },
  {
    id: '3',
    code: '1660',
    name: 'Real estate, property and equipment',
    accountingType: 'Assets',
    assetType: 'Current assets',
    currentAssetType: 'Consolidated financial assets',
    favorite: false,
  },
  {
    id: '4',
    code: '1755',
    name: 'Royalty assets',
    accountingType: 'Assets',
    assetType: 'Current assets',
    currentAssetType: 'Consolidated financial assets',
    favorite: false,
  },
  {
    id: '5',
    code: '1780',
    name: 'Intangible assets',
    accountingType: 'Assets',
    assetType: 'Current assets',
    currentAssetType: 'Consolidated financial assets',
    favorite: false,
  },
  {
    id: '6',
    code: '1840',
    name: 'Deferred tax assets',
    accountingType: 'Assets',
    assetType: 'Current assets',
    currentAssetType: 'Consolidated financial assets',
    favorite: false,
  },
];

// ToDo: (20240717 - Julian) 討論與 IAccount 的關聯性
interface IAccountingTitleRowProps {
  code: string;
  name: string;
  favorite: boolean;
}

const AccountingRowDesktop = ({ code, name, favorite }: IAccountingTitleRowProps) => {
  const [isFavorite, setIsFavorite] = useState(favorite);

  // ToDo: (20240717 - Julian) call API to update favorite status
  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const displayStar = isFavorite ? (
    <FaStar className="text-icon-surface-single-color-primary group-hover:text-input-text-highlight" />
  ) : (
    <FaRegStar className="text-icon-surface-single-color-primary group-hover:text-input-text-highlight" />
  );

  return (
    <div className="table-row">
      <div className="table-cell py-12px">{code}</div>
      <div className="table-cell py-12px">{name}</div>
      <div className="table-cell py-12px">
        <div className="flex items-center justify-center gap-x-8px px-4px text-sm font-normal">
          {/* Info: (20240717 - Julian) Favorite button */}
          <button
            type="button"
            className="group flex items-center gap-4px"
            onClick={handleFavorite}
          >
            {displayStar}
            <p className="text-checkbox-text-secondary group-hover:text-input-text-highlight">
              Favorite
            </p>
          </button>
          {/* Info: (20240717 - Julian) Add New Sub button */}
          <button
            type="button"
            className="group flex items-center gap-4px text-checkbox-text-secondary"
          >
            <FaRegSquarePlus className="text-icon-surface-single-color-primary group-hover:text-input-text-highlight" />
            <p className="text-checkbox-text-secondary group-hover:text-input-text-highlight">
              Add New Sub
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

const AccountingRowMobile = ({ code, name, favorite }: IAccountingTitleRowProps) => {
  const [isFavorite, setIsFavorite] = useState(favorite);

  // ToDo: (20240717 - Julian) call API to update favorite status
  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const codeAndName = `${code} - ${name}`;

  const displayStar = isFavorite ? <FaStar /> : <FaRegStar />;

  return (
    <div className="table-row">
      <div className="table-cell px-8px py-12px">
        <div className="flex w-full">
          <p className="w-100px grow space-x-2 overflow-hidden text-ellipsis whitespace-nowrap">
            {codeAndName}
          </p>
        </div>
      </div>
      <div className="table-cell py-12px">
        <div className="flex items-center justify-center gap-x-8px px-4px text-sm font-normal">
          {/* Info: (20240717 - Julian) Favorite button */}
          <button
            type="button"
            className="flex items-center gap-4px text-icon-surface-single-color-primary hover:text-input-text-highlight"
            onClick={handleFavorite}
          >
            {displayStar}
          </button>
          {/* Info: (20240717 - Julian) Add New Sub button */}
          <button
            type="button"
            className="flex items-center gap-4px text-icon-surface-single-color-primary hover:text-input-text-highlight"
          >
            <FaRegSquarePlus className="" />
          </button>
        </div>
      </div>
    </div>
  );
};

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

  // Info: (20240717 - Julian) ----------- Table Body (Desktop) -----------
  const accountingTableBodyDesktop = dummyAccountingTitleData.map((account) => (
    <AccountingRowDesktop
      key={account.id}
      code={account.code}
      name={account.name}
      favorite={account.favorite}
    />
  ));

  const accountingTableDesktop = (
    <div className="mt-40px hidden w-full border-separate border-spacing-x-8px text-center font-semibold lg:table">
      {/* Info: (20240717 - Julian) Table Header */}
      <div className="table-header-group bg-stroke-brand-secondary-moderate text-lg text-text-neutral-invert">
        <div className="table-row">
          <div className="table-cell w-1/10 py-12px">Code</div>
          <div className="table-cell w-6/10 py-12px">Name</div>
          <div className="table-cell w-3/10 py-12px">Operations</div>
        </div>
      </div>
      {/* Info: (20240717 - Julian) Table Body */}
      <div className="table-row-group bg-surface-neutral-surface-lv2 text-sm text-text-neutral-primary">
        {accountingTableBodyDesktop}
      </div>
    </div>
  );

  // Info: (20240717 - Julian) ----------- Table Body (Mobile) -----------
  const accountingTableBodyMobile = dummyAccountingTitleData.map((account) => (
    <AccountingRowMobile
      key={account.id}
      code={account.code}
      name={account.name}
      favorite={account.favorite}
    />
  ));

  const accountingTableMobile = (
    <div className="mt-40px table w-full border-separate border-spacing-x-8px text-center font-semibold lg:hidden">
      {/* Info: (20240717 - Julian) Table Header */}
      <div className="table-header-group bg-stroke-brand-secondary-moderate text-base text-text-neutral-invert">
        <div className="table-row">
          <div className="table-cell py-12px">Code & Name</div>
          <div className="table-cell py-12px">Action</div>
        </div>
      </div>
      {/* Info: (20240717 - Julian) Table Body */}
      <div className="table-row-group bg-surface-neutral-surface-lv2 text-sm text-text-neutral-primary">
        {accountingTableBodyMobile}
      </div>
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
      {/* Info: (20240717 - Julian) Divider */}
      <div className="my-40px flex items-center gap-4 lg:my-5">
        <div className="flex items-center gap-2 text-sm font-medium text-divider-text-lv-1">
          <Image src="/icons/accounting.svg" width={16} height={16} alt="accounting_icon" />
          <p>Accounting Title</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-3" />
      </div>
      {/* Info: (20240717 - Julian) Search bar */}
      <div className="flex w-full items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px placeholder:text-input-text-input-placeholder lg:mt-40px">
        <input
          type="text"
          placeholder="Search"
          className="flex-1 bg-transparent text-input-text-input-filled outline-none"
        />
        <FiSearch size={20} />
      </div>
      {/* Info: (20240717 - Julian) Table */}
      {accountingTableDesktop}
      {accountingTableMobile}
      <div className="mx-auto mt-32px">
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
