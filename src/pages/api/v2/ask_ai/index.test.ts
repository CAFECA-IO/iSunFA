import { NextApiRequest } from 'next';
import { handlePostRequest } from '@/pages/api/v2/ask_ai/index';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { AI_TYPE } from '@/constants/aich';
import { ISessionData } from '@/interfaces/session_data';

describe('company/[companyId]/ask_ai', () => {
  describe('POST Voucher', () => {
    it('should pass certificate', async () => {
      const query = {
        reason: AI_TYPE.CERTIFICATE,
      };
      const body = {
        targetId: 1,
      };

      jest.mock('../../../../lib/utils/aich', () => ({
        fetchResultIdFromAICH: jest.fn().mockResolvedValue(1),
      }));
      const { statusMessage } = await handlePostRequest({
        body,
        query,
        session: {} as ISessionData,
        req: {} as NextApiRequest,
      });

      expect(statusMessage).toBe(STATUS_MESSAGE.AICH_API_NOT_FOUND);
    });

    it('should pass voucher', async () => {
      const query = {
        reason: AI_TYPE.VOUCHER,
      };
      const body = {
        targetId: 1,
      };

      const { statusMessage } = await handlePostRequest({
        body,
        query,
        session: {} as ISessionData,
        req: {} as NextApiRequest,
      });

      expect(statusMessage).toBe(STATUS_MESSAGE.AICH_API_NOT_FOUND);
    });
  });
});
