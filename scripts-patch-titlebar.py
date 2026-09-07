# TitleBar.tsx + Sidebar.tsx i18n 批量替换
import io

def patch(path, R):
    with io.open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    missing = []
    for i, (old, new) in enumerate(R):
        if old not in c:
            missing.append((i, old[:70]))
            continue
        c = c.replace(old, new, 1)
    if missing:
        print(f'MISSING in {path}:', len(missing))
        for i, s in missing:
            print(' ', i, repr(s))
        return False
    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(c)
    print(f'{path} patched: {len(R)} replacements')
    return True

ok = True

ok &= patch('src/components/layout/TitleBar.tsx', [
    ("            title={isMaximized ? '还原' : '最大化'}\n            aria-label=\"最大化窗口\"",
     "            title={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}\n            aria-label={t('titlebar.maximize')}"),
    ("          title=\"帮助\"\n          aria-label=\"帮助\"",
     "          title={t('titlebar.help')}\n          aria-label={t('titlebar.help')}"),
    ("              <h2 className={styles.helpTitle}>ChillPass 使用帮助</h2>",
     "              <h2 className={styles.helpTitle}>{t('titlebar.helpTitle')}</h2>"),
    ("                <h3 className={styles.helpSectionTitle}>软件介绍</h3>",
     "                <h3 className={styles.helpSectionTitle}>{t('titlebar.helpIntroTitle')}</h3>"),
    ("""                  ChillPass 是一款 AI 驱动的闯关式备考应用，专为大学生期末复习设计。
                  导入课件后，AI 自动提炼考点、生成闯关路径，每关包含知识点讲解、例题和小测，
                  答错自动加入错题本，完成关卡赚取 Chill 币解锁更多内容。""",
     "                  {t('titlebar.helpIntroBody')}"),
    ("                <h3 className={styles.helpSectionTitle}>快速上手</h3>",
     "                <h3 className={styles.helpSectionTitle}>{t('titlebar.helpQuickTitle')}</h3>"),
    ("                  <li><b>导入课件</b>：在首页点击「导入课件」，上传 PDF / Word / 图片，AI 自动解析考点</li>",
     "                  <li><b>{t('titlebar.helpItem1T')}</b>：{t('titlebar.helpItem1D')}</li>"),
    ("                  <li><b>闯关学习</b>：在「闯关冲刺」中按顺序完成关卡，每关需答对小测题才能通关</li>",
     "                  <li><b>{t('titlebar.helpItem2T')}</b>：{t('titlebar.helpItem2D')}</li>"),
    ("                  <li><b>小测功能</b>：支持单选、多选、填空、简答四种题型，答错自动记入错题本</li>",
     "                  <li><b>{t('titlebar.helpItem3T')}</b>：{t('titlebar.helpItem3D')}</li>"),
    ("                  <li><b>重新生成</b>：小测中可点击「重新生成」获取同知识点的新题目（免费）</li>",
     "                  <li><b>{t('titlebar.helpItem4T')}</b>：{t('titlebar.helpItem4D')}</li>"),
    ("                  <li><b>跳过题目</b>：消耗 10 Chill 币跳过当前题目，直接进入下一题</li>",
     "                  <li><b>{t('titlebar.helpItem5T')}</b>：{t('titlebar.helpItem5D')}</li>"),
    ("                  <li><b>错题本</b>：在「错题本」中按课程查看错题，可向 AI 助教提问或标记已掌握</li>",
     "                  <li><b>{t('titlebar.helpItem6T')}</b>：{t('titlebar.helpItem6D')}</li>"),
    ("                  <li><b>AI 助教</b>：Athena 智能体支持论文写作、知识总结等任务工作流</li>",
     "                  <li><b>{t('titlebar.helpItem7T')}</b>：{t('titlebar.helpItem7D')}</li>"),
    ("                  <li><b>教师工作台</b>：在设置中开启「教师模式」，可生成试卷并导出 PDF</li>",
     "                  <li><b>{t('titlebar.helpItem8T')}</b>：{t('titlebar.helpItem8D')}</li>"),
    ("                  <li><b>Chill 币</b>：完成关卡获得币，学习时长自动换算（1分钟=1币），用于解锁关卡和跳过题目</li>",
     "                  <li><b>{t('titlebar.helpItem9T')}</b>：{t('titlebar.helpItem9D')}</li>"),
    ("                  <li><b>专注模式</b>：点击右上角按钮进入全屏专注模式，屏蔽干扰</li>",
     "                  <li><b>{t('titlebar.helpItem10T')}</b>：{t('titlebar.helpItem10D')}</li>"),
    ("                <h3 className={styles.helpSectionTitle}>开发者联系方式</h3>",
     "                <h3 className={styles.helpSectionTitle}>{t('titlebar.helpContactTitle')}</h3>"),
    ("                    <span className={styles.helpContactLabel}>微信</span>",
     "                    <span className={styles.helpContactLabel}>{t('titlebar.helpWechat')}</span>"),
    ("                    <span className={styles.helpContactLabel}>版本</span>",
     "                    <span className={styles.helpContactLabel}>{t('titlebar.helpVersionLabel')}</span>"),
    ("                  <span>扫码加入 ChillPass 用户交流群</span>",
     "                  <span>{t('titlebar.helpQrText')}</span>"),
    ("              我知道了\n            </button>",
     "              {t('titlebar.helpGotIt')}\n            </button>"),
])

ok &= patch('src/components/layout/Sidebar.tsx', [
    ("              <span>工作台</span>", "              <span>{t('sidebar.workspace')}</span>"),
    ("              <span style={{ color: 'var(--success-text)' }}>{progress!.chillCoins ?? 0} Chill币</span>",
     "              <span style={{ color: 'var(--success-text)' }}>{progress!.chillCoins ?? 0} {t('dashboard.coins')}</span>"),
])
if not ok:
    raise SystemExit(1)
