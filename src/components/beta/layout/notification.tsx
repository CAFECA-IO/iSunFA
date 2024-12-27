import { Dispatch, SetStateAction, useState } from 'react';
import { FiBell, FiCheckCircle } from 'react-icons/fi';
import NotificationItem from '@/components/beta/layout/notification_item';
import { NotificationType } from '@/constants/notification';
import { useTranslation } from 'next-i18next';

const FAKE_NOTIFICATIONS: NotificationType[] = [
  {
    id: '1',
    content:
      'This is a test notification, in order to test whether the notification message panel is successfully displayed.',
    isRead: false,
    type: 'text',
  },
  {
    id: '2',
    content: 'Hello! Welcome to iSunFA!',
    isRead: false,
    type: 'text',
  },
  {
    id: '3',
    content: 'This is a test notification which is already read. So its color is gray.',
    isRead: true,
    type: 'text',
  },
  {
    id: '4',
    content: 'Example Team',
    isRead: false,
    type: 'button',
  },
  {
    id: '5',
    content:
      'This is a test notification, in order to test whether the notification message panel is successfully displayed.',
    isRead: false,
    type: 'text',
  },
];

interface NotificationProps {
  isPanelOpen: boolean;
  setIsPanelOpen: Dispatch<SetStateAction<boolean>>;
  toggleNotificationPanel?: () => void;
}

const Notification = ({
  isPanelOpen,
  setIsPanelOpen,
  toggleNotificationPanel = () => setIsPanelOpen((prev) => !prev),
}: NotificationProps) => {
  const { t } = useTranslation(['dashboard']);
  const [notifications, setNotifications] = useState(FAKE_NOTIFICATIONS);
  // ToDo: (20241225 - Liz) 等 API 可以使用後就改用 notifications 來判斷
  // const isNoData = notifications.length === 0;
  const isNoData = true;

  // ToDo: (20241225 - Liz) 打開面板時打 API 取得通知 (搭配 useEffect)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchNotifications = () => {
    // setNotifications(); // 將取得的通知資料設定到 state
  };

  // ToDo: (20241225 - Liz) 打 API 更新通知為已讀
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const readNotificationAPI = () => {};

  // Info: (20241225 - Liz) 標記通知為已讀
  const onMarkAsRead = async (notificationId: string) => {
    const notificationIndex = notifications.findIndex((n) => n.id === notificationId);
    // Info: (20241225 - Liz) 如果通知不存在或已讀，則不執行任何操作
    if (notificationIndex === -1 || notifications[notificationIndex].isRead) {
      return;
    }

    try {
      // ToDo: (20241225 - Liz) 呼叫 API 標記為已讀
      // await readNotificationAPI(notificationId);

      // ToDo: (20241225 - Liz) 更新本地狀態
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      // ToDo: (20241225 - Liz) 處理錯誤
      // console.error(`Failed to mark notification ${notificationId} as read`, error);
    }
  };

  return (
    <section className="relative">
      {/* // Info: (20241011 - Liz) 通知鈴鐺 icon */}
      <button
        type="button"
        onClick={toggleNotificationPanel}
        className="p-10px text-icon-surface-single-color-primary hover:text-button-text-primary-hover disabled:text-button-text-disable"
      >
        <FiBell size={24} className="cursor-pointer" />
      </button>

      {/* // Info: (20241011 - Liz) 通知訊息面板 */}
      {isPanelOpen && (
        <div className="absolute right-0 top-full z-10 mt-10px flex w-400px flex-col rounded-lg bg-surface-neutral-surface-lv2 px-24px py-12px shadow-Dropshadow_M">
          <button
            type="button"
            className="flex items-center gap-4px self-end rounded-xs px-16px py-8px text-button-text-secondary hover:bg-button-surface-soft-secondary-hover disabled:text-button-text-disable"
          >
            <FiCheckCircle size={16} />
            <span className="text-sm font-medium">{t('dashboard:HEADER.MARK_AS_ALL_READ')}</span>
          </button>

          {!isNoData &&
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
              />
            ))}

          {isNoData && (
            <p className="p-12px text-center text-base font-medium text-text-neutral-tertiary">
              {t('dashboard:HEADER.NO_NEW_NOTIFICATIONS')}
            </p>
          )}

          <button type="button" className="self-end text-sm font-semibold text-link-text-primary">
            {t('dashboard:HEADER.READ_MORE')}
          </button>
        </div>
      )}
    </section>
  );
};

export default Notification;
