import { FiCheckCircle } from 'react-icons/fi';
import { INotification, NOTIFICATION_TYPE } from '@/constants/notification';
import NotificationItemMobile from '@/components/beta/layout/mobile/notification_item_mobile';

const FAKE_NOTIFICATIONS: INotification[] = [
  {
    id: '1',
    content: 'You have a team invitation from Example Team',
    isRead: false,
    type: NOTIFICATION_TYPE.INVITATION,
  },
  {
    id: '2',
    content: 'Hello! Welcome to iSunFA!',
    isRead: false,
    type: NOTIFICATION_TYPE.GENERAL,
  },
  {
    id: '3',
    content: 'This is a test notification which is already read. So its color is gray.',
    isRead: true,
    type: NOTIFICATION_TYPE.GENERAL,
  },
  {
    id: '4',
    content: 'You have a team invitation from B Team',
    isRead: false,
    type: NOTIFICATION_TYPE.INVITATION,
  },
  {
    id: '5',
    content:
      'This is a test notification, in order to test whether the notification message panel is successfully displayed. This is a test notification, in order to test whether the notification message panel is successfully displayed. This is a test notification, in order to test whether the notification message panel is successfully displayed. This is a test notification, in order to test whether the notification message panel is successfully displayed.',
    isRead: false,
    type: NOTIFICATION_TYPE.GENERAL,
  },
];

const NotificationMobile = () => {
  return (
    <main className="flex flex-col px-8px py-12px">
      <button
        type="button"
        className="flex items-center gap-4px self-end rounded-xs px-12px py-8px hover:bg-button-surface-soft-secondary-hover disabled:text-button-text-disable"
      >
        <FiCheckCircle size={16} className="text-button-text-secondary" />
        <span className="text-button-text-secondary">Mark as all read</span>
      </button>

      {FAKE_NOTIFICATIONS.map((notification) => (
        <NotificationItemMobile key={notification.id} notification={notification} />
      ))}

      {FAKE_NOTIFICATIONS.length === 0 && (
        <div className="flex items-center justify-center p-16px">
          <span>No notifications</span>
        </div>
      )}
    </main>
  );
};

export default NotificationMobile;
