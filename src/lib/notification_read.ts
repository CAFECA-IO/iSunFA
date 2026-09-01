import {
  TODO_NOTIFICATION_TYPES,
  NotificationType,
} from "@/constants/notification";

/**
 * Info: (20260826 - Julian) 「點一下這則通知，算不算已讀？」（review B3）
 *
 * ## 為什麼要有這條規則，而且只能有一份
 *
 * 面板與 `/user/notifications` 都把整份清單交給同一支 `markOneRead`，
 * 而那支的早退條件是 `item.readAt !== null`。**活算的待辦（團隊邀請）
 * `readAt` 恆為 `null`**，於是它擋不住 —— 點一下邀請會做三件錯事：
 *
 * 1. 扣 `completedCount`，而邀請屬於 `todoCount`：**扣錯桶**
 * 2. `resetBaseline` 把基準降 1，伺服器端總數卻沒變 —— 下一次輪詢
 *    `total > baseline` 成立，鈴鐺**無緣無故搖一次**（D17 的同族：
 *    畫面上每個外顯行為看起來都對）
 * 3. 對合成 id 打 `POST .../invitation:<uuid>/read`，而那個 id 沒有對應的
 *    通知列。順帶每點一次吃掉一格 `NOTIFICATION_WRITE`
 *
 * ## 判準為什麼是「待辦型」而不是「是不是活算的」
 *
 * review 建議以 `derived: boolean` 區分。那修得掉邀請，但**修不掉錢包升級**：
 * 它是入庫的待辦型，今天之所以碰不到，只因為 `NOTIFICATION_LINK_PATH` 給它
 * `null`、渲染成不可點的 `<div>`。而那一欄的註解白紙黑字寫著「有了升級頁面
 * 之後把它填進來」—— 填進去的那一天，同一個缺陷會以更糟的形式回來：
 * 使用者點一下就把一則他還沒處理的待辦標成已讀，而 `dedupeKey` 是永久唯一鍵，
 * 補不回來（計畫書 D1，這整個模組最早修的那一條）。
 *
 * 以型別判，兩種待辦一起擋住。
 *
 * ## 與伺服器端同源
 *
 * `notificationRepo.markReadById` 的 `excludeTypes` 收的也是
 * `TODO_NOTIFICATION_TYPES`。兩邊讀同一份常數，所以「這則能不能被點成已讀」
 * 只有一個答案 —— 前端自己列一份清單的話，就是 B1 那個形狀
 *（查詢端與處置端各答各的）換一個地方重演。
 */
export function canMarkReadByClick(type: string): boolean {
  return !TODO_NOTIFICATION_TYPES.includes(type as NotificationType);
}
