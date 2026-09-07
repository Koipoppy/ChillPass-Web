# TeacherWorkspace.tsx i18n 批量替换
import io

PATH = 'src/pages/TeacherWorkspace.tsx'
with io.open(PATH, 'r', encoding='utf-8') as f:
    c = f.read()

R = []

R.append((
    "import { useState, useMemo } from 'react'",
    "import { useState, useMemo } from 'react'\nimport { useT } from '../i18n'"
))
R.append((
    "export default function TeacherWorkspace() {",
    "export default function TeacherWorkspace() {\n  const t = useT()"
))
# 题型/难度标签映射 → 复用 lesson.qType* + 新增难度键
R.append((
    "  choice: '单选题',\n  multi: '多选题',\n  fill: '填空题',\n  short: '简答题',\n  calculation: '计算题',\n  essay: '论述题',",
    "  choice: 'lesson.qTypeChoice',\n  multi: 'lesson.qTypeMulti',\n  fill: 'lesson.qTypeFill',\n  short: 'lesson.qTypeShort',\n  calculation: 'teacher.qTypeCalculation',\n  essay: 'teacher.qTypeEssay',",
))
R.append((
    "  easy: '简单',\n  medium: '中等',\n  hard: '困难',",
    "  easy: 'teacher.diffEasy',\n  medium: 'teacher.diffMedium',\n  hard: 'teacher.diffHard',",
))
R.append((
    "    alert('无法创建打印窗口')",
    "    alert(t('teacher.errPrintWindow'))",
))
R.append((
    "      setError('请先选择一个课程')",
    "      setError(t('teacher.errSelectCourse'))",
))
R.append((
    "      setError('该课程没有课件文本，请先导入并分析课件')",
    "      setError(t('teacher.errNoCourseware'))",
))
R.append((
    "        setError('生成失败，请重试（可能是网络问题或课件内容不足）')",
    "        setError(t('teacher.errGenerate'))",
))
R.append((
    "      setError(err instanceof Error ? err.message : '生成失败，请重试')",
    "      setError(err instanceof Error ? err.message : t('teacher.errGenerateShort'))",
))
R.append((
    "    if (window.confirm('确定要清空所有已生成的题目吗？')) {",
    "    if (window.confirm(t('teacher.clearConfirm'))) {",
))
R.append((
    "      setError('请先生成题目再导出')",
    "      setError(t('teacher.errExportEmpty'))",
))
R.append((
    "        setError('翻译失败，将使用中文内容导出')",
    "        setError(t('teacher.errTranslate'))",
))
R.append((
    "    const title = paperTitle.trim() || `${courseName}期末考试试卷`",
    "    const title = paperTitle.trim() || t('teacher.defaultPaperTitle').replace('{course}', courseName || t('teacher.courseFallback'))",
))
R.append((
    "            <h1 className={styles.title}>教师工作台</h1>\n            <p className={styles.subtitle}>从课件生成试题，组装试卷并导出 PDF</p>",
    "            <h1 className={styles.title}>{t('teacher.title')}</h1>\n            <p className={styles.subtitle}>{t('teacher.subtitle')}</p>",
))
R.append((
    "          <h2 className={styles.cardTitle}>选择课程</h2>\n          <p className={styles.cardDesc}>选择已导入课件内容的课程作为出题来源</p>",
    "          <h2 className={styles.cardTitle}>{t('teacher.selectCourse')}</h2>\n          <p className={styles.cardDesc}>{t('teacher.selectCourseDesc')}</p>",
))
R.append((
    "            <span>暂无课程，请先导入课件</span>",
    "            <span>{t('teacher.noCourses')}</span>",
))
R.append((
    "                  {b.rawText ? `${b.rawText.length} 字` : '无文本'}",
    "                  {b.rawText ? t('teacher.charsCount').replace('{n}', String(b.rawText.length)) : t('teacher.noText')}",
))
R.append((
    "          <h2 className={styles.cardTitle}>生成题目</h2>\n          <p className={styles.cardDesc}>选择题型、难度和数量，AI 根据课件内容生成试题</p>",
    "          <h2 className={styles.cardTitle}>{t('teacher.generate')}</h2>\n          <p className={styles.cardDesc}>{t('teacher.generateDesc')}</p>",
))
R.append((
    "          <label className={styles.fieldLabel}>题型</label>",
    "          <label className={styles.fieldLabel}>{t('teacher.fieldQType')}</label>",
))
R.append((
    "          <label className={styles.fieldLabel}>难度</label>",
    "          <label className={styles.fieldLabel}>{t('teacher.fieldDifficulty')}</label>",
))
R.append((
    "          <label className={styles.fieldLabel}>数量</label>",
    "          <label className={styles.fieldLabel}>{t('teacher.fieldCount')}</label>",
))
R.append((
    "            <span className={styles.countHint}>题（1-50）</span>",
    "            <span className={styles.countHint}>{t('teacher.countHint')}</span>",
))
R.append((
    "              正在生成...\n",
    "              {t('teacher.generating')}\n",
))
R.append((
    "              生成题目\n",
    "              {t('teacher.generateBtn')}\n",
))
R.append((
    "              <h2 className={styles.cardTitle}>题目列表</h2>",
    "              <h2 className={styles.cardTitle}>{t('teacher.listTitle')}</h2>",
))
R.append((
    "                共 {questions.length} 题，合计 {totalPoints} 分",
    "                {t('teacher.listSummary').replace('{count}', String(questions.length)).replace('{points}', String(totalPoints))}",
))
R.append((
    "              清空\n",
    "              {t('wrongbook.clear')}\n",
))
R.append((
    "                      {group.questions.length} 题 · {groupPoints} 分",
    "                      {t('teacher.groupSummary').replace('{count}', String(group.questions.length)).replace('{points}', String(groupPoints))}",
))
R.append((
    "                                <span className={styles.questionPoints}>{q.points}分</span>",
    "                                <span className={styles.questionPoints}>{q.points} {t('teacher.pointsUnit')}</span>",
))
R.append((
    "                                    <span className={styles.detailLabel}>选项：</span>",
    "                                    <span className={styles.detailLabel}>{t('teacher.labelOptions')}</span>",
))
R.append((
    "                                              <span className={styles.correctTag}>正确</span>",
    "                                              <span className={styles.correctTag}>{t('teacher.labelCorrect')}</span>",
))
R.append((
    "                                    <span className={styles.detailLabel}>答案：</span>",
    "                                    <span className={styles.detailLabel}>{t('teacher.labelAnswer')}</span>",
))
R.append((
    "                                    <span className={styles.detailLabel}>解题步骤：</span>",
    "                                    <span className={styles.detailLabel}>{t('teacher.labelSteps')}</span>",
))
R.append((
    "                                    <span className={styles.detailLabel}>可接受答案：</span>",
    "                                    <span className={styles.detailLabel}>{t('teacher.labelAcceptable')}</span>",
))
R.append((
    "                                    <span className={styles.detailLabel}>解析：</span>",
    "                                    <span className={styles.detailLabel}>{t('teacher.labelExplanation')}</span>",
))
R.append((
    "          <h2 className={styles.cardTitle}>组装试卷并导出</h2>",
    "          <h2 className={styles.cardTitle}>{t('teacher.assemble')}</h2>",
))
R.append((
    "            设置试卷标题、考试时长和出题语言，导出为 PDF 打印\n            {paperLanguage !== 'zh' && '（非中文将自动翻译全部内容后导出）'}",
    "            {t('teacher.assembleDesc')}\n            {paperLanguage !== 'zh' && t('teacher.assembleTranslateHint')}",
))
R.append((
    "          <label className={styles.fieldLabel}>试卷标题</label>",
    "          <label className={styles.fieldLabel}>{t('teacher.fieldPaperTitle')}</label>",
))
R.append((
    "            placeholder={`${courseName || '课程'}期末考试试卷`}",
    "            placeholder={t('teacher.defaultPaperTitle').replace('{course}', courseName || t('teacher.courseFallback'))}",
))
R.append((
    "            <label className={styles.fieldLabel}>考试时长（分钟）</label>",
    "            <label className={styles.fieldLabel}>{t('teacher.fieldDuration')}</label>",
))
R.append((
    "              出题语言\n",
    "              {t('teacher.fieldLanguage')}\n",
))
R.append((
    "            <span>{questions.length} 道题目</span>",
    "            <span>{t('teacher.summaryQuestions').replace('{count}', String(questions.length))}</span>",
))
R.append((
    "            <span>{totalPoints} 分</span>",
    "            <span>{totalPoints} {t('teacher.pointsUnit')}</span>",
))
R.append((
    "            <span>{paperDuration} 分钟</span>",
    "            <span>{t('teacher.summaryDuration').replace('{count}', String(paperDuration))}</span>",
))
R.append((
    "              正在翻译并导出...\n",
    "              {t('teacher.translatingExport')}\n",
))
R.append((
    "              导出为 PDF\n",
    "              {t('teacher.exportPdf')}\n",
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
    print('TeacherWorkspace patched: all', len(R), 'replacements applied')
