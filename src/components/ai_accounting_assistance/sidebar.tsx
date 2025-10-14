import React from 'react';
import { FiLayout } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/button/button';
import { ISUNFA_ROUTE } from '@/constants/url';

interface ISidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const AAASidebar: React.FC<ISidebarProps> = ({ isOpen, toggleSidebar }) => {
  return (
    <div
      className={`${isOpen ? 'w-250px px-16px' : 'w-70px px-12px'} fixed flex h-screen flex-col gap-32px bg-surface-neutral-surface-lv1 py-16px transition-all duration-200 ease-in-out`}
    >
      {/* Info: (20251014 - Julian) Header */}
      <div className="flex items-center gap-8px">
        {isOpen && (
          <Link href={ISUNFA_ROUTE.DASHBOARD} className="flex flex-1 items-center gap-8px">
            <Image src="/logo/isunfa_logo_new_icon.svg" width={28} height={28} alt="iSunFA_logo" />
            <p className="font-semibold text-text-brand-primary-lv2">FinPilot</p>
          </Link>
        )}
        <Button
          type="button"
          variant="secondaryBorderless"
          size="defaultSquare"
          onClick={toggleSidebar}
        >
          <FiLayout size={24} />
        </Button>
      </div>

      {/* Info: (20251014 - Julian) Menu Content */}
      {isOpen && (
        <div className="flex flex-1 flex-col items-stretch gap-32px">
          {/* Info: (20251014 - Julian) Login button */}
          <Link href={ISUNFA_ROUTE.LOGIN}>
            <Button type="button" className="w-full">
              Log in
            </Button>
          </Link>

          {/* Info: (20251014 - Julian) Invoice List */}
          <p className="text-sm font-semibold uppercase text-text-neutral-tertiary">Invoice List</p>
          <div className="flex flex-col items-center">
            <p className="text-center text-sm font-medium text-text-neutral-tertiary">
              No Certificate found Please upload the certificate
            </p>
          </div>
        </div>
      )}

      {/* Info: (20251014 - Julian) Footer */}
      {isOpen && (
        <div className="flex flex-col items-center gap-8px">
          <p className="text-xs font-normal text-text-neutral-tertiary">iSunFA 2024 Beta V1.0.0</p>
          <p className="text-sm font-semibold text-link-text-primary">Support</p>
          <div className="flex items-center gap-8px">
            <p className="text-sm font-semibold text-link-text-primary">Private Policy</p>
            <hr className="h-full w-px border border-stroke-neutral-quaternary" />
            <p className="text-sm font-semibold text-link-text-primary">Service Term</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AAASidebar;
