import { INotification, NOTIFICATION_TYPE } from '@/interfaces/notification';
import { useTranslation } from 'next-i18next';
import { cn } from '@/lib/utils/common';

type NotificationItemProps = {
  notification: INotification;
  onMarkAsRead: (id: string) => void;
};

const NotificationItem = ({ notification, onMarkAsRead }: NotificationItemProps) => {
  const { t } = useTranslation(['dashboard']);
  const { id, content, isRead, type, teamName } = notification;

  if (type === NOTIFICATION_TYPE.GENERAL) {
    return (
      <section className="p-12px">
        <button
          type="button"
          onMouseEnter={() => onMarkAsRead(id)}
          className={cn('line-clamp-3 text-start text-base font-medium text-text-neutral-primary', {
            'text-text-neutral-tertiary': isRead,
            'hover:bg-surface-neutral-surface-lv1 hover:text-text-neutral-link': !isRead,
          })}
        >
          {content}
        </button>
      </section>
    );
  }

  if (type === NOTIFICATION_TYPE.INVITATION) {
    return (
      <div
        className={`flex flex-col gap-16px bg-surface-neutral-surface-lv2 p-12px font-medium text-text-neutral-primary hover:bg-surface-neutral-surface-lv1`}
      >
        {`${content} ${teamName}`}

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
