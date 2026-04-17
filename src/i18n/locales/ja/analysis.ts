export const analysis = {
  tooltips: {
    industry_development: {
      title: "産業発展 (Industry Development)",
      desc: "このモジュールの分析レベルは「マクロ産業」と「メソサプライチェーン」です。したがって、キーワードは産業セクター、サブ産業、技術トレンド、または特定のサプライチェーンに焦点を当てるべきです。",
      sectors_title: "主要セクター (Sectors)：",
      sectors_desc:
        "テクノロジー (Technology)、ヘルスケア (Healthcare)、金融 (Financials)、一般消費財 (Consumer Discretionary)、エネルギー (Energy)。",
      sub_title:
        "サブ産業 / サプライチェーン (Sub-industries / Supply Chains)：",
      sub_desc:
        "半導体製造 (Semiconductor Manufacturing)、IC設計 (IC Design)、EVバッテリー (EV Batteries)、クラウドインフラ (Cloud Infrastructure)、バイオテクノロジー (Biotechnology)。",
      trends_title: "新興トレンド / コンセプト (Emerging Trends / Concepts)：",
      trends_desc:
        "AIサーバー (AI Servers)、シリコンフォトニクス (Silicon Photonics)、全固体電池 (Solid-State Batteries)、低軌道衛星 (Low Earth Orbit Satellites)、ESGグリーンエネルギー (ESG Green Energy)。",
    },
    smart_enterprise_rating: {
      title: "スマート企業格付け (Smart Enterprise Rating)",
      desc: "このモジュールの分析レベルは「ミクロ事業体」であり、単一企業の財務および信用状態のチェックに焦点を当てています。キーワードは正確な企業名、ティッカー、または統一事業番号である必要があります。",
      us_tickers_title: "米国株のティッカー / 企業名：",
      us_tickers_desc:
        "AAPL または Apple (アップル)\nNVDA または NVIDIA (エヌビディア)\nMSFT または Microsoft (マイクロソフト)\nTSLA または Tesla (テスラ)",
      tw_tickers_title: "台湾株 / ADR ティッカー：",
      tw_tickers_desc:
        "TSM (TSMC ADR)\n2330 または 台湾積体電路製造 (データベースが対応している場合)",
      fuzzy_title: "企業属性分類 (あいまい検索が対応している場合)：",
      fuzzy_desc:
        "対象企業を絞り込んでバッチ評価を行うために、「Appleサプライチェーン」や「Tier 1 自動車部品サプライヤー」と入力することもできます。",
      analyst_view_title: "💡 アナリストの視点：",
      analyst_view_desc:
        "実務上、経営陣はここで「主要な競合他社」、「主要なサプライヤー」、「潜在的な買収対象」のティッカーを入力して、サプライチェーンの途絶リスクを監視したり、同業他社との財務指標（ROEや粗利益率など）のベンチマーキングを行ったりします。",
    },
    financial_product_rating: {
      title: "金融商品格付け (Financial Product Rating)",
      desc: "このモジュールは取引可能な「金融資産」および「投資ポートフォリオ」を対象としています。キーワードは具体的な投資信託、商品コード、ファンド名、または資産クラスである必要があります。",
      etf_title: "インデックスファンド / ETF (ETFs)：",
      etf_desc:
        "SPY または VOO (S&P 500連動)\nQQQ (ナスダック100連動)\nTLT (20年超米国債 ETF)",
      mutual_funds_title: "アクティブファンド (Mutual Funds)：",
      mutual_funds_desc:
        "特定のファンド商品名を入力します。例：Fidelity Global Technology Fund、AB Global High Yield。",
      bonds_title: "特定債券 / 固定収益商品 (Bonds)：",
      bonds_desc:
        "米国10年国債 (US 10-Year Treasury)、特定企業の社債（例：Apple 2030年満期社債）、投資適格社債 (IG Bonds)、ハイイールド債 (High Yield Bonds / Junk Bonds)。",
      derivatives_title:
        "デリバティブ / コモディティ (Commodities / Derivatives)：",
      derivatives_desc:
        "金 (Gold / GLD)、ブレント原油 (Brent Crude)、ビットコイン (Bitcoin / IBIT)。",
      analyst_view_title: "💡 アナリストの視点：",
      analyst_view_desc:
        "キーワードを入力すると、システムは通常、シャープレシオ (Sharpe Ratio) や最大ドローダウン (Max Drawdown) などの定量的リスク指標を生成します。これは企業の「財務部門」が遊休資金（Treasury Management）を管理したり、ヘッジポジションを配置したりする上で非常に重要です。",
    },
  },
  company_input: {
    label: "企業名または法人番号",
    placeholder: "正式名称、略称、または法人番号を入力...",
    searching: "検索中...",
    not_found:
      "企業が見つかりません。より完全な名称または法人番号を入力してください。",
    missing_tax_id_desc:
      "この帳簿（{{name}}）には法人番号が設定されていません。内部データ分析には法人番号が必要です。ここで設定してください：",
  },
  title: "顧問分析",
  desc: "多分野の専門家による企業分析を提供し、経営陣が賢明なビジネス上の意思決定を行えるよう支援します。",
  internal_analysis: "内部データ分析",
  external_analysis: "外部分析",
  history_reports: "履歴レポート",
  period_type: "時間単位",
  select_year: "年を選択",
  select_period: "期間を選択",
  select_account_book: "私のアカウントブックから選択",
  select_from_account_books: "アカウントブックを選択",
  country: "国を選択",
  category: "カテゴリを選択",
  keyword: "キーワード",
  enter_keyword: "キーワードを入力...",
  period: "期間",
  confirm_cost: "コスト",
  generate: "レポート生成",
  selected_period_desc: "{{value}} ({{type}})",
  insufficient_credits: {
    title: "ポイント不足",
    message:
      "この分析を実行するにはポイントが不足しています。ポイントを購入しますか？",
    buy_btn: "ポイント購入",
  },
  time_units: {
    yearly: "年間",
    seasonly: "四半期",
    monthly: "月次",
    weekly: "週次",
    daily: "日次",
  },
  cost_hint: "消費: {{cost}} クレジット",
  confirm_title: "分析レポート生成の確認",
  confirm_desc:
    "この操作にはクレジットが必要です。以下の詳細を確認してください：",
  confirm_balance: "支払い後の残高",
  confirm_action: "支払いして生成",
  countries: {
    tw: "台湾",
    us: "米国",
    cn: "中国",
    jp: "日本",
    kr: "韓国",
    eu: "欧州",
  },
  categories: {
    balance_sheet: "貸借対照表",
    cash_flow: "キャッシュフロー計算書",
    income_statement: "損益計算書",
    irsc: "インテリジェント企業格付け",
    financial_compliance: "財務コンプライアンス",
    financial_health: "財務健全性",
    market_trends: "市場動向",
    industry_development: "産業発展",
    financial_product_rating: "金融商品評価",
    carbon_health_check: "カーボンヘルスチェック",
    net_zero_emissions: "ネットゼロ排出",
  },
  history: {
    title: "分析履歴",
    generated_at: "生成日時",
    type: "タイプ",
    period: "期間",
    status: "ステータス",
    actions: "操作",
    view: "表示",
    download: "ダウンロード",
    status_types: {
      completed: "完了",
      processing: "処理中",
      failed: "失敗",
    },
    empty_title: "分析レポートはまだありません",
    empty_description:
      "高度なAIツールを使用して最初の財務分析レポートを作成し、旅を始めましょう。",
    retry: "再試行",
    retry_confirm_title: "再試行を確認しますか？",
    retry_confirm_desc: "この操作は分析を再試行します。よろしいですか？",
  },
  steps: {
    preparing: "取引の準備中...",
    signing_payment: "支払い取引に署名してください",
    submitting_payment: "支払い取引をブロックチェーンに送信中...",
    payment_success: "支払い成功！",
    signing_analysis: "分析リクエストに署名してください",
    analyzing: "分析レポートを作成中...",
  },
  success: {
    title: "分析リクエストが送信されました",
    message:
      "リクエストはオンチェーンに記録されました。レポートの生成には時間がかかります。履歴レポートタブで進捗を確認してください。",
    view_tx: "トランザクションを表示",
  },
  share: {
    button: "レポートを共有",
    modal_title: "公開レポートを共有",
    modal_desc:
      "このリンクを知っている人は誰でも、レポートの「匿名化された概要」を閲覧できます。機密の金額や詳細なサプライヤー情報はシステムによって安全に隠されています。",
    copy: "コピー",
    copied: "クリップボードにコピーしました",
    revoke: "共有リンクを取り消す",
    revoked: "共有リンクが正常に取り消されました",
    done: "完了",
    public_badge: "公開概要レポート",
    shared_by: "{{name}} により共有",
    security_intercept: "セキュリティブロック",
    security_desc:
      "このタイプのレポートは一般公開に対応していないか、データ形式が不正です。",
    cta_title: "あなたの企業専用の包括的な分析レポートを作成しませんか？",
    cta_desc:
      "iSunFA は最先端の AI 技術を活用し、カーボンヘルスチェック、財務格付け、コンプライアンス監査など、包括的なスマート会計ソリューションを提供します。",
    cta_button: "iSunFA スマート会計を見る",
  },
  share_settings: {
    title: "分析レポート共有設定",
    privacy_warning_title: "注意：社内の機密データが含まれています。",
    privacy_warning_desc: "外部へ共有する前に、必ず適切な承認を得てください。営業秘密の漏洩を防ぐため、「匿名化して金額を隠す」を選択することを強くお勧めします。",
    hide_data_title: "🛡️ 匿名化して金額を隠す (推奨)",
    hide_data_desc: "特定の伝票、仕入先詳細、および絶対金額を非表示にし、AIによって生成された構造的洞察とリスク評価の結論のみを共有します。営業秘密を最大限に保護します。",
    show_data_title: "⚠️ 機密金額を含めて完全に公開",
    show_data_desc: "すべての勘定科目、絶対残高、および関連するすべての分析が詳細に公開されます。リンクを知っている人なら誰でも、社内の運用データ全体を閲覧できます。",
    confirm: "確認してリンクを生成"
  },
};
