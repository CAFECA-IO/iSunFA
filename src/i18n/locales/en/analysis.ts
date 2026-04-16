export const analysis = {
  tooltips: {
    industry_development: {
      title: "Industry Development",
      desc: "The analysis level of this module is 'Macro Industry' and 'Meso Supply Chain'. Therefore, keywords should revolve around industry sectors, sub-industries, technological trends, or specific supply chains.",
      sectors_title: "Major Sectors:",
      sectors_desc:
        "Technology, Healthcare, Financials, Consumer Discretionary, Energy.",
      sub_title: "Sub-industries / Supply Chains:",
      sub_desc:
        "Semiconductor Manufacturing, IC Design, EV Batteries, Cloud Infrastructure, Biotechnology.",
      trends_title: "Emerging Trends / Concepts:",
      trends_desc:
        "AI Servers, Silicon Photonics, Solid-State Batteries, Low Earth Orbit Satellites, ESG Green Energy.",
    },
    smart_enterprise_rating: {
      title: "Smart Enterprise Rating",
      desc: "The analysis level of this module is 'Micro Entity', focusing on the financial and credit health check of a single company. Therefore, keywords must be exact company names, stock tickers, or specific ID numbers.",
      us_tickers_title: "US Tickers / Company Names:",
      us_tickers_desc:
        "AAPL or Apple\nNVDA or NVIDIA\nMSFT or Microsoft\nTSLA or Tesla",
      tw_tickers_title: "TW/ADR Tickers:",
      tw_tickers_desc:
        "TSM (TSMC ADR)\n2330 or Taiwan Semiconductor Manufacturing",
      fuzzy_title: "Enterprise Attribute Classification:",
      fuzzy_desc:
        "Sometimes you can also input 'Apple Supply Chain' or 'Tier 1 Auto Parts Suppliers' to filter out target companies for batch ratings.",
      analyst_view_title: "💡 Analyst View:",
      analyst_view_desc:
        "In practice, management often inputs tickers of 'main competitors', 'key suppliers', or 'potential acquisition targets' here to monitor supply chain disruption risks or benchmark financial metrics (e.g., ROE, gross margin) against peers.",
    },
    financial_product_rating: {
      title: "Financial Product Rating",
      desc: "This module targets tradable 'financial assets' and 'investment portfolios'. Keywords should be specific product codes, fund names, or asset classes.",
      etf_title: "Index Funds / ETFs:",
      etf_desc:
        "SPY or VOO (S&P 500 ETF)\nQQQ (Nasdaq 100 ETF)\nTLT (20+ Year Treasury Bond ETF)",
      mutual_funds_title: "Mutual Funds:",
      mutual_funds_desc:
        "Enter specific fund product names, for example: Fidelity Global Technology Fund, AB Global High Yield.",
      bonds_title: "Specific Bonds / Fixed Income:",
      bonds_desc:
        "US 10-Year Treasury, specific corporate bond tickers (e.g., Apple 2030 Corporate Bond), Investment Grade (IG) Bonds, High Yield Bonds / Junk Bonds.",
      derivatives_title: "Commodities / Derivatives:",
      derivatives_desc: "Gold (GLD), Brent Crude, Bitcoin (IBIT).",
      analyst_view_title: "💡 Analyst View:",
      analyst_view_desc:
        "After inputting a keyword here, the system usually generates quantitative risk metrics such as Sharpe Ratio and Max Drawdown. This is crucial for a company's 'Treasury Department' when managing idle funds or allocating hedge positions.",
    },
  },
  company_input: {
    label: "Company Name or Tax ID",
    placeholder: "Enter full name, abbreviation, or Tax ID...",
    searching: "Searching...",
    not_found:
      "Company not found. Please try entering a more complete name or Tax ID.",
    missing_tax_id_desc:
      "This account book ({{name}}) does not have a Tax ID set. Internal data analysis requires a Tax ID. Please set it here:",
  },
  title: "Advisory Analysis",
  desc: "Provide multidisciplinary expert business analysis to help management make informed business decisions.",
  internal_analysis: "Internal Data Analysis",
  external_analysis: "External Analysis",
  history_reports: "History Reports",
  period_type: "Time Unit",
  select_year: "Select Year",
  select_period: "Select Period",
  select_account_book: "Choose from my account books",
  select_from_account_books: "Select Account Book",
  country: "Select Country",
  category: "Select Category",
  keyword: "Keyword",
  enter_keyword: "Enter keyword...",
  period: "Period",
  confirm_cost: "Cost",
  generate: "Generate Report",
  selected_period_desc: "{{value}} ({{type}})",
  insufficient_credits: {
    title: "Insufficient Credits",
    message:
      "You do not have enough credits to perform this analysis. Would you like to purchase more?",
    buy_btn: "Buy Credits",
  },
  time_units: {
    yearly: "Yearly",
    seasonly: "Quarterly",
    monthly: "Monthly",
    weekly: "Weekly",
    daily: "Daily",
  },
  cost_hint: "Cost: {{cost}} Credits",
  confirm_title: "Confirm Analysis",
  confirm_desc:
    "This action will consume credits. Please confirm the details below:",
  confirm_balance: "Balance after payment",
  confirm_action: "Pay & Generate",
  countries: {
    tw: "Taiwan",
    us: "United States",
    cn: "China",
    jp: "Japan",
    kr: "South Korea",
    eu: "Europe",
  },
  categories: {
    balance_sheet: "Balance Sheet",
    cash_flow: "Cash Flow Statement",
    income_statement: "Income Statement",
    irsc: "Intelligent Corporate Rating",
    financial_compliance: "Financial Compliance",
    financial_health: "Financial Health",
    market_trends: "Market Trends",
    industry_development: "Industry Development",
    financial_product_rating: "Financial Product Rating",
    carbon_health_check: "Carbon Health Check",
    net_zero_emissions: "Net Zero Emissions",
  },
  history: {
    title: "Analysis History",
    generated_at: "Generated At",
    type: "Type",
    period: "Period",
    status: "Status",
    actions: "Actions",
    view: "View",
    download: "Download",
    status_types: {
      completed: "Completed",
      processing: "Processing",
      failed: "Failed",
    },
    empty_title: "No Analysis Yet",
    empty_description:
      "Start your journey by generating your first financial analysis report using our advanced AI tools.",
    retry: "Retry",
    retry_confirm_title: "Confirm Retry",
    retry_confirm_desc: "This action will retry the analysis. Are you sure?",
  },
  steps: {
    preparing: "Preparing transaction...",
    signing_payment: "Please sign the payment transaction",
    submitting_payment: "Submitting payment to blockchain...",
    payment_success: "Payment successful!",
    signing_analysis: "Please sign the analysis request",
    analyzing: "Generating analysis report...",
  },
  success: {
    title: "Analysis Request Submitted",
    message:
      "Your request is on-chain. Report generation takes time. Please check progress in the History Reports tab.",
    view_tx: "View Transaction",
  },
  share: {
    button: "Share Report",
    modal_title: "Share Public Report",
    modal_desc:
      'Anyone with this link can view the "anonymized summary" of this report. Confidential amounts and detailed supplier information are securely hidden by the system.',
    copy: "Copy",
    copied: "Copied to clipboard",
    revoke: "Revoke Share Link",
    revoked: "Share link successfully revoked",
    done: "Done",
    public_badge: "Public Summary Report",
    shared_by: "Shared by {{name}}",
    security_intercept: "Security Intercept",
    security_desc:
      "This type of report is not available for public sharing, or the data format is invalid.",
    cta_title:
      "Want to generate a comprehensive analysis report for your enterprise?",
    cta_desc:
      "iSunFA uses cutting-edge AI to provide smart accounting solutions including Carbon Health Checks, Financial Ratings, and Compliance Audits.",
    cta_button: "Discover iSunFA Smart Accounting",
  },
};
