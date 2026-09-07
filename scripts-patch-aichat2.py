# AIChatPage 二轮修正：遗漏字段、表单渲染、TASKS 类型
import io

PATH = 'src/pages/AIChatPage.tsx'
with io.open(PATH, 'r', encoding='utf-8') as f:
    c = f.read()

R = []

R.append((
    "    { label: '学术级别', placeholder: '例如：本科 / 硕士 / 课程论文', required: false },",
    "    { labelKey: 'athena.fLevel', placeholderKey: 'athena.fLevelPh', required: false },",
))
R.append((
    "    { label: '报告主题', placeholder: '例如：实验报告 / 调研报告', required: true },",
    "    { labelKey: 'athena.fReportTopic', placeholderKey: 'athena.fReportTopicPh', required: true },",
))
R.append((
    "    { label: '报告类型', placeholder: '例如：实验报告 / 调研报告 / 读书报告', required: true },",
    "    { labelKey: 'athena.fReportType', placeholderKey: 'athena.fReportTypePh', required: true },",
))
R.append((
    "    { label: '总结范围', placeholder: '例如：第一章到第三章 / 全部课件', required: true },",
    "    { labelKey: 'athena.fSummaryScope', placeholderKey: 'athena.fSummaryScopePh', required: true },",
))
R.append((
    "    { label: '输出格式', placeholder: '例如：表格 / 思维导图 / 列表', required: false },",
    "    { labelKey: 'athena.fOutputFormat', placeholderKey: 'athena.fOutputFormatPh', required: false },",
))
R.append((
    "const TASKS = [",
    "const TASKS: { type: AthenaTaskType; icon: typeof MessageCircle; titleKey: TranslationKey; descKey: TranslationKey; color: string }[] = [",
))
R.append((
    "                      {field.label}\n                      {field.required && <span className={styles.requiredMark}>*</span>}",
    "                      {t(field.labelKey)}\n                      {field.required && <span className={styles.requiredMark}>*</span>}",
))
R.append((
    "                      placeholder={field.placeholder}\n                      value={taskFormValues[field.label] || ''}\n                      onChange={e => setTaskFormValues(prev => ({ ...prev, [field.label]: e.target.value }))}",
    "                      placeholder={t(field.placeholderKey)}\n                      value={taskFormValues[field.labelKey] || ''}\n                      onChange={e => setTaskFormValues(prev => ({ ...prev, [field.labelKey]: e.target.value }))}",
))
R.append((
    "                  开始执行\n                </button>",
    "                  {t('athena.startTask')}\n                </button>",
))

missing = []
for i, (old, new) in enumerate(R):
    if old not in c:
        missing.append((i, old[:70]))
        continue
    c = c.replace(old, new, 1)

if missing:
    print('MISSING:', len(missing))
    for i, s in missing:
        print(' ', i, repr(s))
else:
    with io.open(PATH, 'w', encoding='utf-8', newline='') as f:
        f.write(c)
    print('AIChatPage round-2 patched: all', len(R), 'replacements applied')
