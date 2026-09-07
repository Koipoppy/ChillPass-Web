# LessonDetailPage.tsx i18n 批量替换
import io

PATH = 'src/pages/LessonDetailPage.tsx'
with io.open(PATH, 'r', encoding='utf-8') as f:
    c = f.read()

R = []

R.append((
    "import styles from './LessonDetailPage.module.css'",
    "import { useT } from '../i18n'\nimport type { TranslationKey } from '../i18n'\nimport styles from './LessonDetailPage.module.css'"
))
R.append((
    "  must: '必考',\n  high: '高频',\n  know: '了解',",
    "  must: 'dashboard.priorityMust',\n  high: 'dashboard.priorityHigh',\n  know: 'dashboard.priorityKnow',"
))
R.append((
    "          <p className={styles.notFoundText}>关卡不存在或已被移除</p>",
    "          <p className={styles.notFoundText}>{t('lesson.notFound')}</p>",
))
R.append((
    "            <span>返回关卡列表</span>",
    "            <span>{t('lesson.backToList')}</span>",
))
R.append((
    "      setError('找不到对应考点信息')",
    "      setError(t('lesson.noExamPoint'))",
))
R.append((
    "      setError(err instanceof Error ? err.message : '内容生成失败，请重试')",
    "      setError(err instanceof Error ? err.message : t('lesson.genFailedRetry'))",
))
R.append((
    "      setFeedback({ correct: false, text: '评阅失败，请重试' })",
    "      setFeedback({ correct: false, text: t('lesson.gradeFailed') })",
))
R.append((
    "      setFeedback({ correct: false, text: '题目重新生成失败，请重试' })",
    "      setFeedback({ correct: false, text: t('lesson.regenerateFailed') })",
))
R.append((
    "      setError('Chill币不足，跳过需要 10 枚')",
    "      setError(t('lesson.coinsInsufficientSkip'))",
))
R.append((
    "          <span>返回关卡列表</span>",
    "          <span>{t('lesson.backToList')}</span>",
))
R.append((
    "            {priorityLabel[lesson.priority]}",
    "            {t(priorityLabel[lesson.priority])}",
))
R.append((
    "          <span className={styles.order}>第 {lesson.order} 关</span>\n          <span className={styles.coins}>{lesson.coins} Chill币</span>",
    "          <span className={styles.order}>{t('lesson.orderLabel').replace('{n}', String(lesson.order))}</span>\n          <span className={styles.coins}>{lesson.coins} {t('dashboard.coins')}</span>",
))
R.append((
    "              已完成\n            </span>",
    "              {t('lessons.statusDone')}\n            </span>",
))
R.append((
    "          <p className={styles.loadingText}>正在重新生成学习内容...</p>",
    "          <p className={styles.loadingText}>{t('lesson.regenerating')}</p>",
))
R.append((
    "              <span>知识点</span>",
    "              <span>{t('lesson.tabPoints')}</span>",
))
R.append((
    "              <span>例题</span>",
    "              <span>{t('lesson.examples')}</span>",
))
R.append((
    "                <span>小测</span>",
    "                <span>{t('lesson.quiz')}</span>",
))
R.append((
    "                核心知识点\n              </h2>",
    "                {t('lesson.keyPoints')}\n              </h2>",
))
R.append((
    "                详细解释\n              </h2>",
    "                {t('lesson.explanationTitle')}\n              </h2>",
))
R.append((
    "                  本关暂无例题",
    "                  {t('lesson.noExamples')}",
))
R.append((
    "                  <div className={styles.exampleHeader}>例题 {i + 1}</div>",
    "                  <div className={styles.exampleHeader}>{t('lesson.exampleN').replace('{n}', String(i + 1))}</div>",
))
R.append((
    "                      <div className={styles.stepsLabel}>解题步骤</div>",
    "                      <div className={styles.stepsLabel}>{t('lesson.stepsLabel')}</div>",
))
R.append((
    "                    <span className={styles.answerLabel}>答案</span>",
    "                    <span className={styles.answerLabel}>{t('lesson.answerLabel')}</span>",
))
R.append((
    "                  本关暂无小测题",
    "                  {t('lesson.noQuiz')}",
))
R.append((
    "                          <span>问题 {quizPage + 1} / {quizQuestions.length}</span>",
    "                          <span>{t('lesson.questionN').replace('{cur}', String(quizPage + 1)).replace('{total}', String(quizQuestions.length))}</span>",
))
R.append((
    "                            {qType === 'choice' ? '单选题' : qType === 'multi' ? '多选题' : qType === 'fill' ? '填空题' : '简答题'}",
    "                            {qType === 'choice' ? t('lesson.qTypeChoice') : qType === 'multi' ? t('lesson.qTypeMulti') : qType === 'fill' ? t('lesson.qTypeFill') : t('lesson.qTypeShort')}",
))
R.append((
    "                                    ? '回答正确'\n                                    : '回答错误'}",
    "                                    ? t('lesson.answerCorrect')\n                                    : t('lesson.answerWrong')}",
))
R.append((
    "                            placeholder=\"请输入你的答案\"\n                            disabled={feedback?.correct === true}\n                            onKeyDown",
    "                            placeholder={t('lesson.yourAnswerPlaceholder')}\n                            disabled={feedback?.correct === true}\n                            onKeyDown",
))
R.append((
    "                            placeholder=\"请输入你的答案\"\n                            disabled={feedback?.correct === true}\n                            rows={4}",
    "                            placeholder={t('lesson.yourAnswerPlaceholder')}\n                            disabled={feedback?.correct === true}\n                            rows={4}",
))
R.append((
    "                              title=\"生成同知识点的新题目（不消耗 Chill币）\"",
    "                              title={t('lesson.regenerateTitle')}",
))
R.append((
    "                              <span>重新生成</span>",
    "                              <span>{t('lesson.regenerate')}</span>",
))
R.append((
    "                              title=\"消耗 10 Chill币 跳到下一题\"",
    "                              title={t('lesson.skipTitle')}",
))
R.append((
    "                              <span>跳过 (10币)</span>",
    "                              <span>{t('lesson.skipCost')}</span>",
))
R.append((
    "                                  <span>再试一次</span>",
    "                                  <span>{t('lesson.tryAgain')}</span>",
))
R.append((
    "                                  <span>再试一次</span>",
    "                                  <span>{t('lesson.tryAgain')}</span>",
))
R.append((
    "                                提交答案（已选 {multiSelected.size} 项）",
    "                                {t('lesson.submitWithCount').replace('{count}', String(multiSelected.size))}",
))
R.append((
    "                                  {grading ? '评阅中...' : '提交'}",
    "                                  {grading ? t('lesson.grading') : t('lesson.submit')}",
))
R.append((
    "                              {feedback.correct ? '回答正确' : '回答错误'}",
    "                              {feedback.correct ? t('lesson.answerCorrect') : t('lesson.answerWrong')}",
))
R.append((
    "                            <span className={styles.explanationLabel}>标准答案</span>",
    "                            <span className={styles.explanationLabel}>{t('lesson.standardAnswer')}</span>",
))
R.append((
    "                              {choiceSelected === q.correctIndex ? '回答正确' : '回答错误'}",
    "                              {choiceSelected === q.correctIndex ? t('lesson.answerCorrect') : t('lesson.answerWrong')}",
))
R.append((
    "                                <span>下一题</span>",
    "                                <span>{t('lesson.nextPage')}</span>",
))
R.append((
    "                                <span>完成关卡</span>",
    "                                <span>{t('lesson.finish')}</span>",
))
R.append((
    "                                <span>本关已完成</span>",
    "                                <span>{t('lesson.completed')}</span>",
))
R.append((
    "          <p className={styles.loadingText}>内容正在生成中，请稍候...</p>",
    "          <p className={styles.loadingText}>{t('lesson.generatingWait')}</p>",
))
R.append((
    "            关卡内容生成失败，你可以尝试手动重新生成。",
    "            {t('lesson.genFailedManual')}",
))
R.append((
    "            <span>重新生成</span>",
    "            <span>{t('lesson.regenerate')}</span>",
))

R.append((
    "export default function LessonDetailPage() {",
    "export default function LessonDetailPage() {\n  const t = useT()"
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
    print('LessonDetailPage patched: all', len(R), 'replacements applied')
