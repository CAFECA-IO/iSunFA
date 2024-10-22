import { useState } from 'react';
import Image from 'next/image';
import Pagination from '@/components/pagination/pagination';
import { TbSquarePlus2, TbCodeCircle } from 'react-icons/tb';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoArrowForward } from 'react-icons/io5';
import { RiCheckboxMultipleLine, RiCoinsFill } from 'react-icons/ri';
import { LuFileCheck } from 'react-icons/lu';
import { FiSearch } from 'react-icons/fi';

enum CompanyTypeTag {
  Financial = 'Financial',
  Tax = 'Tax',
  All = 'ALL',
}

const Empty = () => {
  return (
    <section className="flex flex-auto flex-col items-center justify-center gap-16px">
      <Image src={'/images/empty.svg'} alt="empty" width={120} height={134.787}></Image>

      <div className="text-center text-base font-medium text-text-neutral-mute">
        <p>No company data available.</p>
        <p>Please add a new company.</p>
      </div>
    </section>
  );
};

interface CompanyTypeTagProps {
  type: CompanyTypeTag;
}

const TypeTag = ({ type }: CompanyTypeTagProps) => {
  let backgroundColor = '';
  let textColor = '';
  let icon = null;

  switch (type) {
    case CompanyTypeTag.Financial:
      backgroundColor = 'bg-badge-surface-strong-secondary';
      textColor = 'text-badge-text-invert';
      icon = <RiCoinsFill size={16} />;
      break;

    case CompanyTypeTag.Tax:
      backgroundColor = 'bg-badge-surface-strong-primary';
      textColor = 'text-badge-text-invert';
      icon = <RiCheckboxMultipleLine size={16} />;
      break;

    case CompanyTypeTag.All:
      backgroundColor = 'bg-badge-surface-soft-secondary';
      textColor = 'text-badge-text-secondary-solid';
      icon = <LuFileCheck size={16} />;
      break;

    default:
      backgroundColor = 'bg-badge-surface-strong-secondary';
      textColor = 'text-badge-text-invert';
      icon = null;
      break;
  }

  return (
    <div
      className={`flex w-max items-center gap-1px rounded-full p-6px text-xs font-medium ${backgroundColor} ${textColor}`}
    >
      {icon}
      <p className="px-4px">{type}</p>
    </div>
  );
};

interface CompanyListProps {
  companyList: {
    id: number;
    name: string;
    type: CompanyTypeTag;
    logoSrc: string;
    alt: string;
  }[];
}

const CompanyList = ({ companyList }: CompanyListProps) => {
  return (
    <section className="flex flex-auto flex-col gap-8px">
      {companyList.map((company) => (
        <div
          key={company.id}
          className="flex items-center justify-between gap-120px rounded-xxs bg-surface-neutral-surface-lv2 px-24px py-8px shadow-Dropshadow_XS"
        >
          <Image
            src={company.logoSrc}
            alt={company.alt}
            width={60}
            height={60}
            className="flex-none rounded-sm bg-surface-neutral-surface-lv2 shadow-Dropshadow_XS"
          ></Image>

          <div className="flex flex-auto items-center gap-8px">
            <p className="text-base font-medium text-text-neutral-solid-dark">{company.name}</p>
            <BsThreeDotsVertical size={16} className="text-icon-surface-single-color-primary" />
          </div>

          <div className="flex w-90px justify-center">
            <TypeTag type={company.type} />
          </div>

          <button
            type="button"
            className="flex items-center gap-4px rounded-xs border border-button-stroke-primary bg-button-surface-soft-primary px-16px py-8px text-button-text-primary-solid hover:bg-button-surface-soft-primary-hover"
          >
            <p className="text-sm font-medium">Connect</p>
            <IoArrowForward size={16} />
          </button>
        </div>
      ))}
    </section>
  );
};

const MyCompanyListPageBody = () => {
  // ToDo: (20241022 - Liz) 這裡是假資料，之後會改成從 API 取得資料。
  const companyList = [
    {
      id: 1,
      name: 'Company A',
      type: CompanyTypeTag.Financial,
      logoSrc: '/images/fake_company_log_01.png',
      alt: 'fake_company_log_01',
    },
    {
      id: 2,
      name: 'Company B',
      type: CompanyTypeTag.Tax,
      logoSrc: '/images/fake_company_log_02.png',
      alt: 'fake_company_log_02',
    },
    {
      id: 3,
      name: 'Company C',
      type: CompanyTypeTag.All,
      logoSrc: '/images/fake_company_log_03.png',
      alt: 'fake_company_log_03',
    },
    {
      id: 4,
      name: 'Company Special Liz',
      type: CompanyTypeTag.Financial,
      logoSrc: '/images/fake_company_log_01.png',
      alt: 'fake_company_log_01',
    },
    {
      id: 5,
      name: 'Company Super Liz',
      type: CompanyTypeTag.Financial,
      logoSrc: '/images/fake_company_log_02.png',
      alt: 'fake_company_log_02',
    },
    {
      id: 6,
      name: 'Company Liz 6',
      type: CompanyTypeTag.Tax,
      logoSrc: '/images/fake_company_log_03.png',
      alt: 'fake_company_log_03',
    },
    {
      id: 7,
      name: 'Company Liz 7',
      type: CompanyTypeTag.Tax,
      logoSrc: '/images/fake_company_log_01.png',
      alt: 'fake_company_log_01',
    },
    {
      id: 8,
      name: 'Company Liz 8',
      type: CompanyTypeTag.Tax,
      logoSrc: '/images/fake_company_log_02.png',
      alt: 'fake_company_log_02',
    },
    {
      id: 9,
      name: 'Company Liz 9',
      type: CompanyTypeTag.Tax,
      logoSrc: '/images/fake_company_log_03.png',
      alt: 'fake_company_log_03',
    },
    {
      id: 10,
      name: 'Company Liz 10',
      type: CompanyTypeTag.Tax,
      logoSrc: '/images/fake_company_log_01.png',
      alt: 'fake_company_log_01',
    },
    {
      id: 11,
      name: 'Company Liz 11',
      type: CompanyTypeTag.Tax,
      logoSrc: '/images/fake_company_log_02.png',
      alt: 'fake_company_log_02',
    },
    {
      id: 12,
      name: 'Company Liz 12',
      type: CompanyTypeTag.Tax,
      logoSrc: '/images/fake_company_log_03.png',
      alt: 'fake_company_log_03',
    },
  ];

  const isDataEmpty = companyList.length === 0;

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState(companyList);

  const itemsPerPage = 5;
  const totalItems = filteredCompanies.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const slicedCompanyList = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Info: (20241022 - Liz) 管理搜尋欄位的值。當輸入值改變時，更新搜尋欄位的值。不執行搜尋。
  const handleSearchTerm = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);

    if (e.target.value === '') {
      setFilteredCompanies(companyList);
      setCurrentPage(1);
    }
  };

  // Info: (20241022 - Liz) 這是搜尋功能。按下按鈕，根據輸入值來搜尋公司名稱。
  const handleSearch = () => {
    const filtered = companyList.filter((company) => {
      return company.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
    setFilteredCompanies(filtered);
    setCurrentPage(1);
  };

  // 檢查是否按下 Enter 鍵
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <main className="flex h-full flex-col gap-40px">
      <section className="flex items-center gap-40px">
        {/* Search */}
        <div className="flex flex-auto items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
          <input
            type="text"
            placeholder="Search"
            className="grow rounded-l-sm bg-transparent px-12px py-10px outline-none"
            value={searchTerm}
            onChange={handleSearchTerm}
            onKeyDown={handleKeyDown}
          />

          <button type="button" onClick={handleSearch} className="px-12px py-10px">
            <FiSearch size={20} />
          </button>
        </div>

        <div className="flex items-center gap-16px">
          <button
            type="button"
            className="flex items-center gap-8px rounded-xs bg-button-surface-strong-secondary px-24px py-10px text-base font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            <TbSquarePlus2 size={20} />
            <p>Add New</p>
          </button>

          <button
            type="button"
            className="flex items-center gap-8px rounded-xs border border-button-stroke-secondary bg-button-surface-soft-secondary px-24px py-10px text-base font-medium text-button-text-secondary-solid hover:border-button-stroke-secondary-hover hover:bg-button-surface-soft-secondary-hover disabled:border-button-stroke-disable disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            <TbCodeCircle size={20} />
            <p>Code</p>
          </button>
        </div>
      </section>

      {isDataEmpty ? (
        <Empty />
      ) : (
        <>
          <CompanyList companyList={slicedCompanyList} />
          <Pagination
            totalCount={totalItems}
            totalPages={totalPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </>
      )}
    </main>
  );
};

export default MyCompanyListPageBody;
