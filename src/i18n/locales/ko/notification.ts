export const notification = {
  aria: "알림",
  /**
   * Info: (20260826 - Julian) 帶未讀數的版本 —— `aria-label` 會**蓋掉**按鈕內容，
   * 包括那顆徽章。固定字串等於讓讀屏使用者永遠聽不到有幾則。
   */
  aria_unread: "알림, 읽지 않음 {{count}}건",
  // Info: (20260826 - Julian) 讀不到時說讀不到，不要退化成「目前沒有通知」
  load_failed: "알림을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요",
  summary: "할 일 {{todos}}건, 작업 완료 알림 {{completed}}건",
  empty: "알림이 없습니다",
  todos_title: "할 일",
  completed_title: "작업 완료",
  team_invitation: "{{inviterName}}님이 팀 {{teamName}}에 초대했습니다",
  wallet_upgrade:
    "멤버십 카드 등 온체인 증명을 받으려면 지갑 업그레이드가 필요합니다",
  // Info: (20260828 - Julian) 일부 완료; 남은 장 수가 「3/14」보다 직관적
  job_resumable:
    "이 가져오기를 이어서 진행할 수 있습니다. {{remaining}}개 장이 남아 있습니다.",
  // Info: (20260828 - Julian) 아직 한 장도 실행하지 않음: 「계속」은 오해를 부름
  job_resumable_fresh: "이 보고서 가져오기를 시작할 수 있습니다.",
  analysis_completed: "분석 작업이 완료되었습니다. 클릭하여 결과를 확인하세요",
  analysis_failed:
    "분석 작업이 실패했습니다. 다시 제출하거나 고객지원에 문의하세요",
  // Info: (20260825 - Julian) 帶報告名稱的版本；取不到名稱時退回上面那句
  analysis_completed_named:
    "「{{title}}」 분석이 완료되었습니다. 클릭하여 결과를 확인하세요",
  analysis_failed_named:
    "「{{title}}」 분석에 실패했습니다. 다시 제출하거나 고객센터에 문의하세요",
  unread: "읽지 않음",
  /**
   * Info: (20260826 - Julian) 由 `has_more_completed` 改名而來。
   *
   * 舊鍵是「還有更多未讀通知」，而面板改成保留已讀之後，那個旗標的意思
   * 變成「歷史超過上限」——於是它會在一個未讀只有 2 則的畫面上宣稱
   * 還有更多未讀，與徽章互相矛盾。改鍵名而不是只改字串：舊鍵留著的話，
   * 沒改到的語系會靜默沿用假話，而改名會讓 `tsc` 直接指出漏掉的那一個。
   */
  history_capped: "최근 {{count}}건만 표시합니다",
  /**
   * Info: (20260902 - Julian) 待辦節被截斷時的說明（review #6742）。
   *
   * **不帶數字，也不說「最近幾則」**：這一節有三個來源（邀請不截斷、可接續
   * 最多 `JOB_RESUMABLE_NOTICE_LIMIT` 筆、入庫待辦最多
   * `NOTIFICATION_TODO_LIST_LIMIT` 筆），而這個旗標只反映中間那一支。初版把
   * 數字寫死成 5，於是 2 封邀請 + 8 份可接續時，畫面列出 7 則、文案說 5、
   * 徽章說 10 —— 三個數字互不相符。「最近」也不成立：被藏起來的是可接續
   * 任務裡最舊的那幾份，而它們仍可能比某封列出來的舊邀請更新。
   *
   * 與 `history_capped` 的差別在此：那一節只有一支查詢，說得出「最近 N 則」；
   * 這一節說得出的只有「還有更多」。要給得出數字，得讓這支端點也數得出全部
   *（多一次 `summarizeResumable` 與未截斷的入庫計數），那是另一個決定。
   */
  todos_capped: "표시되지 않은 할 일이 더 있습니다",
  /**
   * Info: (20260902 - Julian) 截斷要有**出口**，不只有說明（review R3 的 A2）。
   *
   * 原本只有上面那一句純文字：第 6 份可以繼續的匯入起，在鈴鐺與
   * `/user/notifications` 兩個畫面上都不存在，也沒有任何路徑到得了 ——
   * 而被藏起來的正是 `updatedAt` 排最後、等最久的那幾份。
   *
   * 這個模組自己寫下的不變式是「分岔永遠伴隨一個看得見的說明**與一個出口**」，
   * 完成側有（`view_all` → 分頁清單），待辦側先前沒有。
   * 去處是盤查對話清單而不是通知分頁：可接續的匯入本來就一個會話一筆
   *（`@@unique([resourceKey, type])`），那份清單就是完整的待辦清單。
   */
  todos_capped_action: "세션 목록 열기",
  view_all: "전체 알림 보기",
  page_title: "알림",
  history_title: "기록",
  history_empty: "완료 또는 실패한 작업 알림이 아직 없습니다",
  total_items: "총 {{count}}건",
};
