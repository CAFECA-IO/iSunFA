export const purchaseTarget = {
  subscription_title: "訂閱給哪個團隊",
  credits_title: "點數存入哪裡",
  seat_breakdown: "{{seats}} 席 × NT$ {{unit}} ＝ NT$ {{total}}",
  extension_note:
    "「{{team}}」目前的訂閱期間至 {{date}}。本次購買的期間將自該日起算並累加，當期剩餘天數不會消失（若為升級，新方案自付款完成起立即適用）。訂閱剩餘 30 天內才能購買延長。",
  extension_too_early_note:
    "「{{team}}」目前的訂閱期間至 {{date}}。剩餘天數尚多，暫不開放購買同方案的延長——請於到期前 30 天內再延長；升級方案不受此限制，隨時可以進行。",
  upgrade_credit_note:
    "「{{team}}」目前的訂閱期間至 {{date}}。升級自付款完成起立即生效，舊方案剩餘期間不會消失：將按已付金額折抵為新方案的天數，加在新期間之後。",
  pending_downgrade_note:
    "「{{team}}」已排定於 {{date}} 起降級為{{plan}}。本次購買完成後，該降級將取消。",
  seat_note: "席次以團隊目前人數計算；實際收費金額以結帳當下的人數為準。",
  // Info: (20260814 - Luphia) 沒有團隊可選時要說出是哪一種沒有（載入中／失敗／過期／無權限）
  session_expired: "登入已過期，請重新登入後再選擇團隊。",
  teams_loading: "正在載入你的團隊⋯⋯",
  teams_failed: "team 清單載入失敗，請重試。",
  team: "團隊",
  personal: "個人",
  select_team: "請選擇團隊",
  single_team: "將套用於「{{team}}」",
  multi_team_hint: "你隸屬多個團隊，請選擇這筆消費要記在哪一個團隊。",
  team_required: "請先選擇團隊，再進行付款。",
  personal_hint: "點數存入你的個人帳戶，可用於任何未綁定團隊的功能。",
  no_owner_team:
    "訂閱需由團隊擁有者操作。你目前不是任何團隊的擁有者，請改請擁有者訂閱，或先建立團隊。",
  no_manager_team:
    "購買團隊點數需要團隊擁有者或管理員權限。你目前沒有可管理的團隊，可改為購買個人點數。",
};
