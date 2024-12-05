import { getTimestampNow, getTimestampOfLastSecondOfDate } from '@/lib/utils/common';

export const todoListPostApiUtils = {
  /**
   * Info: (20241205 - Murky)
   * @note 這個是暫時解法，把startTime, endTime先放在note裡面，等待資料庫更新之後再更改
   */
  combineStartEndTimeInNote: (options: {
    note: string | null;
    startTime: number;
    endTime: number;
  }) => {
    const { note, startTime, endTime } = options;
    return `${startTime}-${endTime}-${note || ''}`;
  },
};

export const todoListGetListApiUtils = {
  /**
   * Info: (20241205 - Murky)
   * @note 這個是暫時解法，把startTime, endTime先放在note裡面，等待資料庫更新之後再更改
   */
  splitStartEndTimeInNote: (note: string | null) => {
    const result = {
      startTime: getTimestampNow(),
      endTime: getTimestampOfLastSecondOfDate(getTimestampNow()),
      note: '',
    };

    if (note) {
      const [startTime, endTime, ...noteRemain] = note.split('-');

      const originNote = noteRemain.join('-');
      result.startTime = parseInt(startTime, 10);
      result.endTime = parseInt(endTime, 10);
      result.note = originNote;
    }

    return result;
  },
};
