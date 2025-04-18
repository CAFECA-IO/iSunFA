const LETTER_POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const TRACK_POOL: string[] = [];

// Info: (20250415 - Luphia) 建立所有字軌組合，排除 'BB'
for (let i = 0; i < LETTER_POOL.length; i += 1) {
  for (let j = 0; j < LETTER_POOL.length; j += 1) {
    const code = LETTER_POOL[i] + LETTER_POOL[j];
    if (code !== 'BB') {
      TRACK_POOL.push(code);
    }
  }
}

const BASE_TRACK = 'VK'; // Info: (20250415 - Luphia) 起始字軌
const BASE_INDEX = TRACK_POOL.indexOf(BASE_TRACK);

const TOTAL_TRACKS_PER_PERIOD = 50;
const BASE_DATE = new Date(2022, 0); // Info: (20250415 - Luphia) 起始時間為 2022 年 1 月

type InvoiceTrack = {
  A: string[];
  B: string[];
  C: string[];
  D: string[];
};

export const getInvoiceTracksByDate = (dateObj: Date): InvoiceTrack => {
  const diffMonths =
    (dateObj.getFullYear() - BASE_DATE.getFullYear()) * 12 +
    (dateObj.getMonth() - BASE_DATE.getMonth());
  // Info: (20250415 - Luphia) 每兩個月為一期
  const cycleIndex = Math.floor(diffMonths / 2);

  const startIndex = (BASE_INDEX + cycleIndex * TOTAL_TRACKS_PER_PERIOD) % TRACK_POOL.length;

  const tracks: string[] = [
    ...TRACK_POOL.slice(startIndex, startIndex + TOTAL_TRACKS_PER_PERIOD),
    ...TRACK_POOL.slice(0, Math.max(0, startIndex + TOTAL_TRACKS_PER_PERIOD - TRACK_POOL.length)),
  ];

  return {
    A: tracks.slice(0, 2),
    B: tracks.slice(2, 6),
    C: tracks.slice(6, 8),
    D: tracks.slice(8, 50),
  };
};
