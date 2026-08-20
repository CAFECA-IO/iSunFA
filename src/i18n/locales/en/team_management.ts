export const teamManagement = {
  title: "Team Management",
  description: "Manage your teams and members here.",
  create_team: "Create Team",
  pending_invitations: "Pending Invitations",
  accept_via_fido2: "Accept via FIDO2",
  accepting: "Accepting...",
  no_teams: "No teams available.",
  // Info: (20260818 - Luphia) Up-front disclosure of the seat charge (user report 20260818)
  // Info: (20260819 - Luphia) Invitation send cooldown (product decision 20260819)
  invite_cooldown: {
    notice:
      "An invitation was just sent. Please wait {{seconds}}s before sending another.",
    button: "Wait {{seconds}}s",
  },
  seat_charge: {
    loading: "Calculating the charge…",
    charge_title: "You will be charged {{amount}} immediately",
    charge_detail:
      "Adding {{seats}} seat(s), prorated over the {{days}} day(s) left in this billing period, on the team's subscription payment method.",
    reuse: "This uses a seat you have already paid for. No new charge.",
    period_end:
      "This billing period is ending, so there is no charge. The seat takes effect immediately.",
    free_plan: "The free plan has no seat charges.",
    blocked_title: "Cannot add a member right now",
    quote_failed:
      "We could not calculate the charge. To avoid charging you an unknown amount, please retry before inviting.",
    retry: "Retry",
    submit_with_amount: "Confirm and pay {{amount}}",
  },
  invite_member: "Invite Member",
  decline_invite: "Decline",
  declining: "Declining…",
  revoke_invite: "Withdraw",
  revoke_invite_hint:
    "Withdraw this pending invitation. The seat fee already charged is not refunded, but the freed seat can be used to invite someone else.",
  // Info: (20260815 - Luphia) email 邀請（規範 §4 / P4）
  invite_method: "Invitation method",
  invite_by_address: "Wallet address",
  invite_by_email: "Email",
  email_address: "Email address",
  invite_email_hint:
    "We will send an invitation email containing a join link. The link is single-use and valid for 7 days.",
  you: "You",
  pending_invite: "Pending Invite",
  pending: "PENDING",
  account_books: "Account Books (Businesses)",
  create_new_team: "Create New Team",
  team_name: "Team Name",
  enter_team_name: "Enter team name",
  cancel: "Cancel",
  creating: "Creating...",
  web3_address: "Web3 Address",
  role: "Role",
  fido2_requirement: "FIDO2 Requirement:",
  fido2_requirement_text:
    "You will be asked to authenticate via Passkey to sign this transaction on-chain.",
  signing: "Signing...",
  invite_via_fido2: "Invite via FIDO2",
  // Info: (20260818 - Luphia) 以「信箱不符」之邀請加入的成員標記（第三輪 C-2），僅管理職可見
  email_mismatch: "email mismatch",
  email_mismatch_hint:
    "The account that accepted this invitation has a verified email different from the invited one. They may have signed in with another email, or the invitation link was forwarded.",
  roles: {
    OWNER: "Owner",
    ADMIN: "Admin",
    EDITOR: "Editor",
    VIEWER: "Viewer",
  },
  confirm_remove_label: "Are you sure you want to remove this member?",
  alerts: {
    create_success: "Team created successfully!",
    update_success: "Team name updated successfully!",
    invite_success: "Invitation sent successfully!",
    accept_success: "Invitation accepted successfully!",
    role_success: "Role updated successfully!",
    remove_success: "Member removed successfully!",
    error_create: "Error creating team",
    error_update: "Error updating team name",
    error_invite: "Error inviting member",
    error_accept: "Error accepting invitation",
    error_role: "Error changing role",
    error_remove: "Failed to remove member",
    invalid_address:
      "Invalid Web3 address. It should start with 0x and be 42 characters long.",
    invalid_email: "That email address is not valid.",
    invite_email_sent: "Invitation email sent!",
    free_plan_limit_title: "The Free plan is for the owner only",
    free_plan_limit_hint:
      "Upgrade to Team or Enterprise to invite members. Subscriptions are billed per seat, and every member you invite gets their own full quota.",
    free_plan_limit_cta: "See plans",
    seat_charged:
      "Invitation sent. {{amount}} was charged to the team's payment method.",
    seat_reused: "An already-paid seat was reused; you were not charged again.",
    revoke_success:
      "Invitation withdrawn. The seat is now available for another invitation.",
    error_revoke: "Failed to withdraw the invitation",
    decline_success: "Invitation declined.",
    error_decline: "Failed to decline the invitation",
  },
  scan_qr_code: "Scan QR Code",
  scanning: "Scanning...",
  camera_error: "Cannot access camera, please check permission settings.",
  // Info: (20260807 - Luphia) Team wallet & subscription quota panel (design doc §9 P4)
  wallet: {
    title: "Team Wallet & Subscription Quota",
    quota_title: "Subscription Quota",
    my_quota_title: "Your quota",
    team_total_title: "Team total ({{count}} members)",
    load_failed: "Unable to load. Please try again.",
    retry: "Retry",
    quota_5h: "Per 5-hour quota",
    quota_week: "Weekly quota",
    documents_memory_link: "Documents & Memory",
    balance_title: "Team Wallet",
    pool_balance: "Unallocated credits",
    frozen_warning:
      "The team wallet is frozen (conservation audit failure). Please contact support.",
    buy_credits: "Buy Credits",
    manage_plan: "Manage plan",
    manage_plan_hint: "Upgrade the plan when the quota runs short",
    buy_credits_hint:
      "Purchased credits go into the team wallet for managers to allocate.",
    allocated_points: "Allocated credits",
    allocate_to: "Allocate credits to {{name}}",
    revoke_from: "Revoke credits from {{name}}",
    amount_label: "Amount",
    amount_limit: "Available: {{max}} credits",
    allocate: "Allocate",
    allocate_member: "Allocate to",
    allocate_hint: "Give unallocated credits to a team member",
    revoke: "Revoke",
    // Info: (20260814 - Luphia) 分配即鑄到成員的鏈上錢包（ADR 015 修訂）
    // Info: (20260819 - Luphia) Allocation progress and warning (product request 20260819)
    allocating_title: "Allocating credits — do not close or refresh this page",
    allocating_warning:
      'The credits are being minted into this member\'s blockchain wallet, which takes a few seconds. Closing or refreshing now may leave the allocation in a "deducted but not confirmed on-chain" state that needs manual follow-up.',
    allocating_button: "Processing…",
    allocate_onchain_note:
      "Allocated credits go straight to the member's own wallet (their blockchain address). They can use them anywhere, not just in this team, and the team cannot take them back afterwards.",
    revoke_onchain_note:
      "Revoking burns credits from the member's wallet, up to what this team has allocated to them. Anything they have already spent cannot be reclaimed.",
    allocation_success: "Done.",
    allocation_failed: "Operation failed. Please check the balance and retry.",
    invalid_amount: "Please enter a positive integer amount.",
  },
};
