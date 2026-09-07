# AIChatPage.tsx i18n 批量替换
import io

PATH = 'src/pages/AIChatPage.tsx'
with io.open(PATH, 'r', encoding='utf-8') as f:
    c = f.read()

R = []

R.append((
    "  { type: 'qa' as AthenaTaskType, icon: MessageCircle, title: '自由提问', desc: '随时问任何问题', color: '#0078D4' },\n  { type: 'paper' as AthenaTaskType, icon: FileText, title: '论文代写', desc: '学术论文结构化撰写', color: '#8B5CF6' },\n  { type: 'report' as AthenaTaskType, icon: BookOpen, title: '报告代写', desc: '格式规范的报告撰写', color: '#10B981' },\n  { type: 'summary' as AthenaTaskType, icon: Sparkles, title: '知识总结', desc: '系统梳理核心知识点', color: '#F59E0B' },\n  { type: 'plan' as AthenaTaskType, icon: Calendar, title: '复习计划', desc: '制定可执行的复习安排', color: '#EF4444' },",
    "  { type: 'qa' as AthenaTaskType, icon: MessageCircle, titleKey: 'athena.taskQa', descKey: 'athena.taskQaDesc', color: '#0078D4' },\n  { type: 'paper' as AthenaTaskType, icon: FileText, titleKey: 'athena.taskPaper', descKey: 'athena.taskPaperDesc', color: '#8B5CF6' },\n  { type: 'report' as AthenaTaskType, icon: BookOpen, titleKey: 'athena.taskReport', descKey: 'athena.taskReportDesc', color: '#10B981' },\n  { type: 'summary' as AthenaTaskType, icon: Sparkles, titleKey: 'athena.taskSummary', descKey: 'athena.taskSummaryDesc', color: '#F59E0B' },\n  { type: 'plan' as AthenaTaskType, icon: Calendar, titleKey: 'athena.taskPlan', descKey: 'athena.taskPlanDesc', color: '#EF4444' },"
))
R.append((
    "    { label: '论文主题', placeholder: '例如：论人工智能对高等教育的影响', required: true },",
    "    { labelKey: 'athena.fTopic', placeholderKey: 'athena.fTopicPh', required: true },",
))
R.append((
    "    { label: '字数要求', placeholder: '例如：3000字', required: true },",
    "    { labelKey: 'athena.fWords', placeholderKey: 'athena.fWordsPh', required: true },",
))
R.append((
    "    { label: '特殊要求', placeholder: '例如：需要参考文献、特定格式等', required: false },",
    "    { labelKey: 'athena.fSpecial', placeholderKey: 'athena.fSpecialPh', required: false },",
))
R.append((
    "    { label: '字数要求', placeholder: '例如：2000字', required: false },",
    "    { labelKey: 'athena.fWords', placeholderKey: 'athena.fWordsReportPh', required: false },",
))
R.append((
    "    { label: '特殊要求', placeholder: '例如：需要数据图表等', required: false },",
    "    { labelKey: 'athena.fSpecial', placeholderKey: 'athena.fSpecialReportPh', required: false },",
))
R.append((
    "    { label: '总结重点', placeholder: '例如：重点公式、核心概念', required: false },",
    "    { labelKey: 'athena.fSummaryFocus', placeholderKey: 'athena.fSummaryFocusPh', required: false },",
))
R.append((
    "    { label: '考试日期', placeholder: '例如：2026-07-01', required: true },\n    { label: '每日可学习时间', placeholder: '例如：3小时', required: true },\n    { label: '薄弱环节', placeholder: '例如：第3-5章比较难', required: false },\n    { label: '已掌握内容', placeholder: '例如：第1-2章已复习完', required: false },",
    "    { labelKey: 'athena.fExamDate', placeholderKey: 'athena.fExamDatePh', required: true },\n    { labelKey: 'athena.fDailyTime', placeholderKey: 'athena.fDailyTimePh', required: true },\n    { labelKey: 'athena.fWeakAreas', placeholderKey: 'athena.fWeakAreasPh', required: false },\n    { labelKey: 'athena.fMastered', placeholderKey: 'athena.fMasteredPh', required: false },",
))
R.append((
    "        setOcrProgress('正在加载识别引擎...')",
    "        setOcrProgress(t('athena.ocrLoadingEngine'))",
))
R.append((
    "            'loading tesseract core': '加载识别核心...',\n            'initializing tesseract': '初始化引擎...',\n            'loading language traineddata': '加载语言包...',\n            'initializing api': '准备识别...',\n            'recognizing text': `识别中... ${Math.round(progress * 100)}%`,",
    "            'loading tesseract core': t('athena.ocrLoadingCore'),\n            'initializing tesseract': t('athena.ocrInitializing'),\n            'loading language traineddata': t('athena.ocrLoadingLang'),\n            'initializing api': t('athena.ocrPreparing'),\n            'recognizing text': t('athena.ocrRecognizing').replace('{percent}', String(Math.round(progress * 100))),",
))
R.append((
    "        alert(err instanceof Error ? err.message : '图片识别失败，请重试')",
    "        alert(err instanceof Error ? err.message : t('athena.ocrFailed'))",
))
R.append((
    "        ? `[图片识别内容]\\n${recognizedText}\\n\\n${rawContent}`",
    "        ? `${t('athena.ocrPrefix')}\\n${recognizedText}\\n\\n${rawContent}`",
))
R.append((
    "          updateMessage(assistantId, '抱歉，我没有收到回复内容，请重试。')",
    "          updateMessage(assistantId, t('athena.noReply'))",
))
R.append((
    "        const errorMsg = err instanceof Error ? err.message : '发生未知错误'\n        updateMessage(assistantId, `出错了：${errorMsg}`)",
    "        const errorMsg = err instanceof Error ? err.message : t('athena.unknownError')\n        updateMessage(assistantId, t('athena.errorPrefix').replace('{msg}', errorMsg))",
))
R.append((
    "              {isStreaming\n                ? '正在思考...'\n                : currentCourse\n                  ? `基于「${currentCourse.name}」课件`\n                  : '你的智能学伴'}",
    "              {isStreaming\n                ? t('athena.thinking')\n                : currentCourse\n                  ? t('athena.basedOn').replace('{course}', currentCourse.name)\n                  : t('athena.subtitle')}",
))
R.append((
    "            {athenaStatus === 'thinking' ? '思考中' : athenaStatus === 'tasking' ? '执行任务中' : '待命'}",
    "            {athenaStatus === 'thinking' ? t('athena.statusThinking') : athenaStatus === 'tasking' ? t('athena.statusTasking') : t('athena.idle')}",
))
R.append((
    "              {TASKS.find(t => t.type === activeTask)?.title}\n              <button onClick={() => setActiveTask('qa')}>",
    "              {t(TASKS.find(tk => tk.type === activeTask)?.titleKey || 'athena.taskQa')}\n              <button onClick={() => setActiveTask('qa')}>",
))
R.append((
    "          <button className={styles.headerBtn} onClick={() => setShowAbilityPanel(true)} title=\"技能管理\">",
    "          <button className={styles.headerBtn} onClick={() => setShowAbilityPanel(true)} title={t('athena.abilities')}>",
))
R.append((
    "          <button className={styles.headerBtn} onClick={() => setShowMemoryPanel(true)} title=\"记忆管理\">",
    "          <button className={styles.headerBtn} onClick={() => setShowMemoryPanel(true)} title={t('athena.memories')}>",
))
R.append((
    "            title=\"清空对话\"",
    "            title={t('athena.clearChat')}",
))
R.append((
    "                我是你的智能学伴，选择一个任务开始吧",
    "                {t('athena.welcomeMsg')}",
))
R.append((
    "                  当前任务：{TASKS.find(t => t.type === activeTask)?.title}",
    "                  {t('athena.currentTask').replace('{task}', t(TASKS.find(tk => tk.type === activeTask)?.titleKey || 'athena.taskQa'))}",
))
R.append((
    "                        <span className={styles.taskTitle}>{task.title}</span>\n                        <span className={styles.taskDesc}>{task.desc}</span>",
    "                        <span className={styles.taskTitle}>{t(task.titleKey)}</span>\n                        <span className={styles.taskDesc}>{t(task.descKey)}</span>",
))
R.append((
    "                alt=\"附加图片\"",
    "                alt={t('athena.attachedImage')}",
))
R.append((
    "                    已识别图片文字",
    "                    {t('athena.ocrResult')}",
))
R.append((
    "                    识别失败，可移除后重试",
    "                    {t('athena.ocrFailedRetry')}",
))
R.append((
    "                title=\"移除图片\"",
    "                title={t('athena.removeImage')}",
))
R.append((
    "            title=\"插入图片\"",
    "            title={t('athena.insertImage')}",
))
R.append((
    "              isStreaming\n                ? 'Athena 正在思考...'\n                : activeTask !== 'qa'\n                  ? `${TASKS.find(t => t.type === activeTask)?.title} - 输入内容，Enter 发送`\n                  : '输入你的问题，Enter 发送，Shift+Enter 换行'",
    "              isStreaming\n                ? t('athena.thinkingPlaceholder')\n                : activeTask !== 'qa'\n                  ? t('athena.taskInputHint').replace('{task}', t(TASKS.find(tk => tk.type === activeTask)?.titleKey || 'athena.taskQa'))\n                  : t('athena.chatInputHint')",
))
R.append((
    "            title=\"发送\"",
    "            title={t('athena.send')}",
))
R.append((
    "                <h3>{TASKS.find(t => t.type === activeTask)?.title} - 信息收集</h3>",
    "                <h3>{t(TASKS.find(tk => tk.type === activeTask)?.titleKey || 'athena.taskQa')} - {t('athena.infoCollect')}</h3>",
))
R.append((
    "                      .map(f => `${f.label}：${taskFormValues[f.label] || '未指定'}`)",
    "                      .map(f => `${t(f.labelKey)}：${taskFormValues[t(f.labelKey)] || t('athena.unspecified')}`)",
))
R.append((
    "                    setInput(`请根据以下信息执行任务：\\n${prompt}`)",
    "                    setInput(`${t('athena.taskPromptPrefix')}\\n${prompt}`)",
))
R.append((
    "          placeholder=\"技能名称（如：论文写作）\"",
    "          placeholder={t('athena.abilityNamePlaceholder')}",
))
R.append((
    "          placeholder=\"技能描述\"",
    "          placeholder={t('athena.abilityDescPlaceholder')}",
))
R.append((
    "        alert('Athena 配置导入成功！')",
    "        alert(t('athena.importSuccess'))",
))
R.append((
    "        alert('导入失败：文件格式不正确')",
    "        alert(t('dashboard.importFailedFormat'))",
))
R.append((
    "          placeholder=\"添加新的宪章记忆...\"",
    "          placeholder={t('athena.addCharterMemory')}",
))
R.append((
    "                      编辑\n",
    "                      {t('athena.edit')}\n",
))
R.append((
    "              清空\n",
    "              {t('wrongbook.clear')}\n",
))

R.append((
    "export default function AIChatPage() {",
    "export default function AIChatPage() {\n  const t = useT()"
))
R.append((
    "function AbilityPanel() {\n  const abilities = useAthenaStore(s => s.abilities)",
    "function AbilityPanel() {\n  const t = useT()\n  const abilities = useAthenaStore(s => s.abilities)"
))
R.append((
    "function MemoryPanel() {\n  const memories = useAthenaStore(s => s.memories)",
    "function MemoryPanel() {\n  const t = useT()\n  const memories = useAthenaStore(s => s.memories)"
))
R.append((
    "                <h3>技能管理</h3>",
    "                <h3>{t('athena.abilities')}</h3>",
))
R.append((
    "                <h3>记忆管理</h3>",
    "                <h3>{t('athena.memories')}</h3>",
))
R.append((
    "          <Plus size={16} strokeWidth={2} />\n          添加\n        </button>",
    "          <Plus size={16} strokeWidth={2} />\n          {t('athena.add')}\n        </button>",
))
R.append((
    "            <Plus size={16} strokeWidth={2} />\n            添加\n          </button>",
    "            <Plus size={16} strokeWidth={2} />\n            {t('athena.add')}\n          </button>",
))
R.append((
    "          导出 Athena\n        </button>",
    "          {t('athena.export')}\n        </button>",
))
R.append((
    "          导入 Athena\n        </button>",
    "          {t('athena.import')}\n        </button>",
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
    print('AIChatPage patched: all', len(R), 'replacements applied')
