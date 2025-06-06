import { FiCheckCircle } from 'react-icons/fi';
import NotificationItemMobile from '@/components/beta/layout/mobile/notification_item_mobile';
import { useTranslation } from 'next-i18next';
import { INotification } from '@/interfaces/notification';

interface NotificationMobileProps {
  notifications: INotification[];
}

const NotificationMobile = ({ notifications }: NotificationMobileProps) => {
  const { t } = useTranslation(['dashboard']);

  return (
    <main className="flex min-h-0 flex-col px-8px py-12px">
      <button
        type="button"
        className="flex items-center gap-4px self-end rounded-xs px-12px py-8px hover:bg-button-surface-soft-secondary-hover disabled:text-button-text-disable"
      >
        <FiCheckCircle size={16} className="text-button-text-secondary" />
        <span className="text-button-text-secondary">{t('dashboard:HEADER.MARK_AS_ALL_READ')}</span>
      </button>

      <section className="overflow-y-auto">
        {notifications.map((notification) => (
          <NotificationItemMobile key={notification.id} notification={notification} />
        ))}
      </section>

      {notifications.length === 0 && (
        <div className="flex items-center justify-center p-12px">
          <span className="text-base font-medium text-text-neutral-tertiary">
            {t('dashboard:HEADER.NO_NEW_NOTIFICATIONS')}
          </span>
        </div>
      )}
    </main>
  );
};

export default NotificationMobile;
