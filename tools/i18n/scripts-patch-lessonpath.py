# LessonPathPage.tsx i18n 批量替换
import io

PATH = 'src/pages/LessonPathPage.tsx'
with io.open(PATH, 'r', encoding='utf-8') as f:
    c = f.read()

R = []

R.append((
    "import { useCourseStore, useCurrentBundle } from '@stores/courseStore'\nimport type { Lesson, Priority } from '@types/index'\nimport styles from './LessonPathPage.module.css'\n\nconst priorityLabel: Record<Priority, string> = {\n  must: '必考',\n  high: '高频',\n  know: '了解',\n}",
    "import { useCourseStore, useCurrentBundle } from '@stores/courseStore'\nimport { useT } from '../i18n'\nimport type { TranslationKey } from '../i18n'\nimport type { Lesson, Priority } from '@types/index'\nimport styles from './LessonPathPage.module.css'\n\nconst priorityLabelKey: Record<Priority, TranslationKey> = {\n  must: 'dashboard.priorityMust',\n  high: 'dashboard.priorityHigh',\n  know: 'dashboard.priorityKnow',\n}"
))
R.append((
    "      const key = lesson.sourceFile || '默认分组'",
    "      const key = lesson.sourceFile || t('lessons.defaultGroup')",
))
R.append((
    "    const targetGroup = targetLesson.sourceFile || '默认分组'",
    "    const targetGroup = targetLesson.sourceFile || t('lessons.defaultGroup')",
))
R.append((
    "          <h2 className={styles.emptyTitle}>还没有闯关路径</h2>\n          <p className={styles.emptyText}>\n            先导入课件，AI 会自动为你生成考点闯关路径\n          </p>",
    "          <h2 className={styles.emptyTitle}>{t('lessons.emptyTitle')}</h2>\n          <p className={styles.emptyText}>\n            {t('lessons.emptyDesc')}\n          </p>",
))
R.append((
    "            <span>去导入课件</span>",
    "            <span>{t('lessons.goImport')}</span>",
))
R.append((
    "              正在后台生成关卡内容... ({generationProgress.current}/\n              {generationProgress.total})",
    "              {t('dashboard.genBanner')\n                .replace('{current}', String(generationProgress.current))\n                .replace('{total}', String(generationProgress.total))}",
))
R.append((
    "            <span className={styles.coinsLabel}>Chill币</span>",
    "            <span className={styles.coinsLabel}>{t('dashboard.coins')}</span>",
))
R.append((
    "              {progress.completedLessons}/{progress.totalLessons} 关卡",
    "              {progress.completedLessons}/{progress.totalLessons} {t('nav.levelUnit')}",
))
R.append((
    "                {completedCount}/{groupLessons.length} 关\n                {allDone && <span className={styles.groupDoneTag}>已完成</span>}",
    "                {t('lessons.groupProgress').replace('{done}', String(completedCount)).replace('{count}', String(groupLessons.length))}\n                {allDone && <span className={styles.groupDoneTag}>{t('lessons.statusDone')}</span>}",
))
R.append((
    "                        alert(`Chill币不足，需要 ${cost} 枚`)",
    "                        alert(t('lessons.coinsInsufficient').replace('{cost}', String(cost)))",
))
R.append((
    "                        alert(err instanceof Error ? err.message : '解锁失败')",
    "                        alert(err instanceof Error ? err.message : t('lessons.unlockFailed'))",
))
R.append((
    "                          <span className={styles.lessonCoins}>{lesson.coins} Chill币</span>",
    "                          <span className={styles.lessonCoins}>{lesson.coins} {t('dashboard.coins')}</span>",
))
R.append((
    "                              接下来做\n                            </span>",
    "                              {t('lessons.upNext')}\n                            </span>",
))
R.append((
    "                          <div className={styles.lessonStatusDone}>已完成</div>",
    "                          <div className={styles.lessonStatusDone}>{t('lessons.statusDone')}</div>",
))
R.append((
    "                            <span>未解锁</span>",
    "                            <span>{t('lessons.statusLocked')}</span>",
))
R.append((
    "                              <span>解锁 ({lesson.coins} Chill币)</span>",
    "                              <span>{t('lessons.unlockWithCost').replace('{coins}', String(lesson.coins))}</span>",
))
R.append((
    "                          <div className={styles.lessonStatusActive}>点击开始</div>",
    "                          <div className={styles.lessonStatusActive}>{t('lessons.tapStart')}</div>",
))

R.append((
    "export default function LessonPathPage() {",
    "export default function LessonPathPage() {\n  const t = useT()"
))
R.append((
    "                            {priorityLabel[lesson.priority]}",
    "                            {t(priorityLabelKey[lesson.priority])}",
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
    print('LessonPathPage patched: all', len(R), 'replacements applied')
