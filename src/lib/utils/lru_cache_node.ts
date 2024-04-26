// Info Murky (20240422) THis class is node for LRU cache

import { AccountProgressStatus } from '@/interfaces/account';

export default class LRUNode<T> {
  key: string;

  status: AccountProgressStatus;

  value: T | null;

  prev: LRUNode<T> | null;

  next: LRUNode<T> | null;

  constructor(key: string, status: AccountProgressStatus, value: T | null) {
    this.key = key;
    this.status = status;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}
