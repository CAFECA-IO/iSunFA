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
  job_resumable:
    "포인트가 충전되었습니다. 가져오기({{completed}}/{{total}})를 이어서 진행할 수 있습니다 — 스마트 온실가스 인벤토리에서 「계속」을 누르세요.",
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
  view_all: "전체 알림 보기",
  page_title: "알림",
  history_title: "기록",
  history_empty: "완료 또는 실패한 작업 알림이 아직 없습니다",
  total_items: "총 {{count}}건",
};
