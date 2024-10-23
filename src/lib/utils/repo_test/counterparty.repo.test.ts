import { SortOrder } from '@/constants/sort';
import { SortBy } from '@/constants/journal';
import {
  createCounterparty,
  listCounterparty,
  getCounterpartyById,
  updateCounterpartyById,
  deleteCounterpartyForTesting,
} from '@/lib/utils/repo/counterparty.repo';
import Counterparties from '@/seed_json/counterparty.json';
import { CounterpartyType } from '@/interfaces/counterparty';

describe('Counterparty Repository', () => {
  const testCompanyId = 1000;
  const testName = 'Test Counterparty';
  const testTaxId = '123456789';
  const testType = CounterpartyType.CLIENT;
  const testNote = 'Test Note';

  describe('createCounterparty', () => {
    it('should create a new counterparty', async () => {
      const counterparty = await createCounterparty(
        testCompanyId,
        testName,
        testTaxId,
        testType,
        testNote
      );
      await deleteCounterpartyForTesting(counterparty.id);
      expect(counterparty).toBeDefined();
      expect(counterparty.companyId).toBe(testCompanyId);
      expect(counterparty.name).toBe(testName);
      expect(counterparty.taxId).toBe(testTaxId);
      expect(counterparty.type).toBe(testType);
      expect(counterparty.note).toBe(testNote);
    });
  });

  describe('listCounterparty', () => {
    it('should return a paginated list of counterparties', async () => {
      const targetPage = 1;
      const pageSize = 10;
      const sortOrder = SortOrder.DESC;
      const sortBy = SortBy.CREATED_AT;

      const counterpartyList = await listCounterparty(
        testCompanyId,
        targetPage,
        pageSize,
        undefined,
        undefined
      );

      expect(counterpartyList).toBeDefined();
      expect(Array.isArray(counterpartyList.data)).toBe(true);
      expect(counterpartyList.data.length).toBeLessThanOrEqual(pageSize);
      expect(counterpartyList.page).toBe(targetPage);
      expect(counterpartyList.totalPages).toBeGreaterThanOrEqual(0);
      expect(counterpartyList.totalCount).toBeGreaterThanOrEqual(0);
      expect(counterpartyList.pageSize).toBe(pageSize);
      expect(counterpartyList.hasNextPage).toBeDefined();
      expect(counterpartyList.hasPreviousPage).toBeDefined();
      expect(counterpartyList.sort).toEqual([{ sortBy, sortOrder }]);
    });
  });

  describe('getCounterpartyById', () => {
    it('should return a counterparty by its ID', async () => {
      const counterparty = await getCounterpartyById(Counterparties[0].id);
      expect(counterparty).toBeDefined();
      expect(counterparty).toStrictEqual(Counterparties[0]);
    });

    it('should return null if the counterparty does not exist', async () => {
      const nonExistentCounterpartyId = -1;
      const counterparty = await getCounterpartyById(nonExistentCounterpartyId);
      expect(counterparty).toBeNull();
    });
  });

  describe('updateCounterpartyById', () => {
    it('should update the details of a counterparty', async () => {
      const newName = 'Updated Counterparty';
      const newTaxId = '987654321';
      const newType = 'customer';
      const newNote = 'Updated Note';
      const updatedCounterparty = await updateCounterpartyById(
        Counterparties[1].id,
        newName,
        newTaxId,
        newType,
        newNote
      );
      await updateCounterpartyById(
        Counterparties[1].id,
        Counterparties[1].name,
        Counterparties[1].taxId,
        Counterparties[1].type,
        Counterparties[1].note
      ); // Info: (20241022 - Jacky) Rollback the changes
      expect(updatedCounterparty).toBeDefined();
      expect(updatedCounterparty.name).toBe(newName);
      expect(updatedCounterparty.taxId).toBe(newTaxId);
      expect(updatedCounterparty.type).toBe(newType);
      expect(updatedCounterparty.note).toBe(newNote);
    });
  });
});
