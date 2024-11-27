import Image from 'next/image';
import { useUserCtx } from '@/contexts/user_context';

const CompanyBadge = () => {
  const { selectedCompany } = useUserCtx();

  return (
    <div>
      {selectedCompany ? (
        <div className="flex items-center justify-center gap-1px rounded-md bg-badge-surface-soft-primary px-3px py-4px text-badge-text-primary-solid">
          <Image
            src={selectedCompany.imageId}
            alt="company_avatar_in_header"
            width={14}
            height={14}
          ></Image>
          <p className="px-2.5px text-xs font-medium">{selectedCompany.name}</p>
        </div>
      ) : null}
    </div>
  );
};

export default CompanyBadge;
