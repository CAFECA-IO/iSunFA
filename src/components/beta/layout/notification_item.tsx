import { INotificationRC2, NotificationEvent, NotificationType } from '@/interfaces/notification';
import { useTranslation } from 'next-i18next';
import { cn } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';

// ToDo: (20250529 - Liz) 此元件正在修改中，尚未完成!!!

type NotificationItemProps = {
  notification: INotificationRC2;
  onMarkAsRead: (id: number) => void;
};

const NotificationItem = ({ notification, onMarkAsRead }: NotificationItemProps) => {
  const { t } = useTranslation(['dashboard']);
  const { id, title, message, read, type, event, content } = notification;
  const { teamName } = content;

  const { trigger: acceptAccountBookTransferAPI } = APIHandler<void>(
    APIName.ACCEPT_TRANSFER_ACCOUNT_BOOK
  );
  const { trigger: declineAccountBookTransferAPI } = APIHandler<void>(
    APIName.DECLINE_TRANSFER_ACCOUNT_BOOK
  );
  const { trigger: cancelAccountBookTransferAPI } = APIHandler<void>(
    APIName.CANCEL_TRANSFER_ACCOUNT_BOOK
  );
  const { trigger: acceptTeamInvitationAPI } = APIHandler<void>(APIName.ACCEPT_TEAM_INVITATION);
  const { trigger: declineTeamInvitationAPI } = APIHandler<void>(APIName.DECLINE_TEAM_INVITATION);

  // Info: (20250529 - Liz) 打 API 接受團隊邀請
  const acceptTeamInvitation = async () => {
    const { success } = await acceptTeamInvitationAPI({ params: { teamId: notification.teamId } });
    if (success) {
      onMarkAsRead(id);
    }
  };

  // Info: (20250529 - Liz) 打 API 拒絕團隊邀請
  const declineTeamInvitation = async () => {
    const { success } = await declineTeamInvitationAPI({ params: { teamId: notification.teamId } });
    if (success) {
      onMarkAsRead(id);
    }
  };

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
        className={`flex flex-col gap-16px bg-surface-neutral-surface-lv2 p-12px text-text-neutral-primary hover:bg-surface-neutral-surface-lv1`}
      >
        <h3 className="font-medium">{`${title} ${teamName}`}</h3>

        <div className="flex items-center justify-center gap-15px">
          <button
            type="button"
            className="rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            onClick={acceptTeamInvitation}
          >
            {t('dashboard:HEADER.ACCEPT')}
          </button>
          <button
            type="button"
            className="rounded-xs border border-button-stroke-secondary px-16px py-8px text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover disabled:text-button-text-disable"
            onClick={declineTeamInvitation}
          >
            {t('dashboard:HEADER.DECLINE')}
          </button>
        </div>
      </div>
    );
  }

  if (type === NotificationType.ACCOUNT_BOOK) {
    const { accountBookId } = notification.content;

    const isTransferInitiator = message === 'ACCOUNT_BOOK_TRANSFER.TRANSFER.FROM_TEAM';

    // Info: (20250529 - Liz) 打 API 接受帳本轉移
    const acceptAccountBookTransfer = async () => {
      await acceptAccountBookTransferAPI({
        params: { accountBookId },
      });
      onMarkAsRead(id);
    };

    // Info: (20250529 - Liz) 打 API 拒絕帳本轉移
    const declineAccountBookTransfer = async () => {
      await declineAccountBookTransferAPI({
        params: { accountBookId },
      });
      onMarkAsRead(id);
    };

    // Info: (20250529 - Liz) 打 API 取消帳本轉移
    const cancelAccountBookTransfer = async () => {
      await cancelAccountBookTransferAPI({
        params: { accountBookId },
      });
      onMarkAsRead(id);
    };

    return (
      <section className="flex flex-col gap-16px bg-surface-neutral-surface-lv2 p-12px text-text-neutral-primary hover:bg-surface-neutral-surface-lv1">
        <h3 className="text-base font-medium text-text-neutral-primary">{message}</h3>

        {event === NotificationEvent.TRANSFER && (
          <div className="flex justify-end gap-8px">
            {isTransferInitiator ? (
              <button
                type="button"
                onClick={cancelAccountBookTransfer}
                className="rounded border border-button-stroke-secondary px-12px py-6px text-sm text-red-500 hover:border-red-500 hover:text-red-600"
              >
                {/* ToDo: (20250529 - Luphia) use i18n */}
                取消轉移
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={acceptAccountBookTransfer}
                  className="rounded bg-button-surface-strong-secondary px-12px py-6px text-sm text-white hover:bg-button-surface-strong-secondary-hover"
                >
                  {/* ToDo: (20250529 - Luphia) use i18n */}
                  接受轉移
                </button>
                <button
                  type="button"
                  onClick={declineAccountBookTransfer}
                  className="rounded border border-button-stroke-secondary px-12px py-6px text-sm text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover"
                >
                  {/* ToDo: (20250529 - Luphia) use i18n */}
                  拒絕
                </button>
              </>
            )}
          </div>
        )}
      </section>
    );
  }

  return null;
};

export default NotificationItem;
