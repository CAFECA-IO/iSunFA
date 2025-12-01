import React, { useState } from 'react';
import Image from 'next/image';
import { FiSearch } from 'react-icons/fi';
import { RxCross2 } from 'react-icons/rx';
import { HiOutlineSparkles } from 'react-icons/hi';
import { IAccountBookInfo, WORK_TAG } from '@/interfaces/account_book';
import { Button } from '@/components/button/button';

interface IAccountBookUI extends IAccountBookInfo {
  isAISuggested: boolean;
}

const MOCK_ACCOUNT_BOOKS: IAccountBookUI[] = [
  {
    id: 1,
    name: 'Company A',
    imageId: '/images/fake_company_avatar.svg',
    teamId: 123,
    userId: 456,
    taxId: 'A123456789',
    tag: WORK_TAG.FINANCIAL,
    startDate: 1672531200,
    createdAt: 1672531200,
    updatedAt: 1672531200,
    representativeName: 'John Doe',
    taxSerialNumber: 'TSN123456',
    contactPerson: 'Jane Smith',
    phoneNumber: ' 123-456-7890',
    city: 'Taipei',
    district: 'Da’an',
    enteredAddress: 'No. 1, Sec. 1, Xinyi Rd.',
    isAISuggested: true,
  },
  {
    id: 2,
    name: 'Company B',
    imageId: '/images/fake_company_avatar.svg',
    teamId: 321,
    userId: 654,
    taxId: 'B987654321',
    tag: WORK_TAG.ALL,
    startDate: 1672531200,
    createdAt: 1672531200,
    updatedAt: 1672531200,
    representativeName: 'Jane Doe',
    taxSerialNumber: 'TSN654321',
    contactPerson: 'Eric Johnson',
    phoneNumber: '098-765-4321',
    city: 'Kaohsiung',
    district: 'Lingya',
    enteredAddress: 'No. 2, Sec. 2, Zhongshan Rd.',
    isAISuggested: false,
  },
  {
    id: 3,
    name: 'Company C',
    imageId: '/images/fake_company_avatar.svg',
    teamId: 111,
    userId: 222,
    taxId: 'C112233445',
    tag: WORK_TAG.TAX,
    startDate: 1672531200,
    createdAt: 1672531200,
    updatedAt: 1672531200,
    representativeName: 'Sam Smith',
    taxSerialNumber: 'TSN112233',
    contactPerson: 'David Lee',
    phoneNumber: '212-555-7890',
    city: 'Shanghai',
    district: 'Pudong',
    enteredAddress: 'No. 3, Sec. 3, Nanjing Rd.',
    isAISuggested: false,
  },
];

const AccountBookItem: React.FC<{
  item: IAccountBookInfo;
  isActive: boolean;
  selectAccountBook: (id: number) => void;
  isAISuggested: boolean;
  disabled?: boolean;
}> = ({ item, isActive, selectAccountBook, isAISuggested, disabled }) => {
  const { name, imageId } = item;

  const activeClass = isActive
    ? 'border-stroke-brand-primary-lv1 bg-surface-brand-primary-lv3'
    : 'border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 hover:bg-surface-brand-primary-30';

  const isShowAISuggested = isAISuggested && (
    <div className="flex items-center gap-8px">
      <HiOutlineSparkles size={24} />
      <p>AI Suggests</p>
    </div>
  );

  const clickHandler = () => {
    selectAccountBook(item.id);
  };

  return (
    <button
      type="button"
      onClick={clickHandler}
      disabled={disabled}
      className={`${activeClass} flex items-center gap-12px rounded-sm border py-12px pl-24px pr-12px font-medium text-text-neutral-primary enabled:hover:cursor-pointer disabled:cursor-not-allowed disabled:border-stroke-neutral-mute disabled:bg-surface-neutral-mute disabled:text-text-neutral-mute`}
    >
      <div className="flex w-220px items-center gap-24px">
        <div className="h-60px w-60px overflow-hidden rounded-sm border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2">
          <Image src={imageId} width={60} height={60} alt="Company Logo" />
        </div>
        <p>{name}</p>
      </div>
      {isShowAISuggested}
    </button>
  );
};

interface ISelectAccountBookModalProps {
  isModalOpen: boolean;
  onClose: () => void;
  importAccountBook: (accountBookId: string) => void;
}

const SelectAccountBookModal: React.FC<ISelectAccountBookModalProps> = ({
  isModalOpen,
  onClose,
  importAccountBook,
}) => {
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeAccountBookId, setActiveAccountBookId] = useState<number | null>(null);

  const submitDisabled = activeAccountBookId === null;

  // ToDo: (20251201 - Julian) implement search functionality
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const selectAccountBook = (id: number) => {
    if (activeAccountBookId === id) {
      setActiveAccountBookId(null); // Info: (20251201 - Julian) 取消選取
    } else {
      setActiveAccountBookId(id); // Info: (20251201 - Julian) 選取帳本
    }
  };

  const submitHandler = () => {
    if (activeAccountBookId !== null) {
      importAccountBook(activeAccountBookId.toString());
      onClose();
    }
  };

  const displayedAccountBooks = MOCK_ACCOUNT_BOOKS.map((book) => {
    const isActive = book.id === activeAccountBookId;

    return (
      <AccountBookItem
        key={book.id}
        item={book}
        isActive={isActive}
        selectAccountBook={selectAccountBook}
        isAISuggested={book.isAISuggested}
      />
    );
  });

  const isDisplayedModal = isModalOpen ? (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex flex-col gap-24px rounded-lg bg-surface-neutral-surface-lv2 p-40px">
        {/* Info: (20251201 - Julian) Header */}
        <div className="relative flex items-center">
          <h2 className="flex-1 text-center text-lg font-bold text-text-neutral-primary">
            Import to which account book?
          </h2>
          <button
            type="button"
            className="absolute right-0 p-10px text-button-text-secondary"
            onClick={onClose}
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Info: (20251201 - Julian) Search bar */}
        <div className="flex items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            className="flex-1 bg-transparent px-12px py-10px placeholder:text-input-text-input-placeholder"
            placeholder="Search"
          />
          <div className="px-12px py-10px text-icon-surface-single-color-primary">
            <FiSearch size={20} />
          </div>
        </div>

        {/* Info: (20251201 - Julian) Account book list */}
        <div className="flex h-400px flex-col gap-8px overflow-y-auto p-12px">
          {displayedAccountBooks}
        </div>

        {/* Info: (20251201 - Julian) Import buttons */}
        <Button type="button" variant="tertiary" disabled={submitDisabled} onClick={submitHandler}>
          Import
        </Button>
      </div>
    </div>
  ) : null;

  return isDisplayedModal;
};

export default SelectAccountBookModal;
