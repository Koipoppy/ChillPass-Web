# StorageSettings.tsx i18n 批量替换
import io

PATH = 'src/pages/settings/StorageSettings.tsx'
with io.open(PATH, 'r', encoding='utf-8') as f:
    c = f.read()

R = []

R.append((
    "import styles from './SettingsSub.module.css'",
    "import { useT } from '../../i18n'\nimport styles from './SettingsSub.module.css'"
))
R.append((
    "export default function StorageSettings() {",
    "export default function StorageSettings() {\n  const t = useT()"
))
R.append((
    "        errors: [err instanceof Error ? err.message : '迁移失败，请重试'],",
    "        errors: [err instanceof Error ? err.message : t('storage.migrateFailedRetry')],",
))
R.append((
    "          aria-label=\"返回设置\"",
    "          aria-label={t('common.back')}",
))
R.append((
    "            配置资源存储位置，迁移课件文件以释放 C 盘空间",
    "            {t('storage.cardDesc')}",
))
R.append((
    "            课件解析后的文本、生成的关卡内容等资源将存储在此目录。建议选择非系统盘以节省 C 盘空间。",
    "            {t('storage.dirHint')}",
))
R.append((
    "              {displayPath || '正在获取默认路径...'}",
    "              {displayPath || t('storage.gettingPath')}",
))
R.append((
    "            {selecting ? '选择中...' : '选择目录'}",
    "            {selecting ? t('storage.selecting') : t('storage.selectDir')}",
))
R.append((
    "            恢复默认\n",
    "            {t('storage.resetDefault')}\n",
))
R.append((
    "            将所有课程的课件文件统一迁移到目标目录，释放 C 盘空间。迁移完成后，应用内的文件路径将自动更新。",
    "            {t('storage.migrateDesc')}",
))
R.append((
    "            暂无课件文件，请先在「导入课件」页面上传课程资料",
    "            {t('storage.noFiles')}",
))
R.append((
    "                {targetDir || '未选择目标目录'}",
    "                {targetDir || t('storage.noTarget')}",
))
R.append((
    "              {selectingTarget ? '选择中...' : '选择目标目录'}",
    "              {selectingTarget ? t('storage.selecting') : t('storage.selectTarget')}",
))
R.append((
    "              ? '移动模式：将文件从原位置转移到目标目录，可最大化释放原位置空间。'\n              : '复制模式：将文件复制到目标目录，保留原文件。'}",
    "              ? t('storage.moveMode')\n              : t('storage.copyMode')}",
))
R.append((
    "                {migrationResult.success ? '迁移完成' : '迁移失败'}",
    "                {migrationResult.success ? t('storage.migrateDone') : t('storage.migrateFailed')}",
))
R.append((
    "                  已自动更新 {Object.keys(migrationResult.pathMap).length} 个文件路径，上方文件清单已同步为新路径。",
    "                  {t('storage.pathUpdated').replace('{count}', String(Object.keys(migrationResult.pathMap).length))}",
))
R.append((
    "                迁移中...\n",
    "                {t('storage.migrating')}\n",
))
R.append((
    "                开始迁移\n",
    "                {t('storage.startMigrate')}\n",
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
    print('StorageSettings patched: all', len(R), 'replacements applied')
