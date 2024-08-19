import {
  listUser,
  getUserById,
  createUser,
  updateUserById,
  deleteUserByIdForTesting,
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

  describe('createUser', () => {
    it('should create a new user', async () => {
      const newUser = {
        name: 'Test User new',
        fullName: 'test_credential_id_new',
        email: 'test_public_key_new',
        phone: 'test_algorithm_new',
        imageUrl: 'test_image_url_new',
      };
      const user = await createUser(newUser);
      await deleteUserByIdForTesting(user.id); // Clean up after test
      expect(user).toBeDefined();
      expect(user.name).toBe(newUser.name);
      expect(user.email).toBe(newUser.email);
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
});
