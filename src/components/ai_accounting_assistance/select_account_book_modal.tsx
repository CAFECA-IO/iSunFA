import React, { useState } from 'react';
import Image from 'next/image';
import { FiSearch } from 'react-icons/fi';
import { RxCross2 } from 'react-icons/rx';
import { HiOutlineSparkles } from 'react-icons/hi';
import { Button } from '@/components/button/button';

const AccountBookItem: React.FC = () => {
  const accountBookName = 'Company B';
  const imageUrl = '/images/fake_company_avatar.svg';

  return (
    <div className="flex items-center gap-12px rounded-sm border border-stroke-brand-primary-lv1 bg-surface-brand-primary-lv3 py-12px pl-24px pr-12px font-medium text-text-neutral-primary">
      <div className="flex w-220px items-center gap-24px">
        <div className="h-60px w-60px overflow-hidden rounded-sm border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2">
          <Image src={imageUrl} width={60} height={60} alt="Company Logo" />
        </div>
        <p>{accountBookName}</p>
      </div>
      <div className="flex items-center gap-8px">
        <HiOutlineSparkles size={24} />
        <p>AI Suggests</p>
      </div>
    </div>
  );
};

const SelectAccountBookModal: React.FC = () => {
  const [searchInput, setSearchInput] = useState<string>('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  return (
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
            // onClick={onClose}
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
          <AccountBookItem />
        </div>

        {/* Info: (20251201 - Julian) Import buttons */}
        <Button type="button" variant="tertiary">
          Import
        </Button>
      </div>
    </div>
  );
};

export default SelectAccountBookModal;
