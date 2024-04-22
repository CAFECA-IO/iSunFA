// Info Murky (20240422) I need param inside class LRUNode can be override
/* eslint-disable no-param-reassign */
import { AccountProgressStatus } from '@/interfaces/account';
import LRUNode from './lru_cache_node';

export default class LRUCache<T> {
  private cache: Map<string, LRUNode<T>>;

  private capacity: number;

  private most: LRUNode<T>;

  private least: LRUNode<T>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<string, LRUNode<T>>();
    this.most = new LRUNode<T>('', 'inProgress', null);
    this.least = new LRUNode<T>('', 'inProgress', null);
    this.least.next = this.most;
    this.most.prev = this.least;
  }

  // Info Murky (20240422) This method I want to keep with object not static
  // eslint-disable-next-line class-methods-use-this
  private remove(node: LRUNode<T>): LRUNode<T> {
    // Info Murky (20240422) !. means non-null assertion operator
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
    return node;
  }

  // Info Murky (20240422) This method I want to keep with object not static
  // eslint-disable-next-line class-methods-use-this
  private insert(node: LRUNode<T>, target: LRUNode<T>): void {
    node.next = target;
    node.prev = target.prev;
    target.prev!.next = node;
    target.prev = node;
  }

  public get(key: string): T | null {
    if (!this.cache.has(key)) return null;
    const node = this.remove(this.cache.get(key)!);
    this.insert(node, this.most);
    return node.value;
  }

  public put(key: string, status: AccountProgressStatus, value: T | null): void {
    const newNode = new LRUNode<T>(key, status, value);
    if (this.cache.has(key)) {
      this.remove(this.cache.get(key)!);
    }
    this.cache.set(key, newNode);
    this.insert(newNode, this.most);
    if (this.cache.size > this.capacity) {
      const leastNode = this.least.next!;
      this.remove(leastNode);
      this.cache.delete(leastNode.key);
    }
  }
}
