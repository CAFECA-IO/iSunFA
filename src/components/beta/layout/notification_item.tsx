import { INotificationRC2, NotificationType } from '@/interfaces/notification';
import { useTranslation } from 'next-i18next';
import { cn } from '@/lib/utils/common';

type NotificationItemProps = {
  notification: INotificationRC2;
  onMarkAsRead: (id: number) => void;
};

const NotificationItem = ({ notification, onMarkAsRead }: NotificationItemProps) => {
  const { t } = useTranslation(['dashboard']);
  const { id, title, message, read, type, teamName } = notification;

  // ToDo: (20250516 - Liz) 打 API 接受團隊邀請
  // ToDo: (20250516 - Liz) 打 API 拒絕團隊邀請

  if (type === NotificationType.GENERAL) {
    return (
      <section className="p-12px">
        <button
          type="button"
          onMouseEnter={() => onMarkAsRead(id)}
          className={cn('line-clamp-3 text-start text-base font-medium text-text-neutral-primary', {
            'text-text-neutral-tertiary': read,
            'hover:bg-surface-neutral-surface-lv1 hover:text-text-neutral-link': !read,
          })}
        >
          {message}
        </button>
      </section>
    );
  }

  if (type === NotificationType.INVITATION) {
    return (
      <div
        className={`flex flex-col gap-16px bg-surface-neutral-surface-lv2 p-12px font-medium text-text-neutral-primary hover:bg-surface-neutral-surface-lv1`}
      >
        {`${title} ${teamName}`}

        <div className="flex items-center justify-center gap-15px">
          <button
            type="button"
            className="rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            {t('dashboard:HEADER.ACCEPT')}
          </button>
          <button
            type="button"
            className="rounded-xs border border-button-stroke-secondary px-16px py-8px text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover disabled:text-button-text-disable"
          >
            {t('dashboard:HEADER.DECLINE')}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default NotificationItem;
