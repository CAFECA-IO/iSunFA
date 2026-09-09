export const calculator = {
  header: {
    main_title: "Salary Calculator",
    calculator: "Calculator",
    pay_slip: "My Pay Slip",
    employee_list: "Employee List",
    how_it_works: "How It Works",
    login: "Login",
    logout: "Logout",
  },
  tabs: {
    completed: "Completed",
    basic_info: "Basic Info",
    base_pay: "Base Pay",
    work_hours: "Work Hours",
    others: "Others",
    calculator: "Calculator",
    pay_slip: "Pay Slip",
  },
  basic_info_form: {
    employee_name: "Employee Name",
    employee_name_placeholder: "Enter employee name",
    full_time: "Full-time",
    part_time: "Part-time",
    employee_number: "Employee Number",
    employee_number_placeholder: "Enter employee number",
    tax_residency_status: "Tax Residency Status",
    residency_option_taiwan: "Taiwan Resident",
    residency_option_non_taiwan: "Non-Taiwan Resident",
    date_from_employee: "From employee record",
    industry_category: "Industry Category",
    year: "Year",
    month: "Month",
    payroll_days_base: "Payroll Days Base",
    payroll_days_base_hint: "If not specified, it will default to 30 days.",
    payroll_option_fixed: "Fixed 30 days",
    payroll_option_actual: "Actual Calendar Days",
    joined_this_month_1: "Joined This Month",
    joined_this_month_2: "On",
    left_this_month: "Left This Month",
  },
  base_pay_form: {
    base_salary: "Base Salary (Taxable)",
    meal_allowance: "Meal Allowance (Non-taxable)",
    other_allowance_with_tax: "Other Allowance (Taxable)",
    other_allowance_without_tax: "Other Allowance (Non-taxable)",
    additional_information:
      "Travel, injury, funeral, retirement pay, social insurance benefits, or government grants",
  },
  work_hours_form: {
    overtime_hour_without_tax: "Overtime Hour (Non-taxable)",
    overtime_hour_with_tax: "Overtime Hour (Taxable)",
    leave_hour: "Leave & Payout",
    sick_menstrual_leave: "Sick / Menstrual Leave",
    personal_leave: "Personal Leave",
    leave_payout_hours: "Leave Payout Hours",
    total_leave_hour: "Total Leave Hour",
    total_overtime_hour: "Total Overtime Hour",
  },
  others_form: {
    labor_coverage_status: "Labor Coverage Status",
    option_labor_insurance: "Labor Insurance",
    option_nhi: "NHI",
    option_labor_pension: "Labor Pension",
    number_of_dependents: "Number of Dependents",
    nhi_back_premium: "NHI Back Premium",
    other_adjustments: "Other Adjustments (Reimbursement / Extra Deduction)",
    voluntary_pension_contribution: "Voluntary Pension Contribution",
  },
  employee_list: {
    issue_name_required: "Enter the employee name under Identity",
    issue_number_required: "Enter the employee number under Identity",
    issue_base_salary_required: "Enter the base salary under Pay",
    section_identity: "Identity",
    section_pay: "Pay",
    section_insurance: "Insurance & pension",
    section_other: "Other",
    other_allowance_taxable: "Other allowance (taxable)",
    other_allowance_tax_free: "Other allowance (tax-free)",
    other_allowance_hint:
      "This is the recurring monthly allowance. Enter one-off bonuses in the calculator instead — anything set here carries over to next month.",
    voluntary_pension_rate: "Voluntary pension contribution",
    employment_type: "Employment type",
    hire_date: "Hire date",
    resign_date: "Resignation date",
    date_order_error: "Resignation date cannot be earlier than the hire date",
    effective_month: "Effective from",
    effective_month_hint:
      "This is the payroll month the change applies from, not today's date. Change it when recording a past adjustment or one that starts later.",
    change_reason: "Reason",
    change_reason_placeholder:
      "e.g. annual review, promotion, insurance bracket",
    field_labels: {
      baseSalary: "Base salary",
      mealAllowance: "Meal allowance",
      otherAllowanceTaxable: "Other allowance (taxable)",
      otherAllowanceTaxFree: "Other allowance (tax-free)",
      isForeignWorker: "Non-resident",
      baseSalary30Days: "Fixed 30-day month",
      isLaborInsured: "Labor insurance",
      isHealthInsured: "Health insurance",
      isPensionInsured: "Pension",
      industryCode: "Industry",
      dependentsCount: "Dependents",
      voluntaryPensionRate: "Voluntary pension rate",
      hireDate: "Hire date",
      resignDate: "Resignation date",
      leaveStartDate: "Leave of absence start",
      leaveEndDate: "Return-to-work date",
      name: "Name",
      number: "Employee no.",
      email: "Email",
      employmentType: "Employment type",
    },
    field_true: "Yes",
    field_false: "No",
    action_create: "Created",
    action_update: "Changed",
    action_delete: "Removed",
    timing_backdated: "Recorded late",
    timing_scheduled: "Scheduled ahead",
    history_title: "Salary change history",
    history_loading: "Loading…",
    history_load_failed:
      "Could not load the change history. Please try again later.",
    history_load_more: "Load older entries",
    history_empty: "No salary changes recorded for this employee yet",
    history_empty_filtered:
      "No changes recorded for the selected fields. Try selecting more.",
    history_field_filter: "Show changes to these fields only",
    history_since:
      "This history starts on {{date}}. Changes made before then were not recorded — for earlier terms, see the inputs on each month's payroll record.",
    history_no_record_yet:
      "No salary changes have been recorded for this employee since this feature shipped. For earlier terms, see the inputs on each month's payroll record.",
    history_count: "Showing {{shown}} of {{total}}",
    recorded_by: "Recorded by {{name}} on {{at}}",
    unknown_user: "Unknown user",
    history: "History",
    leave_start_date: "Leave start date",
    leave_end_date: "Return-to-work date",
    leave_hint:
      "Leave without pay: months fully inside this range are not expected to have a pay slip. Enter the first day of leave and the first day back at work — those two months still count, because the employee worked part of them. Leave the return date empty if they have not returned yet.",
    leave_order_error:
      "Return-to-work date cannot be earlier than the leave start date",
    leave_start_required: "Enter the leave start date as well",
    main_title: "Employee List",
    name: "Employee Name",
    number: "Employee Number",
    email: "Email",
    search_placeholder: "Search Employee",
    add_employee: "Add New Employee",
    edit_employee: "Edit Employee",
    name_placeholder: "Please enter employee name",
    number_placeholder: "Please enter employee number",
    email_placeholder: "Please enter employee email",
    email_valid: "Please enter a valid email address",
    add_success_toast: "Employee added successfully",
    edit_success_toast: "Employee data updated successfully",
    base_salary: "Base salary",
    total_count: "{{count}} employees",
    filtered_count: "{{count}} of {{total}} employees",
    empty_title: "No employees in this account book yet",
    empty_desc:
      "Once an employee exists, the calculator can fill in their base salary and meal allowance, and results can be saved as payroll records.",
    no_search_result: 'No employee matches "{{keyword}}"',
    clear_search: "Clear search",
    load_failed: "Could not load the employee list. Please try again later.",
    save_failed: "Could not save. Please try again later.",
    remove_failed: "Could not remove. Please try again later.",
    number_taken: "That employee number is already used by another employee",
    save_changes: "Save changes",
    remove_employee_records_kept:
      "Payroll records already saved for this employee are kept and stay viewable — they will just no longer appear in the employee list or the calculator picker.",
    remove_employee_title: "Remove Employee",
    remove_employee_content:
      "Are you sure you want to remove {{name}} from the employee list?",
    remove_employee_submit_btn: "Yes, Remove Employee",
    no_email: "Not set",
    missing_records_badge: "{{count}} month(s) missing",
    no_filter_result: "No employee matches the current filter",
    missing_records_rest: "{{count}} more months",
    no_hire_date: "Not set",
    filter_missing_email: "No email address",
    filter_missing_hire_date: "No hire date",
    /**
     * Info: (20260907 - Julian) 這一句在 UI 重構時被從五個語系刪掉了，
     * 而 `employee_list_issue_filters.tsx` 仍然在讀它 ——
     * 畫面上會直接顯示 `calculator.employee_list.missing_hire_date_banner`
     * 這串原始鍵。原文照 `7ebdc4a33` 還原（`i18n_keys.test.ts` 抓到的）。
     */
    missing_hire_date_banner:
      "{{count}} employee(s) have no hire date — coverage cannot be checked for them until it is filled in",
    filter_missing_records: "Missing pay slip records",
  },
  result: {
    base_salary_with_tax: "Base Salary (Taxable)",
    overtime_pay_with_tax: "Overtime Pay (Taxable)",
    other_allowance_with_tax: "Other Allowance (Taxable)",
    total_salary_with_tax: "Total Salary (Taxable)",
    meal_allowance_without_tax: "Meal Allowance (Non-taxable)",
    overtime_pay_without_tax: "Overtime Pay (Non-taxable)",
    other_allowance_without_tax: "Other Allowance (Non-taxable)",
    leave_salary_without_tax: "Leave Payout (Non-taxable)",
    total_salary_without_tax: "Total Salary (Non-taxable)",
    total_monthly_salary: "Total Monthly Salary",
    employee_paid_labor_insurance: "Employee Paid Labor Insurance",
    employee_paid_health_insurance: "Employee Paid Health Insurance",
    health_insurance_additional_premium: "Health Insurance Additional Premium",
    voluntary_pension_contribution: "Voluntary Pension Contribution",
    withheld_income_tax: "Withheld Income Tax",
    withheld_second_generation_nhi_premium:
      "Withheld Second Generation NHI Premium",
    leave_deduction_with_tax: "Leave Deduction (Taxable)",
    leave_deduction_without_tax: "Leave Deduction (Non-taxable)",
    other_deductions_adjustments: "Other Deductions/Adjustments",
    total_deductions: "Total Deductions",
    health_insurance_salary_bracket: "Health Insurance Salary Bracket",
    labor_insurance_salary_bracket: "Labor Insurance Salary Bracket",
    employment_insurance_salary_bracket: "Employment Insurance Salary Bracket",
    occupational_injury_insurance_salary_bracket:
      "Occupational Injury Insurance Salary Bracket",
    labor_pension_salary_bracket: "Labor Pension Salary Bracket",
    occupational_injury_industry_rate: "Occupational Injury Industry Rate",
    insured_salary: "Insured Salary",
    employer_paid_labor_insurance: "Employer Paid Labor Insurance",
    employer_paid_health_insurance: "Employer Paid Health Insurance",
    employer_paid_pension_contribution: "Employer Paid Pension Contribution",
    company_burden_occupational_accident_insurance:
      "Employer Paid Occupational Accident Insurance",
    monthly_pay: "Monthly Pay",
    total_employer_cost: "Total Employer Cost",
    reported: "Reported",
    paid: "Paid",
    hide_values: "Hide amounts",
    show_values: "Show amounts",
  },
  warnings: {
    title: "Warning Message",
    salary_below_minimum:
      "Base salary is below the statutory minimum wage ({{minimumWage}})",
    overtime_exceeded:
      "Total overtime hours in a single month exceed the 46-hour statutory limit",
  },
  login_modal: {
    title: "Please Login in",
    content: "You need to log in first before using this function.",
    submit: "Go to Login Page",
  },
  reset_modal: {
    title: "Reset Calculator",
    content:
      "Are you sure you want to reset the calculator? This will clear all entered data.",
    submit: "Yes, Reset All",
  },
  sending_pay_slip_modal: {
    title: "Sending Pay Slip",
    content_1: "Are you sure you want to send the",
    content_bold_1: " {{month}} 's pay slip",
    content_2: "to",
    content_bold_2: " {{employeeName}} ?",
    email: "Email",
    submit: "Send Pay Slip",
    email_from_profile: "From employee profile",
    email_missing: "No email address on file",
    sending: "Sending...",
    error_no_email:
      "This employee has no email address. Add one in the employee list first.",
    error_not_configured:
      "Email delivery is not set up yet. Please contact your system administrator.",
    error_font_missing:
      "The server is missing Chinese fonts, so the pay slip cannot be generated. Please contact your system administrator.",
    error_generic: "Could not send the pay slip. Please try again in a moment.",
  },
  my_pay_slip: {
    main_title: "My Pay Slip",
    tab_received: "Pay Slip I Received",
    tab_sent: "Pay Slip I Sent",
    search_placeholder: "Search Pay Slip",
    pay_period: "Pay Period",
    from: "From",
    to: "To",
    net_pay: "Net Pay",
    pay_slip_issued_date: "Pay Slip Issued Date",
    action: "Action",
    pay_slip: "Pay Slip",
    sent_on: "Sent On",
    all: "All",
    employee: "Employee",
    sent_by: "Sent by",
    unknown_sender: "Unnamed",
    sent_empty: "No pay slip has been sent from this account book yet",
    sent_load_failed:
      "Could not load the delivery history. Please refresh and try again",
  },
  // Info: (20260831 - Julian) Entry point from the public calculator to the account book one
  // Info: (20260831 - Julian) The employee link shown in Step 1 of the calculator
  employee_link: {
    linked_hint:
      "Linked to an employee — base salary and meal allowance filled in",
    unlink: "Unlink",
  },
  // Info: (20260831 - Julian) Saving from the calculator page, plus its two exceptions
  save_record: {
    profile_diff_reason:
      "Reason (optional; recorded only when the employee is updated)",
    profile_diff_reason_placeholder:
      "e.g. annual review, promotion, insurance bracket",
    profile_diff_title: "Update the employee record too?",
    profile_diff_content:
      'The calculator settings differ from the employee record for "{{name}}". Here is what changed:',
    profile_diff_hint:
      'This payroll record is saved with the calculator values either way. The question is only whether the employee record should change as well. Choose "Save this one only" to leave it untouched.',
    profile_diff_update_btn: "Update employee and save",
    profile_diff_skip_btn: "Save this one only",
    profile_diff_failed:
      "Could not update the employee. Please try again later.",
    profile_value_on: "Yes",
    profile_value_off: "No",
    profile_value_none: "Not set",
    save: "Save payroll record",
    saving: "Saving…",
    saved: "Saved as {{name}}'s payroll record for {{month}}/{{year}}",
    view_record: "View",
    save_failed: "Could not save. Please try again later.",
    overwrite_title: "Overwrite the existing payroll record?",
    overwrite_content:
      "{{name}} already has a record for {{month}}/{{year}} (net pay {{amount}}). Saving replaces it and the old figures are not kept.",
    overwrite_submit: "Overwrite and save",
    unlinked_title: "Who is this calculation for?",
    unlinked_content: "This calculation isn't linked to an employee yet.",
    create_and_save: 'Add "{{name}}" and save',
    create_and_save_hint:
      "Creates the employee from the name, employee number and base salary on the calculator",
    pick_from_list: "Pick from the employee list",
    pick_from_list_hint: "This calculation will link to the employee you pick",
    save_to_existing: "Save to {{name}} instead",
    save_to_existing_hint:
      "Uses the employee this number already belongs to, without creating a new one",
    unlinked_conflict_content:
      "Employee number {{number}} already belongs to \u201c{{existingName}}\u201d. It cannot be used for a new employee.",
    edit_number: "Fix the employee number",
    edit_number_hint:
      "Takes you back to step 1 if \u201c{{name}}\u201d should have a different number",
    fill_number: "Fill in the employee number",
    fill_number_hint:
      "An employee number is required. Takes you back to step 1 to add one.",
  },
  // Info: (20260831 - Julian) Payroll records
  records: {
    base_salary_delta_inline: "{{sign}}{{amount}} vs month {{month}}",
    base_salary_delta_title: "Base salary change in {{year}}-{{month}}",
    base_salary_delta_vs: "compared with {{year}}-{{month}}",
    base_salary_no_change_record:
      "This month's base salary differs from the previous record, but there is no matching change on the employee's profile. Edit the employee from the employee list and set the effective month to {{year}}-{{month}}.",
    base_salary: "Base salary",
    base_salary_change_aria:
      "View the base salary change for {{year}}-{{month}}",
    base_salary_change_title: "Base salary change effective {{year}}-{{month}}",
    base_salary_change_count:
      "{{count}} base salary changes took effect this month; the figure above is the net change.",
    base_salary_change_recorded: "Recorded",
    base_salary_change_full_history: "View full salary history",
    base_salary_mismatch:
      "This month's payroll was calculated with a base salary of {{used}}, which does not match the {{changed}} recorded by the change. If this payroll should use the new figure, recalculate and save it again.",
    main_title: "Payroll records",
    pay_period: "Pay period",
    pay_period_value: "{{month}}/{{year}}",
    employee: "Employee",
    net_pay: "Net pay",
    taxable: "Withholding statement",
    action: "Send/View/Recalculate/Delete",
    view: "View payslip",
    load_back: "Load into calculator",
    delete: "Delete",
    all_employees: "All employees",
    total_count: "{{count}} records",
    empty_title: "No payroll records yet",
    empty_desc:
      'Finish a calculation and press "Save payroll record" — it will show up here.',
    load_failed: "Could not load payroll records. Please try again later.",
    search_placeholder: "Search by employee name or number",
    clear_search: "Clear search",
    no_result_title: "No payroll records match these filters",
    period: "Period",
    all_periods: "All periods",
    no_result_desc: "Try a different keyword, employee or pay period.",
    delete_title: "Delete payroll record",
    delete_content:
      'Delete the {{month}}/{{year}} payroll record for "{{name}}"?',
    delete_irreversible:
      "Payroll records are not soft-deleted. Once removed, this record cannot be restored or recovered from anywhere else.",
    delete_submit_btn: "Delete",
    delete_failed: "Could not delete the record. Please try again later.",
    view_failed: "Could not load the payslip. Please try again later.",
    load_back_failed:
      "Could not load this record into the calculator. Please try again later.",
    employee_list_failed:
      "Could not load the employee list. Loading a record into the calculator cannot link it to an employee right now.",
    load_back_unlinked:
      "This employee is no longer on the list. The name and number were filled in from this record, but no employee link was made — you will be asked who to save it for.",
    delivery_status: "Delivery",
    not_sent: "Not sent",
    select_page: "Select all rows on this page",
    select_row: "Select this record",
    selected_count: "{{count}} selected",
    export_csv: "Export CSV",
    export_too_many: "At most {{max}} records per export — deselect some first",
    export_failed: "Export failed. Please try again in a moment.",
  },
  access: {
    checking: "Checking your permissions…",
    check_failed:
      "We could not check your role in this account book. Please try again later.",
    denied_title: "Payroll is not available to you in this account book",
    denied_desc:
      "The calculator, payroll records and employee list are open to the account book's owners and editors. Your role here is view-only, so this section is hidden. Ask an owner to change your role if you need access.",
    denied_public_link: "Use the public salary calculator instead",
  },
  account_book_entry: {
    title: "Want to keep this calculation?",
    hint_save:
      "The account book version saves payroll records and manages your employee list.",
    hint_select:
      "You pick an account book first; the data is stored under that book.",
    hint_no_carry:
      "What you entered here will not carry over — you will need to enter it again.",
    button: "Go to the account book calculator",
  },
  button: {
    disabled_hint:
      "Finish all four steps before downloading or saving the payslip",
    download: "Download as PNG",
    send: "Send Pay Slip",
    reset: "Reset",
    re_send: "Resend Pay Slip",
    send_disabled_unsaved:
      "Save the salary record first, then you can send the pay slip",
    send_disabled_unlinked:
      "This calculation is no longer linked to an employee. Please select one again.",
    send_disabled_no_email:
      "This employee has no email address — add one in the employee list first",
    send_disabled_employee_gone:
      "This employee is no longer on the list — the pay slip cannot be sent",
    send_disabled_loading: "Checking the employee list...",
  },
  message: {
    send_pay_slip_success_title: "Pay slip sent",
    send_pay_slip_success_content:
      "The {{month}} pay slip was sent to {{name}} ({{email}}).",
    name_error_title: "Employee’s Name is not Filled",
    name_error_content:
      "You need to enter the employee’s name before you go to next step",
    salary_error_title: "Base Salary is not Filled",
    salary_error_content:
      "Base Salary must be greater than or equal to the minimum wage.",
    re_send_pay_slip_title: "Resend Pay Slip",
    re_send_pay_slip_content_1: "You have already sent",
    re_send_pay_slip_content_bold_1: " {{month}} 's pay slip",
    re_send_pay_slip_content_2: "to",
    re_send_pay_slip_content_bold_2: " {{name}}",
    re_send_pay_slip_content_3: " . Do you want to resend it?",
    re_send_pay_slip_cancel_btn: "No, Cancel",
    re_send_pay_slip_submit_btn: "Yes, Resend Pay Slip",
    re_send_pay_slip_success_title: "Pay Slip Sent Successfully!",
    re_send_pay_slip_success_content:
      "The pay slip has been successfully sent to the employee's email.",
  },
  operating_mechanism: {
    main_title: "Salary Calculator Operating Mechanism",
  },
};
