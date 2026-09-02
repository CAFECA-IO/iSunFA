export const carbonChatbot = {
  title: "カーボンインベントリチャットボット",
  menu_title: "スマートGHGインベントリ",
  // Info: (20260730 - Tzuhan) 未解鎖時的報告區文案:不可讓大綱骨架看起來像已載入的空報告
  report_locked_hint:
    "レポートは端末の鍵でエンドツーエンド暗号化されています。一度認証すると解除され読み込まれます。",
  report_locked_hint_custodial:
    "レポートは暗号化して保存されています。第三者アカウントでログインしているため、鍵はプラットフォームが預託しています。一度認証すると解除され、このレポートが読み込まれます。",
  unlock_button: "暗号化チャットを開始",
  unlock_hint:
    "インベントリ内容を保護するため、この会話はデバイスのセキュリティキーでエンドツーエンド暗号化されます。開始をクリックし認証を一度完了すると、解除され AI の挨拶が届きます。",
  // Info: (20260812 - Luphia) 預託アカウント（第三者ログイン）用の説明。passkey と同じ保証は使えない
  unlock_hint_custodial:
    "棚卸データを保護するため、この会話は暗号化して保存されます。第三者アカウントでログインしているため、暗号鍵はプラットフォームが預託しています（ウォレットと同じ）。そのため技術的にはプラットフォームが復号できます。「本人のみ復号可能」な保護が必要な場合は passkey アカウントをご利用ください。開始をクリックすると解除され、AI の挨拶が届きます。",
  custody_loading:
    "アカウントの鍵の保管方式を確認しています。まもなく暗号化された会話を開始できます。",
  key_source_mismatch:
    "この会話は別の鍵保管方式で暗号化されています（例：passkey を登録する前に作成した内容）。そのため現在の鍵では開けません。鍵の移行について運用担当にご連絡ください。再試行しても解決しません。",
  device_unsupported:
    "お使いのデバイスまたはブラウザは暗号化に必要なセキュリティキー機能（WebAuthn PRF）に対応していないため、暗号化チャットを利用できません。Android の Chrome や PRF 対応のセキュリティキーなど、対応環境をご利用ください。",
  unlock_failed:
    "暗号鍵の解除に失敗したため、会話は開始されていません。もう一度お試しください。続く場合はページを再読み込みするか運用担当にご連絡ください（詳細はブラウザのコンソールに記録されています）。",
  subtitle: "あなた専用の企業カーボン会計士",
  recent_chats: "最近のチャット",
  today: "今日",
  history: "過去のチャット",
  new_chat: "新しいチャット",
  new_chat_personal: "個人チャット(エンドツーエンド暗号化)",
  rename_session: "チャット名を変更",
  rename_document: "レポートファイル名を変更",
  read_only: "閲覧のみ(帳簿ビューア権限)",
  // Info: (20260730 - Tzuhan) 語意去重:自己的帳本會話已列於上方歷史對話(帶帳本 chip),此區塊僅為其他成員的報告入口
  book_reports_title: "チームメンバーのレポート",
  book_no_sessions: "この帳簿にはまだ排出量レポートがありません",
  book_session_own: "自分のインベントリチャット({{date}})",
  book_session_member: "メンバーのレポート({{date}})",
  book_report_viewer_title: "帳簿の排出量レポート",
  book_report_editable: "編集可(帳簿エディター権限)",
  book_report_empty: "このセッションにはまだレポート内容がありません。",
  book_chat_hidden_note:
    "チャット履歴は個人のエンドツーエンド暗号化。共有されるのはレポートのみです",
  ai_thinking: "AIが考え中...",
  input_placeholder: "質問や回答を入力してください...",
  report_progress: "レポート作成進捗",
  report_preview_title: "温室効果ガスインベントリレポートプレビュー",
  report_empty_title: "レポートはまだ作成されていません",
  report_empty_desc:
    "左側のチャットでカーボン会計士とインベントリプロセスを完了してください。システムが自動的に完全なカーボンインベントリリストとレポートをリアルタイムで生成します。",
  iso_inventory: "ISO 14064-1 インベントリリスト",
  emission_sources: "排出源の特定",
  data_activity: "データ活動記録",
  emission_factors: "排出係数のマッピング",
  uncertainty: "不確実性評価",
  ghg_protocol: "GHGプロトコルレポート",
  scope_analysis: "スコープ 1、2、3 分析",
  reduction_pathway: "炭素削減経路シミュレーション",
  // Info: (20260730 - Tzuhan) gateway が接続を切った(504)ときの案内:処理は継続中
  still_processing:
    "処理に時間がかかり接続が切れましたが、作業は継続中です。完成したセクションは自動的に表示されます。",
  // Info: (20260730 - Tzuhan) 段落來源標示:AI 草稿不得冒充逐字照抄原文(審計文件底線)
  realtime_connecting: "リアルタイム接続中…応答が遅れる場合があります",
  realtime_disconnected:
    "リアルタイム接続が切断されました。長時間処理の結果が届かない可能性があります。ページを再読み込みしてください。",
  imported_from_short: "インポート元",
  imported_from_title: "インポート元 {{name}}（{{date}}）",
  origin_imported: "原文どおり",
  origin_ai_draft: "AI 下書き",
  origin_imported_short: "原文",
  origin_ai_draft_short: "下書き",
  // Info: (20260806 - Tzuhan) 匯入前先上傳取 cid:14 次呼叫共用一份儲存,文案要說出「為何要等」
  import_uploading:
    "{{name}} を安全なストレージへ保存中(以降の各章の解析はサーバー側で取得し、ファイルを毎回再送しません)…",
  // Info: (20260730 - Tzuhan) 兩階段匯入的第一階段提示:一次索引換來後續 11 章不必各自重送整份文件
  import_indexing:
    "{{name}} の章インデックスを作成中(各セクションのページを特定し、後続の解析量を削減します)…",
  // Info: (20260730 - Tzuhan) 結構圖:節點文字必須能在該段原文找到才會繪製,故文案明示來源
  diagram_generate: "構造図を生成(ノードは本節の原文から取得)",
  // Info: (20260730 - Tzuhan) 封存為軟刪:文案明示資料保留可還原,避免使用者誤以為永久刪除
  archive_session: "この会話をアーカイブ(データは保持され復元可能)",
  archive_confirm: "もう一度クリックで確定",
  // Info: (20260730 - Tzuhan) 已封存區塊:空清單也需文案,否則分不清「沒有封存」與「載入失敗」
  archived_sessions: "アーカイブ済み",
  archived_loading: "読み込み中…",
  archived_empty: "アーカイブされた会話はありません",
  archived_at: "{{date}} にアーカイブ",
  restore_session: "この会話を復元",
  system_error:
    "【システムエラー】申し訳ありません。カーボン会計士サービスへの接続中に問題が発生しました。後でもう一度お試しください。",
  system_unavailable: "申し訳ありません。現在システムは応答できません。",
  team_quota_exceeded:
    "チームの AI 枠と割当クレジットの両方を使い切りました。枠のリセットをお待ちいただくか、クレジットの追加購入・プランのアップグレードをご検討ください。",
  session_not_bound:
    "この算定セッションは帳簿に紐づいていないため、枠を計算できません。まずセッション設定で所属する帳簿を選択してください。",
  ai_quota_exceeded:
    "【AI 利用上限】短時間にリクエストが集中しました。1分ほど待って再試行してください。",
  ai_timeout:
    "【AI応答タイムアウト】処理に時間がかかりすぎました。もう一度お試しください。",
  rate_limited:
    "【操作が頻繁すぎます】利用上限に達しました。しばらくしてから再試行してください。",
  ai_name: "フェイス",
  platform_name: "環境インテリジェンスプラットフォーム",
  system_online: "システムオンライン",
  database_version: "データベースバージョン",
  send_message: "メッセージを送信",
  no_report_data: "レポートデータはまだありません",
  paragraph_tracker_title: "段落ステータストラッカー",
  status_completed: "完了",
  status_incomplete: "未完了",
  status_verified: "検証済み",
  status_unverified: "未検証",
  outline_title: "章立て一覧",
  outline_button: "目次",
  completed_short: "完了",
  verified_short: "検証",
  verified_progress: "人的レビュー進捗",
  jump_aria_label: "このセクションへ移動",
  close_outline: "目次を閉じる",
  data_driven_badge:
    "データセクション:数値はシステムの決定論エンジンで算出され、AI 生成ではありません",
  jump_prompt: "「{{section}}」セクションの作成を手伝ってください。",
  new_session_title: "新しいインベントリ対話",
  save_saving: "保存中...",
  save_saved: "保存済み",
  save_local:
    "ローカルに一時保存済み。暗号化チャットのロック解除後にクラウドへ自動保存されます",
  save_local_hint: "レポート下書きは暗号化してクラウドに保存されます",
  save_failed: "保存に失敗しました",
  save_failed_hint:
    "保存失敗:別のタブが下書きを更新した可能性があります。ページを再読み込みしてください",
  // Info: (20260807 - Emily) 保存失敗の種別文言:失うのは数分の成果であり、アイコン一つでは足りない
  save_failed_notice:
    "レポートの最新の変更はクラウドに保存されていません。内容は本端末に残っています。しばらくしてから再試行するか、ページを再読み込みしてください。",
  save_failed_conflict:
    "最新の変更はクラウドに保存されていません:別のタブまたは端末が下書きを更新しました。再読み込みして最新版を取得してから、もう一度編集してください。",
  save_failed_too_large:
    "最新の変更はクラウドに保存されていません:下書き 1 件あたりの上限を超えています。原文テーブルを一部削除するか、分割して取り込んでください。",
  save_local_quota:
    "ローカルの保存領域が不足し、オフラインバックアップを更新できませんでした(クラウドへの保存は完了しています)。",
  save_local_quota_only:
    "ローカルの保存領域が不足しており、この版はまだクラウドにありません — タブを閉じずに、ロック解除または再読み込みのうえ再試行してください。",
  attach_file: "ファイルを添付",
  remove_attachment: "添付を削除",
  attachment_invalid_type:
    "未対応のファイル形式です:{{name}}(PNG、JPG、PDF、CSV、XLSX のみ対応)",
  attachment_too_large:
    "ファイルが大きすぎます:{{name}}(1ファイル上限 {{max}})",
  attachment_limit: "1メッセージに添付できるのは最大 {{max}} 件です",
  attachment_upload_failed:
    "添付ファイルのアップロードに失敗しました:{{name}}。削除して再試行してください",
  attachment_type_mismatch:
    "ファイル内容が拡張子と一致しません:{{name}}(偽装ファイルの疑いのため拒否)",
  attachment_infected: "悪意のあるコンテンツを検出:{{name}}(拒否しました)",
  storage_quota_exceeded:
    "ストレージが満杯です(上限 5GB)。古い添付ファイルを削除して再試行してください",
  draft_generate: "AI でこのセクションの下書きを作成",
  draft_generating: "下書きを生成中...",
  draft_generating_section:
    "「{{section}}」の下書きを生成中です。完成後レポートに反映されます…",
  draft_failed:
    "【下書き生成失敗】「{{section}}」セクションの下書き生成中に問題が発生しました。後ほどお試しください。",
  revision_title: "修正案:{{section}}",
  revision_original: "原文",
  revision_revised: "修正後",
  revision_cited_facts: "引用した事実",
  revision_apply: "修正を適用",
  revision_discard: "破棄",
  revision_generating: "「{{section}}」の修正案を生成中…",
  revision_failed:
    "【修正失敗】修正案を生成できませんでした。後でもう一度お試しください。",
  import_button: "レポートをインポート",
  import_title: "レポートのインポート:{{name}}",
  import_overwrite_warning: "既存の内容を上書きします",
  import_drafting_sections:
    "「{{name}}」の欠落セクションをAIドラフトで補完中(第 {{current}}/{{total}} バッチ、アップロード文書に基づく)…",
  import_generating_diagrams:
    "構造図を生成中({{current}}/{{total}})…レポートは既に閲覧可能で、図は完成次第追加されます。",
  import_wrong_session:
    "このインポートは「{{name}}」のものです。適用するにはその会話に戻ってください。",
  import_draft_badge: "AIドラフト",
  import_unmapped:
    "アウトラインに対応しない内容({{count}} 件。インポートされません)",
  // Info: (20260806 - Tzuhan) 待匯入結果的第三條路:保存起來稍後再決定(內容已入庫,重載仍在)
  import_defer: "後で決める",
  import_pending_bar:
    "インポート待ちの解析結果を保存しています：{{name}}（{{count}} セクション、報告書には未記入）",
  import_pending_open: "確認してインポート",
  import_pending_discard: "破棄",
  import_inventory_year: "算定年度",
  import_inventory_year_placeholder: "2024",
  import_inventory_year_hint:
    "この報告書の算定年度(西暦)。年度をまたぐインポートで、どの仕訳がどの年度に属するかの判定に使います",
  import_inventory_year_required:
    "今回のインポートには排出量合計表が含まれます。この報告書の算定年度を入力してください",
  import_reset_note:
    "インポートした段落の検証状態はリセットされます。{{activities}} 件の活動データは再照合されます",
  import_apply: "選択をインポート({{count}})",
  import_parsing:
    "「{{name}}」を解析中。完了後に段落ごとのプレビューを表示します…",
  import_already_running:
    "「{{name}}」は解析中です。同時に 2 件実行すると同じ割り当てを奪い合い、どちらも遅くなります。完了を待つか、再読み込みしてからお試しください。",
  import_parsing_chapter:
    "「{{name}}」を章ごとに解析中({{current}}/{{total}} 完了、{{inFlight}} 章を処理中)。完全なレポートは数分かかります…",
  import_requires_book:
    "このセッションはまだ帳簿に紐付いていないため、レポート全体をインポートできません（章ごとのインポートは帳簿の利用枠で課金されます）。セッション設定で帳簿を選択してから、もう一度お試しください。",
  import_paused_chapters:
    "クレジットが不足したため、次の章はまだ解析していません：{{chapters}}。クレジットを補充すると、ここから続けてインポートできます（完了した部分は再実行されません）。",
  import_resume_needs_file:
    "続けてインポートするには元のファイルが必要ですが、再読み込みや別の端末では、そのファイルはブラウザに残っていません。同じレポートをもう一度アップロードしてください（完了した章は再実行されません）。",
  import_resume_paused: "続けてインポート",
  import_failed_chapters:
    "次の章は解析に失敗しました。後で再インポートで補完できます:{{chapters}}",
  import_retry_failed: "失敗した章を再試行",
  import_retrying: "再試行中…",
  import_retrying_hint:
    "失敗した章を再解析しています。数分かかります。このカードは閉じないでください。",
  import_empty: "【インポート失敗】アウトラインに対応する内容がありません。",
  import_failed:
    "【インポート失敗】解析に失敗しました。後でもう一度お試しください。",
  attachments_processing:
    "添付ファイルを解析中(事実抽出とドラフト生成)。大きなファイルは1〜2分かかることがあります…",
  import_suggest:
    "「{{name}}」はレポート全体のようです。レポートの起点としてインポートしますか、それとも証憑として送信しますか?",
  import_suggest_import: "レポートをインポート",
  import_suggest_attach: "添付として送信",
  // Info: (20260730 - Tzuhan) 連續未生成的節收成一列摘要;逐節整句佔位在 33 節全空時等於噪音
  sections_pending_summary:
    "上記 {{count}} セクションは未作成です。チャットでどのセクションを書くか伝えると、その位置に反映されます。",
  section_placeholder:
    "このセクションはまだ生成されていません。左側のチャットでカーボン会計士に作成したい旨を伝えると、内容がここにリアルタイムで表示されます。",
  report_status_draft:
    "レポートステータス:ドラフト(内容は AI がセクションごとに生成し、人的レビューを経て確定されます)",
  report_button: "レポート",
  close_report: "レポートを閉じる",
  // Info: (20260730 - Tzuhan) 聊天面板放大/縮小(浮層 ↔ 右側 dock);行動版兩態皆全螢幕故不顯示
  panel_maximize: "サイドパネルに拡大",
  panel_restore: "フローティングウィンドウに縮小",
  close_chat: "チャットウィンドウを閉じる",
  progress_collapse: "進捗ウィジェットを折りたたむ",
  activity_ledger_title: "活動データ台帳",
  activity_ledger_pill: "活動データ {{count}} 件",
  activity_ledger_pill_imported: " · インポート {{count}} 件",
  activity_ledger_imported_note:
    "インポートした排出量は台帳にあります:{{count}} 件、合計 {{tonne}} tCO2e。原文は排出量のみで活動データと係数がないため、下には表示されません。",
  activity_ledger_empty_after_import:
    "活動データはまだありません。インポートした報告書は排出量のみを提供します。件別の活動データと係数が必要な場合は、チャットで提供するか帳簿から証憑データをインポートしてください。",
  activity_ledger_empty:
    "活動データはまだありません。チャットで電力使用量や燃料消費量を伝えるか、請求書をアップロードすると自動記録されます。",
  activity_ledger_collapse: "活動データを折りたたむ",
  activity_source: "出典:{{source}}",
  activity_source_chat: "出典:会話",
  activity_co2e: "CO2e:{{value}} kg",
  activity_pending_factor:
    "⚠ 保留:信頼できる係数がないか単位不一致のため推定しません",
  activity_total_co2e: "総排出量(照合済み)",
  articulation_passed: "質量保存チェックに合格しました",
  articulation_violation: "質量保存違反：{{material}}",
  articulation_equation:
    "期首+購入-期末 = {{expected}} {{unit}}、記録上の消費 = {{actual}} {{unit}}、差異 = {{gap}} {{unit}}",
  articulation_plausibility_warning:
    "数量が妥当な範囲を超えています。ご確認ください：{{source}}",
  report_table_detail_heading: "排出源明細",
  report_table_col_source: "排出源",
  report_table_col_scope: "スコープ",
  report_table_col_quantity: "活動データ",
  report_table_col_factor: "排出係数（出典）",
  report_table_col_co2e: "排出量 (kgCO2e)",
  report_table_subtotal_heading: "スコープ別小計",
  report_table_total: "総排出量",
  report_table_insufficient:
    "（データ不足：活動データが揃い次第、システムが自動的に表を生成します）",
  report_table_frozen:
    "⚠ 質量保存チェックに未合格のため、データ表は凍結されています。チャットで在庫差異を明確にすると自動的に生成されます。",
  report_table_pending_note:
    "注：{count} 件の活動データは係数待ちのため、本表に含まれていません。",
  report_table_col_provenance: "データ出所",
  report_table_provenance_computed: "システム計算",
  report_table_provenance_imported: "原文転記",
  report_table_not_provided: "原文に記載なし",
  report_table_imported_note:
    "注：「原文転記」の行は外部報告書に記載された CO2e をそのまま転記したものです。本システムは活動データも排出係数も適用していないため、当該 2 列は「原文に記載なし」と表示されます。数値は原文の合計値と照合済みです（本節の照合説明を参照）。",
  data_table_refreshed:
    "データ表が活動データに合わせて更新されました。該当セクションを再確認してください",
  data_badge_reconciled:
    "データセクション：照合済み ✓（数値は決定論エンジン産出）",
  data_badge_imported:
    "データセクション：原文転記の項目を含む（原文合計と照合済み、行ごとに出所を明示）",
  data_badge_violated: "データセクション：質量保存違反 ⚠（表は凍結中）",
  data_badge_insufficient:
    "データセクション：データ不足（活動データが揃い次第自動生成）",
  chart_scope_pie_title: "スコープ別排出割合 (kgCO2e)",
  chart_scope_bar_title: "スコープ別排出量 (kgCO2e)",
  chart_insufficient:
    "（データ不足：活動データが揃い次第、システムがグラフを自動生成します）",
  chart_frozen:
    "⚠ 質量保存チェックに未合格のため、グラフは凍結されています。チャットで在庫差異を明確にすると自動的に生成されます。",
  chart_sankey_chat_node: "チャット/添付による申告",
  chart_sankey_period_unknown: "期間の記載なし",
  chart_sankey_period_collapsed:
    "期間が 2 年度を超えるため月別階層を省略しました(月別は推移グラフを参照)",
  chart_imported_sankey_title:
    "排出の分類：全社 → スコープ → サブカテゴリ（原文どおり、ロケーション基準、tCO2e/年）",
  chart_imported_sankey_excluded: "図に含まれない項目(NA/NS または 0)",
  chart_imported_sankey_no_ledger:
    "報告書はインポートされましたが、台帳に利用可能なデータがないため排出フロー図を描画できません。サンキー図とシステム集計表の唯一の出典は表3.8（各社の温室効果ガス排出量）で、今回は取得できませんでした。第三章の解析が成功したかご確認ください。解析失敗と表示されている場合は、プレビューカードの「失敗した章を再試行」で再インポートし、サーバーログで当該表が破棄された理由をご確認ください。",
  chart_imported_sankey_blocked_ledger:
    "表3.8は取得できましたが、照合（勾稽）が通らなかったため、データは入口で凍結され台帳には書き込まれていません（不完全なデータを記帳すると、すべての図が「正しそうに見える誤り」になります）。ブロック理由は下記のとおりです。原文の該当表を修正するか第三章を再インポートすると、図は自動的に生成されます。",
  chart_partial_import_blocked:
    "⚠ この図は台帳に記帳できた部分のみを含みます：今回のインポートでは他の表が照合（勾稽）を通らず記帳されていないため、図中の総量と構成比は全社の全体像ではありません。ブロック理由は下記のとおりです。原文の該当表を修正するか再インポートすると、図は自動的に再計算されます。",
  chart_imported_sankey_collapsed:
    "ノードが多すぎるため 1 層に縮小しました（全社 → スコープ）",
  chart_imported_top_items_title:
    "排出の行き先：全社 → 上位 9 排出項目とその他(原文転記、ロケーション基準、tCO2e/年)",
  chart_imported_sankey_other: "その他",
  // Info: (20260807 - Tzuhan) 分類圖抽掉廠址層(屏東佔 97%,同圖畫不出比重);廠址改列小計
  chart_imported_sankey_site_totals: "拠点別小計（tCO2e/年、全社比）",
  chart_imported_sankey_ghg_mapping: "サブコードと GHG Protocol カテゴリの対応",
  chart_imported_sankey_iso_mapping:
    "図の分類層は GHG プロトコルのスコープで表示しています。ISO 14064-1 との対応：スコープ1＝カテゴリ1、スコープ2＝カテゴリ2、スコープ3＝カテゴリ3〜6。本報告書の記述は ISO 14064-1 のカテゴリ区分に従い、両者は同一の排出源を指します。",
  chart_imported_sankey_below_threshold: "比率が小さく非表示(tCO2e/年)",
  chart_imported_sankey_organization: "全社",
  book_bind_pending_unlock:
    "帳簿セッションを作成しました。暗号化チャットのロックを解除すると帳簿バインドが完了します(証憑インポートと証拠チェーンはバインド後に利用可能)",
  book_bind_done:
    "帳簿バインド完了。活動データカードから証憑データをインポートできます",
  book_bind_denied: "帳簿バインド失敗:この帳簿の Editor 以上の権限が必要です",
  book_bind_failed: "帳簿バインドに失敗しました。再試行してください",
  book_records_import_button: "帳簿から証憑データをインポート",
  book_records_importing:
    "帳簿から認識済みの証憑レベル排出データをインポート中…",
  book_records_imported:
    "帳簿から {{count}} 件の証憑レベル活動データをインポートしました(重複は自動スキップ)",
  book_records_imported_with_skips:
    "{{count}} 件をインポート。{{skipped}} 件は GHG スコープを判定できずスキップしました。ESG ページでスコープまたは活動タイプを設定してください",
  book_records_import_failed:
    "帳簿からのインポートに失敗しました。再試行してください",
  activity_open_evidence: "証憑を表示 ↗",
  evidence_chain_title:
    "排出証拠チェーン(クリックで段階的に展開、最小単位は単一証憑)",
  evidence_chain_loading: "帳簿の証憑データを読み込み中…",
  evidence_chain_empty: "この帳簿にはまだ認識済みの排出データがありません",
  evidence_chain_error:
    "証憑データの読み込みに失敗しました(帳簿の閲覧権限をご確認ください)",
  evidence_chain_records: "証憑 {{count}} 件",
  evidence_chain_formula:
    "{{quantity}} {{unit}} × {{factor}} = {{co2e}} kgCO2e",
  evidence_chain_total: "総排出量",
  evidence_chain_verified: "検証済み",
  evidence_chain_unverified: "未検証",
  inventory_step_ORG_PROFILE: "ステップ:企業基本情報(名称/年度)",
  inventory_step_ORG_BOUNDARY: "ステップ:組織境界の設定",
  inventory_step_EMISSION_SOURCES: "ステップ:排出源の特定",
  inventory_step_ACTIVITY_DATA: "ステップ:活動データ収集",
  inventory_step_EMISSION_FACTORS: "ステップ:排出係数の対応付け",
  inventory_step_REVIEW: "ステップ:照合とレビュー",
  inventory_step_COMPLETED: "インベントリデータ収集完了",
};
