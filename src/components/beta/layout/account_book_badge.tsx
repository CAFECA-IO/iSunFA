import Image from 'next/image';
import { useUserCtx } from '@/contexts/user_context';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';

const AccountBookBadge = () => {
  const { connectedAccountBook } = useUserCtx();

  return (
    <div>
      {connectedAccountBook ? (
        <Link
          href={ISUNFA_ROUTE.ACCOUNT_BOOKS_PAGE}
          className="flex w-80px items-center justify-center gap-1px rounded-md bg-badge-surface-soft-primary px-3px py-1px text-badge-text-primary-solid"
        >
          <Image
            src={connectedAccountBook.imageId}
            alt="company_avatar_in_header"
            width={14}
            height={14}
            className="h-14px w-14px rounded-full bg-surface-neutral-surface-lv2 object-contain"
          />
          <p className="truncate px-2.5px py-3px text-xs font-medium text-badge-text-primary-solid">
            {connectedAccountBook.name}
          </p>
        </Link>
      ) : null}
    </div>
  );
};

export default AccountBookBadge;
