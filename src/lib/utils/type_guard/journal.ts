import { JOURNAL_EVENT } from '@/constants/journal';

export function isJournalEvent(event: unknown): event is JOURNAL_EVENT {
  return typeof event === 'string' && Object.values(JOURNAL_EVENT).includes(event as JOURNAL_EVENT);
}

export function assertIsJournalEvent(event: unknown): asserts event is JOURNAL_EVENT {
  if (!isJournalEvent(event)) {
    throw new Error(`Invalid journal event: ${event}`);
  }
}

export function convertStringToJournalEvent(event: unknown): JOURNAL_EVENT {
  assertIsJournalEvent(event);
  return event;
}
