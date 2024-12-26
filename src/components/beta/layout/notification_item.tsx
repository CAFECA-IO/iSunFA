import { NotificationType } from '@/constants/notification';
import { useTranslation } from 'next-i18next';

type NotificationItemProps = {
  notification: NotificationType;
  onMarkAsRead: (id: string) => void;
};

const NotificationItem = ({ notification, onMarkAsRead }: NotificationItemProps) => {
  const { t } = useTranslation(['dashboard']);

  if (notification.type === 'text') {
    return (
      <button
        type="button"
        onMouseEnter={() => onMarkAsRead(notification.id)}
        className={`bg-surface-neutral-surface-lv2 p-12px text-left font-medium text-text-neutral-primary hover:bg-surface-neutral-surface-lv1 hover:text-text-neutral-link ${notification.isRead ? 'text-text-neutral-tertiary' : ''}`}
      >
        {notification.content}
      </button>
    );
  }

  if (notification.type === 'button') {
    return (
      <div
        className={`flex flex-col gap-16px bg-surface-neutral-surface-lv2 p-12px font-medium text-text-neutral-primary hover:bg-surface-neutral-surface-lv1`}
      >
        <p>{`${t('dashboard:HEADER.YOU_HAVE_A_TEAM_INVITATION_FROM')} “ ${notification.content} ”`}</p>

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
