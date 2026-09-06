export const adminSettings = {
  title: "系统设置",
  subtitle:
    "这些设置保管于数据库并以超级管理员 Passkey 签章封存，修改后即刻生效，不需要改 .env 也不需要重启服务。",
  loading: "载入设置中...",
  load_failed: "载入设置失败",
  signed_version: "已签章 v{{version}}",
  source_db: "数据库",
  source_env: "环境变量",
  source_none: "未设置",
  secret_untouched_hint: "维持原样即保留目前的值，输入新值才会覆写。",
  group: {
    third_party_login: "第三方登录",
    ai: "AI 集成",
    payment: "支付网关",
    // Info: (20260815 - Luphia) email 邀請的寄信設定
    mail: "寄信（Email 邀请）",
  },
  env_only_hint:
    "此项目目前仅存在于环境变量，尚未纳入数据库保管与签章；保存后才会受保护。",
  env_shadowed_hint:
    "此项目在环境变量里有值，但**不会被读取**：本部署的设置已由数据库签章保管，环境变量一律不再参照。请在此填入并签章。",
  fallback_hint: "未设置，系统目前采用保底值「{{value}}」。",
  history_title: "变更历史",
  history_version: "版本",
  history_changed: "变更项目",
  history_signed_by: "签署者",
  history_at: "签署时间",
  sign_and_save: "签章并储存",
  signing: "等待 Passkey 签章...",
  saving: "储存中...",
  saved: "设置已更新并完成签章。",
  save_failed: "储存失败",
  sign_hint: "储存时会要求您以超级管理员 Passkey 对设置内容签章。",
  vault_provision_btn: "生成并签署主密钥",
  vault_provisioned:
    "主密钥已生成并签署进 .env，服务正在重启——请稍候刷新本页。",
  vault_already_configured: "已经有可用的主密钥。",
  vault_provision_failed: "补发主密钥失败",
  vault_missing_title: "尚未设置保险库主密钥",
  vault_missing_desc:
    "环境变量 SECRET_VAULT_MASTER_KEY 未设置或长度不足，秘密设置无法加密保存（非秘密设置仍可修改）。补设方式：回到部署向导（/admin/setup）重跑最后的签章步骤，它会自动生成密钥、连同 .env 一起签署并重启服务。手动编辑 .env 也可以，但会使既有签章失效，一样得重新签署。",
  trust_root_missing_title: "找不到超级管理员信任根",
  trust_root_missing_desc:
    "环境变量 SUPER_ADMIN_CRED_ID / SUPER_ADMIN_PUB_X / SUPER_ADMIN_PUB_Y 不完整，无法验证设置签章。数据库中的设置将暂时停用并退回环境变量。",
};
