import { convertTimestampToROCDate } from '@/lib/utils/common';

describe('convertTimestampToROCDate', () => {
  it('should return correct ROC Month', () => {
    const timestamp = 1730736000; // 2024-11-05 utc+8
    const rocDate = convertTimestampToROCDate(timestamp);
    expect(rocDate.month).toBe(11);
    expect(rocDate.year).toBe(113);
    expect(rocDate.day).toBe(5);
  });
  it('should return correct ROC Month', () => {
    const timestamp = 1727712000; // 2024-10-01 utc+8
    const rocDate = convertTimestampToROCDate(timestamp);
    expect(rocDate.month).toBe(10);
    expect(rocDate.year).toBe(113);
    expect(rocDate.day).toBe(1);
  });
});
