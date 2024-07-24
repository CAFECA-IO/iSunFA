import {
  listOrder,
  createOrder,
  getOrderById,
  updateOrder,
  deleteOrderForTesting,
} from '@/lib/utils/repo/order.repo';
import orders from '@/seed_json/order.json';

describe('Order Repository Tests', () => {
  const testCompanyId = 1000;
  const testPlanId = 1000;
  const testStatus = 'pending';
  const testOrderId = 1000;

  describe('createOrder', () => {
    it('should create a new order and return it', async () => {
      const newOrder = await createOrder(testCompanyId, testPlanId, testStatus);
      await deleteOrderForTesting(newOrder.id); // Clean up after test
      expect(newOrder).toBeDefined();
      expect(newOrder.companyId).toBe(testCompanyId);
      expect(newOrder.planId).toBe(testPlanId);
      expect(newOrder.status).toBe(testStatus);
    });
  });

  describe('listOrder', () => {
    it('should return a list of orders for a given company ID', async () => {
      const orderList = await listOrder(testCompanyId);
      expect(orderList).toBeDefined();
      expect(Array.isArray(orderList)).toBe(true);
      expect(orderList.length).toBeGreaterThan(0);
      // Ensure the created order is in the list
      expect(orderList[0].id).toEqual(orders[0].id);
      expect(orderList[0].companyId).toEqual(orders[0].companyId);
      expect(orderList[0].planId).toEqual(orders[0].planId);
      expect(orderList[0].status).toEqual(orders[0].status);
    });
  });

  describe('getOrderById', () => {
    it('should return an order by its ID', async () => {
      const order = await getOrderById(testOrderId);
      expect(order).toBeDefined();
      expect(order!.id).toBe(testOrderId);
    });

    it('should return null if the order does not exist', async () => {
      const nonExistentOrderId = -1;
      const order = await getOrderById(nonExistentOrderId);
      expect(order).toBeNull();
    });
  });

  describe('updateOrder', () => {
    it('should update the status of an order', async () => {
      const newStatus = 'completed';
      const updatedOrder = await updateOrder(testOrderId, newStatus);
      await updateOrder(testOrderId, testStatus); // Rollback the status
      expect(updatedOrder).toBeDefined();
      expect(updatedOrder.status).toBe(newStatus);
    });
  });
});
