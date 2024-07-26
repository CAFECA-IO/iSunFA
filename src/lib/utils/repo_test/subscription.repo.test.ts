import {
  createSubscription,
  getSubscriptionById,
  updateSubscription,
  deleteSubscriptionForTesting,
  listSubscriptions,
} from '@/lib/utils/repo/subscription.repo';
import subscriptions from '@/seed_json/subscription.json';

describe('Subscription Repository', () => {
  const testSubscriptionId = 1000;
  const testCompanyId = 1000;
  const testPlanId = 1000;
  describe('listSubscriptions', () => {
    it('should return a list of subscriptions', async () => {
      const subscriptionList = await listSubscriptions(testCompanyId);
      expect(subscriptionList).toBeDefined();
      expect(Array.isArray(subscriptionList)).toBe(true);
      expect(subscriptionList.length).toBeGreaterThan(0);
      expect(subscriptionList[0]).toEqual(subscriptions[0]);
    });
  });

  describe('getSubscriptionById', () => {
    it('should return a subscription by their ID', async () => {
      const subscription = await getSubscriptionById(testSubscriptionId);
      expect(subscription).toBeDefined();
      expect(subscription).toEqual(subscriptions[0]);
    });

    it('should return null if the subscription is not found', async () => {
      const subscriptionId = -1; // Assuming -1 is an invalid ID
      const subscription = await getSubscriptionById(subscriptionId);
      expect(subscription).toBeNull();
    });
  });

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const testStatus = true;
      const subscription = await createSubscription(testCompanyId, testPlanId, testStatus);
      await deleteSubscriptionForTesting(subscription.id); // Clean up after test
      expect(subscription).toBeDefined();
      expect(subscription.companyId).toBe(testCompanyId);
      expect(subscription.planId).toBe(testPlanId);
      expect(subscription.status).toBe(testStatus);
    });
  });

  describe('updateSubscription', () => {
    it('should update a subscription by their ID', async () => {
      const updatedSubscription = await updateSubscription(testSubscriptionId, { status: false });
      await updateSubscription(testSubscriptionId, { status: true });
      expect(updatedSubscription).toBeDefined();
      expect(updatedSubscription!.id).toBe(testSubscriptionId);
      expect(updatedSubscription!.status).toBe(false);
    });
  });
});
