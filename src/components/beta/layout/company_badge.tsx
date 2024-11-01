import Image from 'next/image';

// ToDo: (20241014 - Liz) 從 user context 取得使用者已經選擇的公司
const selectedCompany = 'iSunCloud';

const CompanyBadge = () => {
  return (
    <div>
      {selectedCompany ? (
        <div className="flex items-center justify-center gap-1px rounded-md bg-badge-surface-soft-primary px-3px py-4px text-badge-text-primary-solid">
          <Image
            src="/images/fake_company_avatar.svg"
            alt="fake_company_avatar"
            width={14}
            height={14}
          ></Image>
          {/* Info: (20241101 - Anna) 加上 mb-0 防止報告頁面跑版，其他頁面應不受影響 */}
          <p className="mb-0 px-2.5px text-xs font-medium">{selectedCompany}</p>
        </div>
      ) : null}
    </div>
  );
};

export default CompanyBadge;
