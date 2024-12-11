import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { FiEdit3, FiLink, FiMail } from 'react-icons/fi';
import { TbUserCircle } from 'react-icons/tb';
import { Button } from '@/components/button/button';
import IPModal, { extractLoginDevice } from '@/components/user_settings/ip_modal';
import { IPaginatedData } from '@/interfaces/pagination';
import { IUserActionLog } from '@/interfaces/user_action_log';

interface UserInfoProps {
  userId: number;
  username: string;
  email: string;
  loginDevice: string;
  loginIP: string;
  imageId: string;
  userActionLogs: IPaginatedData<IUserActionLog[]> | null;
}

const UserInfo: React.FC<UserInfoProps> = ({
  userId,
  username,
  email,
  loginDevice,
  loginIP,
  imageId,
  userActionLogs,
}) => {
  const { t } = useTranslation(['setting', 'common']);
  const [isIPModalOpen, setIsIPModalOpen] = useState(false);

  const toggleIPModal = () => {
    setIsIPModalOpen((prev) => !prev);
  };

  return (
    <div className="bg-brand-gradient flex items-center gap-lv-7 rounded-md p-4 shadow-normal_setting_brand">
      {isIPModalOpen && (
        <IPModal userId={userId} toggleModal={toggleIPModal} pageData={userActionLogs} />
      )}
      <Image
        alt="avatar"
        src={imageId}
        width={80}
        height={80}
        className="rounded-full group-hover:brightness-50"
      />
      <div>
        <div className="mb-lv-4 flex items-center gap-3 text-sm text-gray-700">
          <TbUserCircle size={16} />
          <div className="flex items-center gap-1">
            <span className="text-text-neutral-mute">{t('setting:NORMAL.USER_NAME')}:</span>
            <span className="text-base font-semibold text-text-neutral-primary">{username}</span>
          </div>
          <FiEdit3 size={16} />
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <FiMail size={16} />
          <div className="flex max-w-280px flex-wrap items-center gap-1">
            <span className="min-w-130px text-text-neutral-mute">
              {t('setting:NORMAL.LINKED_EMAIL')}:
            </span>
            <span className="text-base font-semibold text-text-neutral-primary">{email}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-700">
        <FiLink size={16} />
        <div className="flex flex-col items-start gap-1">
          <span className="text-text-neutral-mute">{t('setting:NORMAL.LOGIN_DEVICE_N_IP')}:</span>
          <Button
            id="setting-add-company"
            type="button"
            variant="linkBorderless"
            size="noPadding"
            className="justify-start p-0 text-base font-normal"
            onClick={toggleIPModal}
          >
            <p className="flex max-w-280px flex-wrap gap-1">
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
