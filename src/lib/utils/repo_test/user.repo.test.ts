import {
  listUser,
  getUserById,
  getUserByCredential,
  createUser,
  updateUserById,
  deleteUserById,
} from '@/lib/utils/repo/user.repo';
import users from '@/seed_json/user.json';

describe('User Repository', () => {
  describe('listUser', () => {
    it('should return a list of users', async () => {
      const userList = await listUser();
      expect(userList).toBeDefined();
      expect(Array.isArray(userList)).toBe(true);
      expect(userList.length).toBeGreaterThan(0);
      expect(userList[0].id).toBe(users[0].id);
      expect(userList[0].name).toContain(users[0].name);
      expect(userList[0].credentialId).toBe(users[0].credentialId);
    });
  });

  describe('getUserById', () => {
    it('should return a user by their ID', async () => {
      const userId = users[0].id;
      const user = await getUserById(userId);
      expect(user).toBeDefined();
      expect(user).toBeTruthy();
      expect(user!.id).toBe(userId);
      expect(user!.name).toContain(users[0].name);
    });

    it('should return null if the user is not found', async () => {
      const userId = -1; // Assuming -1 is an invalid ID
      const user = await getUserById(userId);
      expect(user).toBeNull();
    });
  });

  describe('getUserByCredential', () => {
    it('should return a user by their credential ID', async () => {
      const { credentialId } = users[0];
      const user = await getUserByCredential(credentialId);
      expect(user).toBeDefined();
      expect(user).toBeTruthy();
      expect(user!.credentialId).toBe(credentialId);
    });

    it('should return null if the user is not found', async () => {
      const credentialId = 'invalid_credential_id';
      const user = await getUserByCredential(credentialId);
      expect(user).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const newUser = {
        name: 'Test User new',
        credentialId: 'test_credential_id_new',
        publicKey: 'test_public_key_new',
        algorithm: 'test_algorithm_new',
        imageUrl: 'test_image_url_new',
      };
      const user = await createUser(
        newUser.name,
        newUser.credentialId,
        newUser.publicKey,
        newUser.algorithm,
        newUser.imageUrl
      );
      await deleteUserById(user.id); // Clean up after test
      expect(user).toBeDefined();
      expect(user.name).toBe(newUser.name);
      expect(user.credentialId).toBe(newUser.credentialId);
    });
  });

  describe('updateUserById', () => {
    it('should update a user by their ID', async () => {
      const userId = users[0].id;
      const newName = 'Updated Test_User_1';
      const user = await updateUserById(userId, newName);
      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
      expect(user.name).toBe(newName);
    });
  });

  describe('deleteUserById', () => {
    it('should delete a user by their ID', async () => {
      const newUser = await createUser(
        'Delete Test User',
        'delete_test_credential_id',
        'delete_test_public_key',
        'delete_test_algorithm',
        'delete_test_image_url'
      );
      const deletedUser = await deleteUserById(newUser.id);
      expect(deletedUser).toBeDefined();
      expect(deletedUser.id).toBe(newUser.id);
    });
  });
});
