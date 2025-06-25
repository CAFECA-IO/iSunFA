import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { FiLink, FiMail } from 'react-icons/fi';
import { TbUserCircle } from 'react-icons/tb';
import { Button } from '@/components/button/button';
import IPModal, { extractLoginDevice } from '@/components/general/user_settings/ip_modal';
import { IPaginatedData } from '@/interfaces/pagination';
import { ILoginDevice } from '@/interfaces/login_device';

interface UserInfoProps {
  userId: number;
  username: string;
  email: string;
  loginDevice: string;
  loginIP: string;
  imageId: string;
  loginDevices: IPaginatedData<ILoginDevice[]> | null;
}

const UserInfo: React.FC<UserInfoProps> = ({
  userId,
  username,
  email,
  loginDevice,
  loginIP,
  imageId,
  loginDevices,
}) => {
  const { t } = useTranslation(['settings', 'common']);
  const [isIPModalOpen, setIsIPModalOpen] = useState(false);

  // Info: (20250212 - Anna) 從 loginDevices 找出當前登入的裝置 for 異常登入判斷
  // Info: (20250212 - Anna) 沒有用 isCurrent: true 判斷，因為不確定是否會多個裝置同時登入
  const currentDevice = loginDevices?.data.find((device) => device.userAgent === loginDevice);
  const isAbnormal = currentDevice?.normal === false;

  const toggleIPModal = () => {
    setIsIPModalOpen((prev) => !prev);
  };

  return (
    <div className="bg-brand-gradient flex flex-col items-center justify-between gap-lv-4 rounded-md border border-stroke-brand-primary px-40px py-16px tablet:flex-row tablet:gap-lv-7">
      {isIPModalOpen && (
        <IPModal userId={userId} toggleModal={toggleIPModal} pageData={loginDevices} />
      )}
      <div className="h-80px w-80px flex-none overflow-hidden rounded-full group-hover:brightness-50">
        <Image alt="avatar" src={imageId} width={80} height={80} />
      </div>

      <div className="flex flex-col gap-lv-4">
        <div className="flex items-center gap-3 text-sm">
          <TbUserCircle size={16} className="flex-none text-icon-surface-single-color-primary" />
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-nowrap text-text-neutral-tertiary">
              {t('settings:NORMAL.USER_NAME')}:
            </span>
            <span className="text-base font-semibold text-text-neutral-primary">{username}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <FiMail size={16} className="flex-none text-icon-surface-single-color-primary" />
          <div className="flex max-w-280px flex-wrap items-center gap-1">
            <span className="text-nowrap text-text-neutral-tertiary">
              {t('settings:NORMAL.LINKED_EMAIL')}:
            </span>
            <span className="text-base font-semibold text-text-neutral-primary wrap-anywhere">
              {email}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <FiLink size={16} className="flex-none text-icon-surface-single-color-primary" />
        <div className="flex flex-col items-start gap-1">
          <span className="text-text-neutral-tertiary">
            {t('settings:NORMAL.LOGIN_DEVICE_N_IP')}:
          </span>
          <Button
            id="settings-add-company"
            type="button"
            variant="linkBorderless"
            size="noPadding"
            className="justify-start p-0 text-base font-normal"
            onClick={toggleIPModal}
          >
            {/* Info: (20250212 - Anna) 如果 `isAbnormal === true` (異常登入)，IP顯示紅色) */}
            <p
              className={`flex max-w-280px flex-wrap gap-1 ${isAbnormal ? 'text-text-state-error' : ''}`}
            >
              <span>{extractLoginDevice(loginDevice)} /</span>
              <span>{loginIP}</span>
            </p>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
