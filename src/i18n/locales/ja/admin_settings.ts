export const adminSettings = {
  title: "システム設定",
  subtitle:
    "これらの設定はデータベースに保管され、スーパー管理者のパスキー署名で封印されます。変更は即座に反映され、.env の編集も再起動も不要です。",
  loading: "設定を読み込んでいます...",
  load_failed: "設定の読み込みに失敗しました",
  signed_version: "署名済み v{{version}}",
  source_db: "データベース",
  source_env: "環境変数",
  source_none: "未設定",
  secret_untouched_hint:
    "そのままにすると現在の値を保持します。新しい値を入力すると上書きされます。",
  group: {
    third_party_login: "サードパーティログイン",
    ai: "AI 連携",
    payment: "決済ゲートウェイ",
    // Info: (20260815 - Luphia) email 邀請的寄信設定
    mail: "メール送信（招待）",
  },
  env_only_hint:
    "この項目は現在環境変数にのみ存在し、データベース保管と署名の対象にはなっていません。保存すると保護対象になります。",
  env_shadowed_hint:
    "この値は環境ファイルにありますが、読み込まれていません。この環境の設定はデータベースで署名管理されており、環境変数は一切参照されません。ここに入力して署名してください。",
  fallback_hint:
    "未設定です。現在はフォールバック値「{{value}}」を使用しています。",
  history_title: "変更履歴",
  history_version: "バージョン",
  history_changed: "変更項目",
  history_signed_by: "署名者",
  history_at: "署名日時",
  sign_and_save: "署名して保存",
  signing: "パスキー署名を待っています...",
  saving: "保存中...",
  saved: "設定を更新し、署名しました。",
  save_failed: "保存に失敗しました",
  sign_hint:
    "保存時にスーパー管理者のパスキーで設定内容への署名を求められます。",
  vault_provision_btn: "マスターキーを生成して署名",
  vault_provisioned:
    "マスターキーを生成し .env に署名しました。サービスを再起動しています。しばらくしてからページを再読み込みしてください。",
  vault_already_configured: "利用可能なマスターキーが既に設定されています。",
  vault_provision_failed: "マスターキーの発行に失敗しました",
  vault_missing_title: "シークレット保管庫のマスターキーが未設定です",
  vault_missing_desc:
    "SECRET_VAULT_MASTER_KEY が未設定または短すぎるため、シークレット設定を暗号化して保存できません（シークレット以外の設定は変更可能です）。設定方法：デプロイウィザード（/admin/setup）の最後の署名ステップをもう一度実行してください。キーが自動生成され、.env とともに署名されてサービスが再起動します。.env を手動で編集することもできますが、既存の署名が無効になるため再署名が必要です。",
  trust_root_missing_title: "スーパー管理者のトラストルートが見つかりません",
  trust_root_missing_desc:
    "SUPER_ADMIN_CRED_ID / SUPER_ADMIN_PUB_X / SUPER_ADMIN_PUB_Y が不完全なため、設定署名を検証できません。データベースの設定は一時的に無効となり、環境変数にフォールバックします。",
};
