import { INotification, NOTIFICATION_TYPE } from '@/interfaces/notification';
import { cn } from '@/lib/utils/common';

interface NotificationItemMobileProps {
  notification: INotification;
}

const NotificationItemMobile = ({ notification }: NotificationItemMobileProps) => {
  const { content, isRead, type } = notification;
  if (type === NOTIFICATION_TYPE.INVITATION) {
    return (
      <section className="flex flex-col gap-16px p-12px">
        <div className="text-base font-medium text-text-neutral-primary">{content}</div>

        <div className="flex items-center justify-center gap-15px">
          <button
            type="button"
            className="rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            Accept
          </button>
          <button
            type="button"
            className="rounded-xs border border-button-stroke-secondary px-16px py-8px text-sm font-medium text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-stroke-primary-hover disabled:border-button-stroke-disable disabled:text-button-text-disable"
          >
            Decline
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col p-12px">
      <div
        className={cn('line-clamp-3 text-base font-medium text-text-neutral-primary', {
          'text-text-neutral-tertiary': isRead,
          'hover:text-text-neutral-link': !isRead,
        })}
      >
        {content}
      </div>
    </section>
  );
};

export default NotificationItemMobile;
