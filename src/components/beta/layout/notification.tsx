import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import { PiBell } from 'react-icons/pi';
import NotificationItem from '@/components/beta/layout/notification_item';
import { useTranslation } from 'next-i18next';
import { INotificationRC2 } from '@/interfaces/notification';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { getPusherInstance } from '@/lib/utils/pusher_client';
import { NOTIFICATION_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import loggerFront from '@/lib/utils/logger_front';

// ToDo: (20250529 - Liz) 先暫時使用假資料 FAKE_NOTIFICATIONS ，等功能完成後再改成實際資料 notifications
const FAKE_NOTIFICATIONS: INotificationRC2[] = [];

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
  const userCtx = useUserCtx();
  const { userAuth } = userCtx;

  const { trigger: listNotificationsAPI } = APIHandler<INotificationRC2[]>(
    APIName.LIST_NOTIFICATION
  );
  const { trigger: readNotificationAPI } = APIHandler<{ count: number }>(APIName.READ_NOTIFICATION);

  // ToDo: (20250529 - Liz) 暫時使用假資料 FAKE_NOTIFICATIONS ，等功能完成後再改成實際資料 notifications
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [notifications, setNotifications] = useState<INotificationRC2[]>([]);
  const isNoData = FAKE_NOTIFICATIONS.length === 0;
  const hasUnreadNotifications = FAKE_NOTIFICATIONS.some((notification) => !notification.read);

  const [isGetNotificationsLoading, setIsGetNotificationsLoading] = useState<boolean>(false);

  // Info: (20250529 - Liz) 打 API 取得所有通知
  const getNotifications = useCallback(async () => {
    if (!userAuth) return;
    if (isGetNotificationsLoading) return;
    setIsGetNotificationsLoading(true);
    try {
      const { success, data } = await listNotificationsAPI({
        params: { userId: userAuth.id },
      });
      if (success && data) {
        setNotifications(data);
      }
    } catch (error) {
      loggerFront.error('Failed to fetch notifications', error);
    } finally {
      setIsGetNotificationsLoading(false);
    }
  }, [userAuth, isGetNotificationsLoading]);

  // Info: (20241225 - Liz) 標記通知為已讀
  const onMarkAsRead = async (notificationId: number) => {
    if (!userAuth) return;
    try {
      // Info: (20250529 - Liz) 打 API 標記通知為已讀
      await readNotificationAPI({ params: { userId: userAuth.id, notificationId } });

      // Info: (20250529 - Liz) 打 API 取得所有通知
      getNotifications();
    } catch (error) {
      loggerFront.error(`Failed to mark notification ${notificationId} as read`, error);
    }
  };

  const togglePanel = async () => {
    if (!isPanelOpen) {
      await getNotifications();
    }
    toggleNotificationPanel();
  };

  const handleNewNotification = useCallback((data: { message: string }) => {
    const newNotification: INotificationRC2 = JSON.parse(data.message);
    setNotifications((prev) => [...prev, newNotification]);
  }, []);

  useEffect(() => {
    if (!userAuth?.id) return () => {};
    const pusher = getPusherInstance(userAuth.id);
    const channel = pusher.subscribe(`${PRIVATE_CHANNEL.NOTIFICATION}-${userAuth.id}`);
    channel.bind(NOTIFICATION_EVENT.NEW, handleNewNotification);

    return () => {
      if (channel) {
        channel.unbind(NOTIFICATION_EVENT.NEW, handleNewNotification);
        channel.unsubscribe();
      }
      pusher.unsubscribe(`${PRIVATE_CHANNEL.NOTIFICATION}-${userAuth.id}`);
    };
  }, [userAuth?.id]);

  return (
    <section className="relative">
      {/* Info: (20241011 - Liz) 通知鈴鐺 icon */}
      <button
        type="button"
        onClick={togglePanel}
        className="relative p-10px text-icon-surface-single-color-primary hover:text-button-text-primary-hover disabled:text-button-text-disable"
      >
        <PiBell size={20} className="cursor-pointer" />
        {hasUnreadNotifications && (
          <span className="absolute right-11px top-11px h-8px w-8px rounded-full border border-avatar-stroke-primary bg-surface-state-error"></span>
        )}
      </button>

      {/* Info: (20241011 - Liz) 通知訊息面板 */}
      {isPanelOpen && (
        <div className="absolute right-0 top-full z-100 mt-10px flex w-400px flex-col rounded-lg bg-surface-neutral-surface-lv2 px-24px py-12px shadow-Dropshadow_M">
          <button
            type="button"
            className="flex items-center gap-4px self-end rounded-xs px-16px py-8px text-button-text-secondary hover:bg-button-surface-soft-secondary-hover disabled:text-button-text-disable"
          >
            <FiCheckCircle size={16} />
            <span className="text-sm font-medium">{t('dashboard:HEADER.MARK_AS_ALL_READ')}</span>
          </button>

          <section className="max-h-60vh overflow-y-auto">
            {FAKE_NOTIFICATIONS.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
              />
            ))}
          </section>

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
