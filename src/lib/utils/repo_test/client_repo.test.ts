import {
  createClient,
  getClientById,
  listClient,
  updateClientById,
} from '@/lib/utils/repo/client.repo';
import clients from '@/seed_json/client.json';

describe('Client Repository Tests', () => {
  const testClientId = 1000;
  const testCompanyId = 1000;

  describe('listClient', () => {
    it('should return a list of clients for a given company ID', async () => {
      const clientList = await listClient(testCompanyId);
      expect(clientList).toBeDefined();
      expect(clientList.length).toBeGreaterThan(0);
      expect(clientList[0].companyId).toBe(testCompanyId);
    });
  });

  describe('getClientById', () => {
    it('should return a client by its ID', async () => {
      const client = await getClientById(testClientId);
      expect(client).toBeDefined();
      expect(client?.id).toEqual(clients[0].id);
      expect(client?.name).toEqual(clients[0].name);
      expect(client?.taxId).toEqual(clients[0].taxId);
      expect(client?.favorite).toEqual(clients[0].favorite);
    });

    it('should return null if the client is not found', async () => {
      const nonExistentClientId = -1;
      const client = await getClientById(nonExistentClientId);
      expect(client).toBeNull();
    });
  });

  describe('updateClientById', () => {
    it("should update a client's details", async () => {
      const updatedClientData = {
        name: 'Updated Test Client',
        taxId: 'Updated Tax ID',
        favorite: true,
      };
      const client = await updateClientById(
        testClientId,
        updatedClientData.name,
        updatedClientData.taxId,
        updatedClientData.favorite
      );
      await updateClientById(testClientId, clients[0].name, clients[0].taxId, clients[0].favorite); // Info: (20240704 - Jacky) Reset the client data
      expect(client).toBeDefined();
      expect(client.name).toBe(updatedClientData.name);
      expect(client.taxId).toBe(updatedClientData.taxId);
      expect(client.favorite).toBe(updatedClientData.favorite);
    });
  });

  describe('createClient', () => {
    it('should create a new client', async () => {
      const newClientData = {
        companyId: testCompanyId,
        name: 'New Client Name',
        taxId: 'New Tax ID',
        favorite: false,
      };
      const client = await createClient(
        newClientData.companyId,
        newClientData.name,
        newClientData.taxId,
        newClientData.favorite
      );
      expect(client).toBeDefined();
      expect(client.companyId).toBe(newClientData.companyId);
      expect(client.name).toBe(newClientData.name);
      expect(client.taxId).toBe(newClientData.taxId);
      expect(client.favorite).toBe(newClientData.favorite);
      // Info: (20240704 - Jacky) Assuming deletion of the newly created client is handled elsewhere or not needed for this test
    });
  });
});
