export const businessMonitor = {
  title: "企業観測所",
  subtitle:
    "台湾の公開企業の財務データを検索し、公式の株主総会年次報告書をダウンロードして、AIアシスタントから詳細な分析を取得します",
  filter: {
    ai_consult: "AI相談",
    ai_placeholder: "例：鴻海の離職率はどれくらいですか？",
    select_company: "企業選択",
    select_industry: "産業分類選択",
    all_industries: "すべての産業",
    industries: {
      semiconductor: "半導体産業",
      computer_peripherals: "コンピュータ・周辺機器産業",
      optoelectronics: "光エレクトロニクス産業",
      communications: "通信・ネットワーク産業",
      electronic_components: "電子部品産業",
    },
    select_year_range: "対象期間選択",
    all_years: "すべての年",
    clear_filters: "検索条件をクリア",
    search_reports: "レポートを検索",
  },
  ai_section: {
    title: "AIの回答",
    data_sources: "情報源：",
    searching: "AIが文脈を分析し、関連するレポートを検索しています...",
    no_answer:
      "既存のレポートに、ご質問に一致する回答や情報源が見つかりませんでした。",
  },
  reports: {
    total_count: "合計 {{count}} 件のレポートが見つかりました",
    loading: "データを読み込み中...",
    no_reports:
      "条件に一致するレポートが見つかりません。検索条件を調整してください。",
    item: {
      verified_by_third_party: "第三者認証取得済み",
      report_year: "レポート年度：",
      disclosure_period: "開示期間：",
      industry: "産業分類：",
      capital_range: "資本金額範囲：",
      verification_agency: "検証機関：",
      verification_standards: "検証基準：",
      assurance_agency: "保証機関：",
      assurance_standards: "保証基準：",
      view_details: "詳細を表示",
      downloading: "ダウンロード中...",
      re_download: "再ダウンロード",
      download_original: "オリジナルレポートをダウンロード",
      download_progress: "進行状況",
      toast_download_success:
        "{{company}} - オリジナルレポートのダウンロードが完了しました",
      toast_download_error:
        "{{company}} - ダウンロードに失敗しました。時間をおいて再度お試しください",
    },
  },
  detail: {
    back_to_list: "リストに戻る",
    report_not_found: "レポートが見つかりません",
    report_details: "レポートの詳細",
    all_company_reports: "この企業のすべてのレポート",
    industry_reports: "同業界のレポート",
    share: "共有",
    download: "ダウンロード",
    download_report: "レポートをダウンロード",
    report_file_suffix: "サステナビリティレポート",
    year_report: "{{year}} 年サステナビリティレポート",
  },
};
