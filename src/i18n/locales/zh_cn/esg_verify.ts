export const esgVerify = {
  title: "碳盘查",
  preview: "凭证预览",
  ai_confidence: "AI 信心度",
  no_image: "无图档可预览",
  form: {
    date: "日期",
    scope: "排放范畴",
    scope_1: "范畴一 (直接排放)",
    scope_2: "范畴二 (能源间接排放)",
    scope_3: "范畴三 (其他间接排放)",
    activity_type: "活动类型",
    activity_object: "活动对象",
    vendor: "供应商名称 / 排放对象",
    raw_data: "原始活动数据",
    unit: "单位",
    emissions: "计算排放量 (kgCO2e)",
    intensity: "排放强度分级",
    intensity_low: "低强度",
    intensity_medium: "中强度",
    intensity_high: "高强度",
  },
  emissions: {
    title: "排放量计算",
    raw_data: "原始活动数据",
    unit: "单位",
    formula_and_coef: "计算公式与系数",
    apply_formula: "套用计算公式",
    no_formula_selected: "尚未选择公式",
    total: "总排放量",
    intensity: "排放强度分级",
    coefficient: "排放系数",
    emission_source: "排放源归口",
    select_emission_source: "选择排放源归口",
    no_emission_source_selected: "尚未选择排放源",
  },
  messages: {
    fetch_error: "获取凭证失败",
    deleted_warning: "已删除凭证不可编辑",
  },
  sections: {
    preview: "发票预览",
    basic_info: "凭证基础信息",
    accounting_entries: "会计科目分录",
  },
  validation: {
    empty_fields: "日期或分录类别为空",
    unbalanced: "借贷不平衡",
    empty_rows: "分录为空",
    incomplete_row: "有分录的会计科目或金额为空",
  },
  balance_check: {
    title: "借贷平衡检查",
    balanced: "已平衡",
    unbalanced: "未平衡",
  },
  actions: {
    cancel_edit: "取消修改",
    save_only: "仅保存修改",
  },
  close_confirm: {
    title: "确认关闭？",
    message: "您的变更尚未保存，确认离开将会失去所有变更。确认要关闭吗？",
    confirm: "确认离开",
  },
  save_confirm: {
    title: "确认保存？",
    message: "即将保存您所做出 ESG 纪录核对变更。请确认数据是否无误？",
    confirm: "确认保存",

    success: "验证资料已保存",
  },
  esg_industry_benchmarks: {
    spectrum: {
      extremely_high: "极致高碳",
      very_high: "极高碳",
      high: "高碳",
      mid_high: "中高碳",
      medium: "中等",
      mid_low: "中低碳",
      extremely_low: "极低碳",
    },
    industry_1: {
      name: "石化工业",
      desc: "高：台塑石化 (3,650 公斤)落差主因：基础轻油裂解与自建燃煤汽电共生厂，伴随无法避免的巨量化学逸散与化石燃料燃烧。",
    },
    industry_2: {
      name: "水泥工业",
      desc: "高：亚洲水泥 (2,883 公斤)落差主因：高温煅烧石灰石的物理化学反应（直接释放二氧化碳）占据绝大比例，且易受中国房市低迷导致营收分母缩水影响。",
    },
    industry_3: {
      name: "发电能源业",
      desc: "高：麦寮汽电 (2,657 公斤) / 低：台湾电力 (1,068 公斤)落差主因：麦寮为 100% 燃煤发电；台电则因拥有核能、水力、天然气等多元能源结构与终端输配电网，大幅稀释碳排密集度。",
    },
    industry_4: {
      name: "钢铁工业",
      desc: "高：中国钢铁 (520 公斤) / 低：东和钢铁 (126 公斤)落差主因：传统高炉（中钢）需烧煤炭还原铁矿砂；电炉厂（东和）则透过回收废钢搭配电力熔炼，直接砍掉七成以上的还原碳排。",
    },
    industry_5: {
      name: "航运运输业",
      desc: "高：远洋货柜航运 / 低：陆地承揽与高铁落差主因：燃烧重油的跨洋巨轮是范畴一排碳大户，且极度受国际运费报价影响；而轨道运输因电气化程度高，表现相对优异。",
    },
    industry_6: {
      name: "电信网通业",
      desc: "高：中华电信 (271.8 公斤)落差主因：打破「无工厂即低碳」迷思。全台 24 小时运转的 5G 基地台与云端资料中心（IDC）冰水主机，是极度可怕的吃电怪兽。",
    },
    industry_7: {
      name: "纺织与化纤",
      desc: "低：远东新世纪 (59.2 公斤)落差主因：传统染整厂耗水耗能极高；但远东新靠着极致的宝特瓶回收再生技术（R-PET）与控股公司多元营收，成功扭转重工业宿命。",
    },
    industry_8: {
      name: "半导体制造",
      desc: "高：台积电 (50.1 公斤)落差主因：极紫外光（EUV）机台与无尘室的庞大耗电（范畴二）推升总碳排；但靠着极高的芯片单价与海量绿电采购，硬是将密集度压低。",
    },
    industry_9: {
      name: "零售与电商",
      desc: "高：统一超商 (37.6 公斤) / 低：富邦媒 (约 23 公斤)落差主因：实体超商受限于 24 小时空调与开放式冰柜；纯电商虽无门市，但仍需负担庞大物流车队与自动化仓储的碳排。",
    },
    industry_10: {
      name: "知识与金融(IC设计/软体/金控)",
      desc: "高：金融行库 (~1.5 公斤) / 低：联发科 (1.86 公斤)落差主因：商业模式纯靠「脑力与资金」。联发科将高耗能制造外包给代工厂；金融业仅有办公用电，但隐含着未计入营收碳排比的庞大「投融资碳排」。",
    },
  },
};
