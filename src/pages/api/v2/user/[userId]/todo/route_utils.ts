import { getTimestampNow, getTimestampOfLastSecondOfDate } from '@/lib/utils/common';

export const todoListPostApiUtils = {
  /**
   * Info: (20241205 - Murky)
   * @note 這個是暫時解法，把startDate, endDate先放在note裡面，等待資料庫更新之後再更改
   */
  combineStartEndTimeInNote: (options: {
    note: string | null;
    startDate: number;
    endDate: number;
  }) => {
    const { note, startDate, endDate } = options;
    return `${startDate}-${endDate}-${note || ''}`;
  },
};

export const todoListGetListApiUtils = {
  /**
   * Info: (20241205 - Murky)
   * @note 這個是暫時解法，把startDate, endDate先放在note裡面，等待資料庫更新之後再更改
   */
  splitStartEndTimeInNote: (note: string | null) => {
    const result = {
      startDate: getTimestampNow(),
      endDate: getTimestampOfLastSecondOfDate(getTimestampNow()),
      note: '',
    };

    if (note) {
      const [startDate, endDate, ...noteRemain] = note.split('-');

      const originNote = noteRemain.join('-');
      result.startDate = parseInt(startDate, 10);
      result.endDate = parseInt(endDate, 10);
      result.note = originNote;
    }

    return result;
  },
};
