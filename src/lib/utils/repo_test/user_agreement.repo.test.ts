import { createUserAgreement, deleteUserAgreement } from '@/lib/utils/repo/user_agreement.repo';
import { UserAgreement } from '@prisma/client';

describe('User Agreement Repository Tests', () => {
  const testUserId = 1000;
  const testAgreementHash = 'testAgreementHash';

  describe('createUserAgreement', () => {
    it('should create a new user agreement', async () => {
      const userAgreement: UserAgreement = await createUserAgreement(testUserId, testAgreementHash);
      await deleteUserAgreement(testUserId, testAgreementHash);
      expect(userAgreement).toBeDefined();
      expect(userAgreement.userId).toBe(testUserId);
      expect(userAgreement.agreementHash).toBe(testAgreementHash);
      expect(userAgreement.createdAt).toBeGreaterThan(0);
      expect(userAgreement.updatedAt).toBeGreaterThan(0);
    });
  });
});
