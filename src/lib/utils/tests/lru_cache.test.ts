// LRUCache.test.ts
import LRUCache from '../lru_cache'; // Adjust path according to your project structure

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(2); // Create a new cache with capacity 2 for each test
  });

  it('should store items correctly', () => {
    cache.put('item1', 'inProgress', 'Data for item 1');
    expect(cache.get('item1')).toBe('Data for item 1');
  });

  it('should update existing items', () => {
    cache.put('item1', 'inProgress', 'Data for item 1');
    cache.put('item1', 'success', 'Updated Data for item 1');
    const node = cache.get('item1');

    expect(node).toBe('Updated Data for item 1');
    expect(cache.get('item1')).not.toBe('Data for item 1');
  });

  it('should follow the LRU policy on cache overflow', () => {
    cache.put('item1', 'inProgress', 'Data for item 1');
    cache.put('item2', 'inProgress', 'Data for item 2');
    cache.put('item3', 'inProgress', 'Data for item 3'); // This should evict item1

    expect(cache.get('item1')).toBeNull(); // item1 should be evicted
    expect(cache.get('item2')).toBe('Data for item 2');
    expect(cache.get('item3')).toBe('Data for item 3');
  });

  it('should move recently used items to the front', () => {
    cache.put('item1', 'inProgress', 'Data for item 1');
    cache.put('item2', 'inProgress', 'Data for item 2');
    cache.get('item1'); // Access item1 to make it most recently used
    cache.put('item3', 'inProgress', 'Data for item 3'); // This should evict item2, not item1

    expect(cache.get('item1')).toBe('Data for item 1');
    expect(cache.get('item2')).toBeNull(); // item2 should be evicted
    expect(cache.get('item3')).toBe('Data for item 3');
  });
});
