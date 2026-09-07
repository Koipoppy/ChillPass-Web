# DataSettings.tsx i18n 批量替换
import io

PATH = 'src/pages/settings/DataSettings.tsx'
with io.open(PATH, 'r', encoding='utf-8') as f:
    c = f.read()

R = []

R.append((
    "export default function DataSettings() {",
    "export default function DataSettings() {\n  const t = useT()"
))
R.append((
    "          aria-label=\"返回设置\"",
    "          aria-label={t('common.back')}",
))
R.append((
    "          <h1 className={styles.title}>数据管理</h1>\n          <p className={styles.subtitle}>管理本地存储的课程与学习数据</p>",
    "          <h1 className={styles.title}>{t('data.title')}</h1>\n          <p className={styles.subtitle}>{t('data.subtitle')}</p>",
))
R.append((
    "          <h2 className={styles.cardTitle}>数据统计</h2>\n          <p className={styles.cardDesc}>查看当前本地存储的课程与课件数量</p>",
    "          <h2 className={styles.cardTitle}>{t('data.statsTitle')}</h2>\n          <p className={styles.cardDesc}>{t('data.statsDesc')}</p>",
))
R.append((
    "            <span className={styles.statLabel}>课程数量</span>",
    "            <span className={styles.statLabel}>{t('data.courseCount')}</span>",
))
R.append((
    "            <span className={styles.statLabel}>课件文件</span>",
    "            <span className={styles.statLabel}>{t('settings.statsFiles')}</span>",
))
R.append((
    "          <h2 className={styles.cardTitle}>存储信息</h2>\n          <p className={styles.cardDesc}>查看应用安装位置、数据存储位置与磁盘占用情况</p>",
    "          <h2 className={styles.cardTitle}>{t('data.storageTitle')}</h2>\n          <p className={styles.cardDesc}>{t('data.storageDesc')}</p>",
))
R.append((
    "              <span className={styles.pathLabel}>安装位置</span>",
    "              <span className={styles.pathLabel}>{t('data.installPath')}</span>",
))
R.append((
    "                {paths?.installPath || '加载中...'}",
    "                {paths?.installPath || t('data.loading')}",
))
R.append((
    "              title=\"在资源管理器中定位安装位置\"",
    "              title={t('data.locateTip')}",
))
R.append((
    "              定位\n            </button>",
    "              {t('data.locate')}\n            </button>",
))
R.append((
    "              <span className={styles.pathLabel}>数据存储位置</span>",
    "              <span className={styles.pathLabel}>{t('data.userDataPath')}</span>",
))
R.append((
    "                {paths?.userDataPath || '加载中...'}",
    "                {paths?.userDataPath || t('data.loading')}",
))
R.append((
    "              <span className={styles.pathLabel}>磁盘占用</span>",
    "              <span className={styles.pathLabel}>{t('data.diskUsage')}</span>",
))
R.append((
    "                  （课程数据约 {formatSize(totalCourseSize)}）",
    "                  （{t('data.courseDataApprox').replace('{size}', formatSize(totalCourseSize))}）",
))
R.append((
    "            <div className={styles.courseSizeTitle}>按课程占用</div>",
    "            <div className={styles.courseSizeTitle}>{t('data.byCourse')}</div>",
))
R.append((
    "          <h2 className={styles.cardTitle}>危险操作</h2>",
    "          <h2 className={styles.cardTitle}>{t('data.dangerTitle')}</h2>",
))
R.append((
    "            清除操作将删除所有已上传的课件、考点与闯关进度，且不可恢复",
    "            {t('data.dangerDesc')}",
))
R.append((
    "            清除所有课程数据\n",
    "            {t('data.clearAll')}\n",
))
R.append((
    "              确定要清除所有课程数据吗？此操作不可恢复，将删除所有已上传的课件、考点与闯关进度。",
    "              {t('data.clearConfirm')}",
))
R.append((
    "                取消\n",
    "                {t('common.cancel')}\n",
))
R.append((
    "                确认清除\n",
    "                {t('data.confirmClear')}\n",
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
    print('DataSettings patched: all', len(R), 'replacements applied')
