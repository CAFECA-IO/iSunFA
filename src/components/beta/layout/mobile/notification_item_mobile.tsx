import { INotification, NOTIFICATION_TYPE } from '@/interfaces/notification';
import { cn } from '@/lib/utils/common';
import { useTranslation } from 'next-i18next';

interface NotificationItemMobileProps {
  notification: INotification;
}

// ToDo: (20250516 - Liz) 打 API 接受團隊邀請
// ToDo: (20250516 - Liz) 打 API 拒絕團隊邀請
// ToDo: (20250516 - Liz) 打 API 更新通知為已讀

const NotificationItemMobile = ({ notification }: NotificationItemMobileProps) => {
  const { t } = useTranslation(['dashboard']);

  const { content, isRead, type, teamName } = notification;
  if (type === NOTIFICATION_TYPE.INVITATION) {
    return (
      <section className="flex flex-col gap-16px p-12px">
        <div className="text-base font-medium text-text-neutral-primary">
          {`${content} ${teamName}`}
        </div>

        <div className="flex items-center justify-center gap-15px">
          <button
            type="button"
            className="rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            {t('dashboard:HEADER.ACCEPT')}
          </button>
          <button
            type="button"
            className="rounded-xs border border-button-stroke-secondary px-16px py-8px text-sm font-medium text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-stroke-primary-hover disabled:border-button-stroke-disable disabled:text-button-text-disable"
          >
            {t('dashboard:HEADER.DECLINE')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="p-12px">
      <button
        type="button"
        className={cn('line-clamp-3 text-start text-base font-medium text-text-neutral-primary', {
          'text-text-neutral-tertiary': isRead,
          'hover:text-text-neutral-link': !isRead,
        })}
      >
        {content}
      </button>
    </section>
  );
};

export default NotificationItemMobile;
