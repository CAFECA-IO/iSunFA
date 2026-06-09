export const businessMonitor = {
  title: "Business Monitor Dashboard",
  subtitle:
    "Search financial data of Taiwan public companies, download official shareholder reports, and get deep analysis from our AI assistant",
  filter: {
    ai_consult: "AI Consultation",
    ai_placeholder: "e.g., What is Foxconn's turnover rate?",
    select_company: "Select Company",
    select_industry: "Select Industry",
    all_industries: "All Industries",
    industries: {
      semiconductor: "Semiconductor",
      computer_peripherals: "Computer & Peripherals",
      optoelectronics: "Optoelectronics",
      communications: "Communications/Internet",
      electronic_components: "Electronic Components",
    },
    select_year_range: "Select Year Range",
    all_years: "All Years",
    clear_filters: "Clear Filters",
    search_reports: "Search Reports",
  },
  ai_section: {
    title: "AI Answer",
    data_sources: "Sources:",
    searching: "AI is analyzing semantics and searching for related reports...",
    no_answer:
      "No answers or sources matching your question were found in the existing reports.",
  },
  reports: {
    total_count: "Found {{count}} reports in total",
    loading: "Loading data...",
    no_reports:
      "No reports matching the criteria were found, please adjust your filters.",
    item: {
      verified_by_third_party: "Verified by Third Party",
      report_year: "Report Year:",
      disclosure_period: "Disclosure Period:",
      industry: "Industry:",
      capital_range: "Capital Range:",
      verification_agency: "Verification Agency:",
      verification_standards: "Verification Standards:",
      assurance_agency: "Assurance Agency:",
      assurance_standards: "Assurance Standards:",
      view_details: "View Details",
      downloading: "Downloading...",
      re_download: "Re-download",
      download_original: "Download Original Report",
      download_progress: "Download Progress",
      toast_download_success:
        "{{company}} - Original report downloaded successfully",
      toast_download_error:
        "{{company}} - Download failed, please try again later",
    },
  },
};
