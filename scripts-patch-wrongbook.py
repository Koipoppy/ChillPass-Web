# WrongBookPage.tsx i18n 批量替换
import io

PATH = 'src/pages/WrongBookPage.tsx'
with io.open(PATH, 'r', encoding='utf-8') as f:
    c = f.read()

R = []

R.append((
    "import { useWrongQuestionStore } from '@stores/wrongQuestionStore'\nimport { useCourseStore } from '@stores/courseStore'",
    "import { useWrongQuestionStore } from '@stores/wrongQuestionStore'\nimport { useCourseStore } from '@stores/courseStore'\nimport { useT } from '../i18n'\nimport type { TranslationKey } from '../i18n'"
))
R.append((
    "const priorityLabel: Record<Priority, string> = {\n  must: '必考',\n  high: '高频',\n  know: '了解',\n}",
    "const priorityLabel: Record<Priority, TranslationKey> = {\n  must: 'dashboard.priorityMust',\n  high: 'dashboard.priorityHigh',\n  know: 'dashboard.priorityKnow',\n}"
))
R.append((
    "export default function WrongBookPage() {",
    "export default function WrongBookPage() {\n  const t = useT()"
))
R.append((
    "      window.confirm(`确定要清空「${courseName}」的所有错题吗？此操作不可撤销。`)",
    "      window.confirm(t('wrongbook.clearConfirm').replace('{name}', courseName))",
))
R.append((
    "      const myAnswer = q.selectedIndex !== undefined ? q.options[q.selectedIndex] : '未作答'",
    "      const myAnswer = q.selectedIndex !== undefined ? q.options[q.selectedIndex] : t('wrongbook.noAnswer')",
))
R.append((
    "      prefill = `我在「${q.lessonTitle}」这关遇到了一道错题：\\n题目：${q.question}\\n我选了：${myAnswer}\\n正确答案：${correctAnswer}\\n请帮我理解这个知识点。`",
    "      prefill = t('wrongbook.prefillChoice')\n        .replace('{lesson}', q.lessonTitle)\n        .replace('{question}', q.question)\n        .replace('{my}', myAnswer)\n        .replace('{correct}', correctAnswer)",
))
R.append((
    "      const myAnswer = q.userAnswer ?? '未作答'\n      const correctAnswer = q.correctAnswer ?? '未知'",
    "      const myAnswer = q.userAnswer ?? t('wrongbook.noAnswer')\n      const correctAnswer = q.correctAnswer ?? t('wrongbook.unknown')",
))
R.append((
    "      prefill = `我在「${q.lessonTitle}」这关遇到了一道错题：\\n题目：${q.question}\\n我的答案：${myAnswer}\\n参考答案：${correctAnswer}\\n请帮我理解这个知识点。`",
    "      prefill = t('wrongbook.prefillText')\n        .replace('{lesson}', q.lessonTitle)\n        .replace('{question}', q.question)\n        .replace('{my}', myAnswer)\n        .replace('{correct}', correctAnswer)",
))
R.append((
    "        <h1 className={styles.title}>错题本</h1>\n        <p className={styles.subtitle}>按课程归类，逐个击破</p>",
    "        <h1 className={styles.title}>{t('wrongbook.title')}</h1>\n        <p className={styles.subtitle}>{t('wrongbook.subtitle')}</p>",
))
R.append((
    "          <h2 className={styles.emptyTitle}>暂无错题</h2>\n          <p className={styles.emptyText}>继续保持！</p>",
    "          <h2 className={styles.emptyTitle}>{t('wrongbook.empty')}</h2>\n          <p className={styles.emptyText}>{t('wrongbook.keepGoing')}</p>",
))
R.append((
    "                  <span>清空</span>",
    "                  <span>{t('wrongbook.clear')}</span>",
))
R.append((
    "                      {priorityLabel[q.priority]}",
    "                      {t(priorityLabel[q.priority])}",
))
R.append((
    "                      <span className={styles.answerLabel}>你的答案</span>",
    "                      <span className={styles.answerLabel}>{t('wrongbook.yourAnswer')}</span>",
))
R.append((
    "                      <span className={styles.answerLabel}>正确答案</span>",
    "                      <span className={styles.answerLabel}>{t('wrongbook.correctAnswer')}</span>",
))
R.append((
    "                      <span>去问助教</span>",
    "                      <span>{t('wrongbook.askAthena')}</span>",
))
R.append((
    "                      <span>已掌握</span>",
    "                      <span>{t('wrongbook.mastered')}</span>",
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
    print('WrongBookPage patched: all', len(R), 'replacements applied')
