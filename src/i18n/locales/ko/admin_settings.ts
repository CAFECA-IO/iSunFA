export const adminSettings = {
  title: "시스템 설정",
  subtitle:
    "이 설정은 데이터베이스에 보관되며 슈퍼 관리자 패스키 서명으로 봉인됩니다. 변경 사항은 즉시 적용되며 .env 수정이나 재시작이 필요하지 않습니다.",
  loading: "설정을 불러오는 중...",
  load_failed: "설정을 불러오지 못했습니다",
  signed_version: "서명됨 v{{version}}",
  source_db: "데이터베이스",
  source_env: "환경 변수",
  source_none: "미설정",
  secret_untouched_hint:
    "그대로 두면 현재 값이 유지되며, 새 값을 입력하면 덮어씁니다.",
  group: {
    third_party_login: "제3자 로그인",
    ai: "AI 연동",
    payment: "결제 게이트웨이",
  },
  env_only_hint:
    "이 항목은 현재 환경 변수에만 존재하며 데이터베이스 보관 및 서명 대상이 아닙니다. 저장하면 보호 대상이 됩니다.",
  fallback_hint:
    '설정되지 않았습니다. 현재 기본값 "{{value}}" 을(를) 사용 중입니다.',
  history_title: "변경 이력",
  history_version: "버전",
  history_changed: "변경 항목",
  history_signed_by: "서명자",
  history_at: "서명 시각",
  sign_and_save: "서명 후 저장",
  signing: "패스키 서명을 기다리는 중...",
  saving: "저장 중...",
  saved: "설정이 업데이트되고 서명되었습니다.",
  save_failed: "저장에 실패했습니다",
  sign_hint: "저장할 때 슈퍼 관리자 패스키로 설정 내용에 서명해야 합니다.",
  vault_provision_btn: "마스터 키 생성 및 서명",
  vault_provisioned:
    "마스터 키를 생성하여 .env에 서명했습니다. 서비스가 재시작 중입니다. 잠시 후 페이지를 새로고침하세요.",
  vault_already_configured: "이미 사용 가능한 마스터 키가 설정되어 있습니다.",
  vault_provision_failed: "마스터 키 발급에 실패했습니다",
  vault_missing_title: "시크릿 저장소 마스터 키가 설정되지 않았습니다",
  vault_missing_desc:
    "SECRET_VAULT_MASTER_KEY가 없거나 너무 짧아 시크릿 설정을 암호화하여 저장할 수 없습니다(시크릿이 아닌 설정은 변경 가능합니다). 설정 방법: 배포 마법사(/admin/setup)의 마지막 서명 단계를 다시 실행하세요. 키가 자동 생성되어 .env와 함께 서명되고 서비스가 재시작됩니다. .env를 직접 편집할 수도 있지만 기존 서명이 무효화되어 다시 서명해야 합니다.",
  trust_root_missing_title: "슈퍼 관리자 신뢰 루트를 찾을 수 없습니다",
  trust_root_missing_desc:
    "SUPER_ADMIN_CRED_ID / SUPER_ADMIN_PUB_X / SUPER_ADMIN_PUB_Y 가 완전하지 않아 설정 서명을 검증할 수 없습니다. 데이터베이스 설정은 일시적으로 비활성화되고 환경 변수로 대체됩니다.",
};
