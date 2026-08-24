export const teamManagement = {
  title: "團隊管理",
  description: "在此管理您的團隊與成員。",
  create_team: "建立團隊",
  pending_invitations: "待處理的邀請",
  accept_via_fido2: "使用 FIDO2 接受邀請",
  accepting: "處理中...",
  no_teams: "目前沒有任何團隊。",
  /**
   * Info: (20260818 - Luphia) 加席費用的事前揭露（產品回報 20260818）。
   *
   * 付費團隊每邀請一人就會立刻向訂閱那張卡補收期中費用。使用者的原話是
   * 「我在邀請時完全不知道會被加收多少錢」——因此金額要在送出前就講清楚，
   * 而且要說得出「為什麼是這個數字」（幾席、本期還剩幾天）。
   */
  // Info: (20260819 - Luphia) 邀請寄送的冷卻倒數（產品決定 20260819）
  invite_cooldown: {
    notice: "剛剛寄出一封邀請，請等待 {{seconds}} 秒後再寄下一封。",
    button: "請等待 {{seconds}} 秒",
  },
  seat_charge: {
    loading: "正在試算費用…",
    charge_title: "送出後將立即收取 {{amount}}",
    charge_detail:
      "新增 {{seats}} 個席次，依本期剩餘 {{days}} 天按比例計算，向團隊訂閱的付款方式收取。",
    reuse: "本次使用已付費但空出的席次，不會再收費。",
    period_end: "本期即將結束，本次不收費，席次仍會立即生效。",
    free_plan: "免費方案不收席次費用。",
    blocked_title: "目前無法新增成員",
    quote_failed:
      "費用試算失敗。為避免在不知道金額的情況下扣款，請先重新試算。",
    retry: "重新試算",
    submit_with_amount: "確認並支付 {{amount}}",
  },
  invite_member: "邀請成員",
  decline_invite: "拒絕邀請",
  declining: "處理中...",
  revoke_invite: "撤回",
  revoke_invite_hint:
    "撤回這封尚未接受的邀請。已收取的席次費用不退還，但釋出的席次可用於邀請其他人員。",
  // Info: (20260815 - Luphia) email 邀請（規範 §4 / P4）
  invite_method: "邀請方式",
  invite_by_address: "錢包地址",
  invite_by_email: "電子郵件",
  email_address: "電子郵件",
  invite_email_hint:
    "系統會寄出一封含加入連結的邀請信，連結為一次性且 7 天內有效。",
  you: "您",
  pending_invite: "待接受的邀請",
  pending: "等待中",
  account_books: "關聯帳本 (公司)",
  create_new_team: "建立新團隊",
  team_name: "團隊名稱",
  enter_team_name: "輸入團隊名稱",
  cancel: "取消",
  creating: "建立中...",
  web3_address: "Web3 錢包地址",
  role: "角色",
  fido2_requirement: "FIDO2 驗證要求：",
  fido2_requirement_text:
    "您需要透過通行密鑰 (Passkey) 進行驗證並在鏈上簽署此交易。",
  signing: "簽署中...",
  invite_via_fido2: "使用 FIDO2 寄送邀請",
  // Info: (20260818 - Luphia) 以「信箱不符」之邀請加入的成員標記（第三輪 C-2），僅管理職可見
  email_mismatch: "信箱不符",
  email_mismatch_hint:
    "接受邀請的帳號，其已驗證信箱與受邀信箱不同。可能是本人改用其他信箱登入，也可能是邀請連結被轉寄出去。",
  roles: {
    OWNER: "擁有者",
    ADMIN: "管理員",
    EDITOR: "編輯者",
    VIEWER: "檢視者",
  },
  confirm_remove_label: "您確定要移除該成員嗎？",
  alerts: {
    create_success: "成功建立團隊！",
    update_success: "成功更新團隊名稱！",
    invite_success: "邀請發送成功！",
    accept_success: "成功接受邀請！",
    role_success: "成功更新成員角色！",
    remove_success: "成功移除成員！",
    error_create: "建立團隊失敗",
    error_update: "更新團隊名稱失敗",
    error_invite: "邀請成員失敗",
    error_accept: "接受邀請失敗",
    error_role: "變更角色失敗",
    error_remove: "移除成員失敗",
    invalid_address: "無效的 Web3 錢包地址，格式應為 0x 開頭的 42 位字元。",
    invalid_email: "電子郵件格式不正確。",
    invite_email_sent: "邀請信已寄出！",
    free_plan_limit_title: "免費版僅供擁有者一人使用",
    free_plan_limit_hint:
      "要邀請成員請升級為團隊版或企業版；訂閱後依實際人數計費，邀請的成員各自享有完整額度。",
    free_plan_limit_cta: "查看方案",
    seat_charged: "邀請已送出，並已向團隊的付款方式收取 {{amount}}。",
    seat_reused: "已使用既有的付費席次，本次未再收費。",
    revoke_success: "已撤回邀請，該席次可用於邀請其他人員。",
    error_revoke: "撤回邀請失敗",
    decline_success: "已拒絕邀請。",
    error_decline: "拒絕邀請失敗",
  },
  scan_qr_code: "掃描 QR Code",
  scanning: "正在掃描...",
  camera_error: "無法存取相機，請檢查權限設定。",
  // Info: (20260807 - Luphia) 團隊錢包與訂閱額度面板（設計書 §9 P4 前端）
  wallet: {
    title: "團隊錢包與訂閱額度",
    quota_title: "訂閱額度",
    my_quota_title: "您的額度",
    team_total_title: "全隊合計（{{count}} 位成員）",
    load_failed: "無法載入，請稍後再試。",
    retry: "重試",
    quota_5h: "每 5 小時額度",
    quota_week: "每週額度",
    documents_memory_link: "文件與記憶",
    balance_title: "團隊錢包",
    pool_balance: "未分配點數",
    frozen_warning: "團隊錢包已凍結（守恆勾稽異常），請聯繫客服處理。",
    buy_credits: "前往購買點數",
    manage_plan: "管理方案",
    pending_downgrade:
      "已排定於 {{date}} 起改為{{plan}}；在那之前方案與額度維持不變。",
    pending_expire:
      "自動續訂已關閉：當期方案與額度維持到 {{date}}，屆時未再付款即轉為免費版。",
    keep_current_plan: "維持目前方案",
    manage_plan_hint: "額度不足時可升級方案",
    buy_credits_hint: "購買的點數將存入團隊錢包，供管理者分配。",
    allocated_points: "分配點數",
    allocate_to: "分配點數給 {{name}}",
    revoke_from: "自 {{name}} 收回點數",
    amount_label: "點數",
    amount_limit: "可用上限 {{max}} 點",
    allocate: "分配",
    allocate_member: "分配對象",
    allocate_hint: "把未分配的點數分給團隊成員",
    revoke: "收回",
    // Info: (20260814 - Luphia) 分配即鑄到成員的鏈上錢包（ADR 015 修訂）
    /**
     * Info: (20260819 - Luphia) 分配處理中的動畫與提示（產品需求 20260819）。
     * 要說得出「為什麼要等」——鏈上確認需要時間；只說「請稍候」留不住人。
     */
    allocating_title: "正在分配點數，請勿關閉或重新整理此頁",
    allocating_warning:
      "點數正在鑄入該成員的區塊鏈錢包，需要數秒至數十秒完成。此時關閉或重新整理可能讓這筆分配停在「已扣款、尚未確認上鏈」的狀態，需要人工協助處理。",
    allocating_button: "處理中…",
    allocate_onchain_note:
      "分配的點數會直接進入該成員的個人錢包（區塊鏈位址），成員在任何情境都能使用，不限於本團隊，且分配後團隊無法收回。",
    revoke_onchain_note:
      "收回會銷毀該成員錢包中的點數，上限為本團隊累計分配給他的數量；他已經使用掉的部分無法收回。",
    allocation_success: "操作成功。",
    allocation_failed: "操作失敗，請確認餘額後再試。",
    invalid_amount: "請輸入正整數點數。",
  },
};
