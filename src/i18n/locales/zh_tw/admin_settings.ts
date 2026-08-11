export const adminSettings = {
  title: "系統設定",
  subtitle:
    "這些設定保管於資料庫並以超級管理員 Passkey 簽章封存，修改後即刻生效，不需要改 .env 也不需要重啟服務。",
  loading: "載入設定中...",
  load_failed: "載入設定失敗",
  signed_version: "已簽章 v{{version}}",
  source_db: "資料庫",
  source_env: "環境變數",
  source_none: "未設定",
  secret_untouched_hint: "維持原樣即保留目前的值，輸入新值才會覆寫。",
  group: {
    third_party_login: "第三方登入",
    ai: "AI 整合",
    payment: "金流閘道",
  },
  env_only_hint:
    "此項目目前僅存在於環境變數，尚未納入資料庫保管與簽章；儲存後才會受保護。",
  fallback_hint: "未設定，系統目前採用保底值「{{value}}」。",
  history_title: "變更歷史",
  history_version: "版本",
  history_changed: "變更項目",
  history_signed_by: "簽署者",
  history_at: "簽署時間",
  sign_and_save: "簽章並儲存",
  signing: "等待 Passkey 簽章...",
  saving: "儲存中...",
  saved: "設定已更新並完成簽章。",
  save_failed: "儲存失敗",
  sign_hint: "儲存時會要求您以超級管理員 Passkey 對設定內容簽章。",
  vault_provision_btn: "產生並簽署主密鑰",
  vault_provisioned:
    "主密鑰已產生並簽署進 .env，服務正在重啟——請稍候重新整理本頁。",
  vault_already_configured: "已經有可用的主密鑰。",
  vault_provision_failed: "補發主密鑰失敗",
  vault_missing_title: "尚未設定保險庫主密鑰",
  vault_missing_desc:
    "環境變數 SECRET_VAULT_MASTER_KEY 未設定或長度不足，秘密設定無法加密保存（非秘密設定仍可修改）。補設方式：回到部署精靈（/admin/setup）重跑最後的簽章步驟，它會自動產生金鑰、連同 .env 一起簽署並重啟服務。手動編輯 .env 也可以，但會使既有簽章失效，一樣得重新簽署。",
  trust_root_missing_title: "找不到超級管理員信任根",
  trust_root_missing_desc:
    "環境變數 SUPER_ADMIN_CRED_ID / SUPER_ADMIN_PUB_X / SUPER_ADMIN_PUB_Y 不完整，無法驗證設定簽章。資料庫中的設定將暫時停用並退回環境變數。",
};
