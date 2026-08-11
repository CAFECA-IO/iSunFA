export const adminSettings = {
  title: "System Settings",
  subtitle:
    "These settings live in the database, sealed with a super admin passkey signature. Changes take effect immediately — no .env edit and no restart.",
  loading: "Loading settings...",
  load_failed: "Failed to load settings",
  signed_version: "Signed v{{version}}",
  source_db: "Database",
  source_env: "Environment",
  source_none: "Not set",
  secret_untouched_hint:
    "Leave as-is to keep the current value; type a new one to replace it.",
  group: {
    third_party_login: "Third-party Login",
    ai: "AI Integration",
    payment: "Payment Gateway",
  },
  env_only_hint:
    "This value currently lives only in the environment file. It is not yet stored in the database or covered by the signature — save to bring it under protection.",
  fallback_hint: 'Not configured — the system currently uses "{{value}}".',
  history_title: "Change history",
  history_version: "Version",
  history_changed: "Changed keys",
  history_signed_by: "Signed by",
  history_at: "Signed at",
  sign_and_save: "Sign and save",
  signing: "Waiting for passkey signature...",
  saving: "Saving...",
  saved: "Settings updated and signed.",
  save_failed: "Failed to save",
  sign_hint:
    "Saving asks you to sign the settings content with your super admin passkey.",
  vault_provision_btn: "Generate and sign the master key",
  vault_provisioned:
    "Master key generated and signed into .env. The service is restarting — reload this page in a moment.",
  vault_already_configured: "A master key is already configured.",
  vault_provision_failed: "Failed to provision the master key",
  vault_missing_title: "Secret vault master key not set",
  vault_missing_desc:
    "SECRET_VAULT_MASTER_KEY is missing or too short, so secret settings cannot be encrypted at rest. Non-secret settings can still be changed. To provision it, re-run the final signature step of the deployment wizard (/admin/setup) — it generates the key and signs it together with .env, then restarts the service. Editing .env by hand also works, but invalidates the existing signature and still requires re-signing.",
  trust_root_missing_title: "Super admin trust root not found",
  trust_root_missing_desc:
    "SUPER_ADMIN_CRED_ID / SUPER_ADMIN_PUB_X / SUPER_ADMIN_PUB_Y are incomplete, so setting signatures cannot be verified. Database settings are disabled and the system falls back to environment variables.",
};
