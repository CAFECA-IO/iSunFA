import {
  createPaymentRecord,
  deletePaymentRecord,
  getPaymentRecordById,
  listPaymentRecords,
} from '@/lib/utils/repo/payment_record.repo';
import paymentRecords from '@/seed_json/payment_record.json';

describe('Payment Record Repository', () => {
  const testPaymentRecordId = 1000;
  const testOrderId = 1000;
  describe('listPaymentRecords', () => {
    it('should return a list of payment records for a given order ID', async () => {
      const paymentRecordList = await listPaymentRecords(testOrderId);
      expect(paymentRecordList).toBeDefined();
      expect(Array.isArray(paymentRecordList)).toBe(true);
      expect(paymentRecordList.length).toBeGreaterThan(0);
      expect(paymentRecordList[0]).toEqual(paymentRecords[0]);
    });
  });

  describe('getPaymentRecordById', () => {
    it('should return a payment record by their ID', async () => {
      const paymentRecord = await getPaymentRecordById(testPaymentRecordId);
      expect(paymentRecord).toBeDefined();
      expect(paymentRecord).toEqual(paymentRecords[0]);
    });

    it('should return an empty object if the payment record is not found', async () => {
      const paymentRecordId = -1; // Assuming -1 is an invalid ID
      const paymentRecord = await getPaymentRecordById(paymentRecordId);
      expect(paymentRecord).toBeNull();
    });
  });

  describe('createPaymentRecord', () => {
    it('should create a new payment record', async () => {
      const newPaymentRecord = {
        orderId: 1001,
        transactionId: 'txn_999',
        date: 12736412,
        description: 'Test Payment',
        amount: 1000,
        method: 'credit_card',
        status: 'completed',
      };
      const paymentRecord = await createPaymentRecord(
        newPaymentRecord.orderId,
        newPaymentRecord.transactionId,
        newPaymentRecord.date,
        newPaymentRecord.description,
        newPaymentRecord.amount,
        newPaymentRecord.method,
        newPaymentRecord.status
      );
      expect(paymentRecord).toBeDefined();
      expect(paymentRecord.orderId).toBe(newPaymentRecord.orderId);
      expect(paymentRecord.transactionId).toBe(newPaymentRecord.transactionId);
      expect(paymentRecord.description).toBe(newPaymentRecord.description);
      expect(paymentRecord.amount).toBe(newPaymentRecord.amount);
      expect(paymentRecord.method).toBe(newPaymentRecord.method);
      expect(paymentRecord.status).toBe(newPaymentRecord.status);
      // Clean up after test
      await deletePaymentRecord(paymentRecord.id);
    });
  });
});
