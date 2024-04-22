// LRUCache.test.ts
import crypto from 'crypto';
import LRUCache from '../lru_cache'; // Adjust path according to your project structure

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  const hashKey = (key: string) => {
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 20);
  };

  beforeEach(() => {
    cache = new LRUCache<string>(2, 20); // Create a new cache with capacity 2 and hash length 8 for each test
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should store items correctly with hashed keys', () => {
    cache.put('item1', 'inProgress', 'Data for item 1');
    expect(cache.get('item1')).toBe('Data for item 1');
    expect(cache.get(hashKey('item1'))).not.toBe('Data for item 1');
  });

  it('should update existing items with hashed keys', () => {
    cache.put('item1', 'inProgress', 'Data for item 1');
    cache.put('item1', 'success', 'Updated Data for item 1');
    expect(cache.get('item1')).toBe('Updated Data for item 1');
    expect(cache.get(hashKey('item1'))).not.toBe('Updated Data for item 1');
  });

  it('should handle hash collisions correctly', () => {
    // Mock the crypto.createHash to always return the same hash output
    jest.spyOn(crypto, 'createHash').mockImplementation(
      () =>
        ({
          update: () => ({
            digest: () => '12345678', // This fake hash will simulate a collision
          }),
        }) as unknown as ReturnType<typeof crypto.createHash>
    );

    // Put two different items that will now have the same hash
    cache.put('itemX', 'inProgress', 'Data for item X');
    cache.put('itemY', 'inProgress', 'Data for item Y'); // This should replace 'itemX' due to hash collision

    // Test the outcomes to see if the collision was handled as expected
    expect(cache.get('itemX')).toBe('Data for item Y'); // 'itemX' should be replaced by 'itemY' due to collision
    expect(cache.get('itemY')).toBe('Data for item Y');

    // Restore the original implementation of crypto.createHash
    jest.restoreAllMocks();
  });

  it('should follow the LRU policy on cache overflow with hashed keys', () => {
    cache.put('item1', 'inProgress', 'Data for item 1');
    cache.put('item2', 'inProgress', 'Data for item 2');
    cache.put('item3', 'inProgress', 'Data for item 3'); // This should evict item1

    expect(cache.get('item1')).toBeNull(); // 'item1' should be evicted
    expect(cache.get('item2')).toBe('Data for item 2');
    expect(cache.get('item3')).toBe('Data for item 3');
  });

  it('should move recently used items to the front with hashed keys', () => {
    cache.put('item1', 'inProgress', 'Data for item 1');
    cache.put('item2', 'inProgress', 'Data for item 2');
    cache.get('item1'); // Access 'item1' to make it most recently used
    cache.put('item3', 'inProgress', 'Data for item 3'); // This should evict 'item2', not 'item1'

    expect(cache.get('item1')).toBe('Data for item 1');
    expect(cache.get('item2')).toBeNull(); // 'item2' should be evicted
    expect(cache.get('item3')).toBe('Data for item 3');
  });
});
