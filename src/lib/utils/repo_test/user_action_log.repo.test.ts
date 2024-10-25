import { SortBy, UserActionLogActionType } from '@/constants/user_action_log';
import { SortOrder } from '@/constants/sort';
import {
  createUserActionLog,
  deleteUserActionLogForTesting,
  listUserActionLog,
} from '@/lib/utils/repo/user_action_log.repo';
import { STATUS_MESSAGE } from '@/constants/status_code';

describe('User Action Log Repository', () => {
  describe('createUserActionLog', () => {
    it('should create a new user action log', async () => {
      const data = {
        sessionId: 'test-session-id',
        userId: 1000,
        actionType: UserActionLogActionType.LOGIN,
        actionDescription: 'User logged in',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        apiEndpoint: '/api/login',
        httpMethod: 'POST',
        requestPayload: { username: 'test' },
        statusMessage: STATUS_MESSAGE.CREATED,
      };

      const userActionLog = await createUserActionLog(data);
      await deleteUserActionLogForTesting(userActionLog!.id);
      expect(userActionLog).toBeDefined();
      expect(userActionLog.sessionId).toBe(data.sessionId);
      expect(userActionLog.userId).toBe(data.userId);
      expect(userActionLog.actionType).toBe(data.actionType);
      expect(userActionLog.actionDescription).toBe(data.actionDescription);
      expect(userActionLog.ipAddress).toBe(data.ipAddress);
      expect(userActionLog.userAgent).toBe(data.userAgent);
      expect(userActionLog.apiEndpoint).toBe(data.apiEndpoint);
      expect(userActionLog.httpMethod).toBe(data.httpMethod);
      expect(userActionLog.requestPayload).toEqual(data.requestPayload);
      expect(userActionLog.statusMessage).toBe(data.statusMessage);
    });
  });

  describe('listUserActionLog', () => {
    it('should return a paginated list of user action logs', async () => {
      const userId = 1000;
      const actionType = UserActionLogActionType.LOGIN;
      const targetPage = 1;
      const pageSize = 10;
      const sortOrder = SortOrder.DESC;
      const sortBy = SortBy.ACTION_TIME;

      const userActionLogList = await listUserActionLog(
        userId,
        actionType,
        targetPage,
        pageSize,
        undefined,
        undefined,
        sortOrder,
        sortBy
      );

      expect(userActionLogList).toBeDefined();
      expect(Array.isArray(userActionLogList.data)).toBe(true);
      expect(userActionLogList.data.length).toBeLessThanOrEqual(pageSize);
      expect(userActionLogList.page).toBe(targetPage);
      expect(userActionLogList.totalPages).toBeGreaterThanOrEqual(1);
      expect(userActionLogList.totalCount).toBeGreaterThanOrEqual(1);
      expect(userActionLogList.pageSize).toBe(pageSize);
      expect(userActionLogList.hasNextPage).toBeDefined();
      expect(userActionLogList.hasPreviousPage).toBeDefined();
      expect(userActionLogList.sort).toEqual([{ sortBy, sortOrder }]);
    });
  });
});
