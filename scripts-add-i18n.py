# 向 translations.ts 注入新 i18n 键（联合类型 + 五语言）
# 用法: python scripts-add-i18n.py <json文件>
# JSON 结构: { "key.name": {"zh": "...", "en": "...", "ru": "...", "ja": "...", "ko": "..."} }
import io
import json
import sys

KEYS_FILE = sys.argv[1]
with open(KEYS_FILE, 'r', encoding='utf-8') as f:
    keys = json.load(f)

PATH = 'src/i18n/translations.ts'
with io.open(PATH, 'r', encoding='utf-8') as f:
    c = f.read()

# 1) 联合类型：插在 '| ' 声明区末尾（const zh 之前）
union_lines = ''.join("  | '%s'\n" % k for k in keys)
anchor = '\nconst zh: Record<TranslationKey, string> = {'
assert anchor in c, 'union anchor not found'
c = c.replace(anchor, '\n' + union_lines + anchor, 1)

# 2) 五语言对象：各自锚定该语言最后一行 notify.newNotice，追加其后
tail = {
    'zh': "  'notify.newNotice': '新通知',",
    'en': "  'notify.newNotice': 'New notice',",
    'ru': "  'notify.newNotice': 'Новое уведомление',",
    'ja': "  'notify.newNotice': '新着通知',",
    'ko': "  'notify.newNotice': '새 알림',",
}
for lang, anchor_line in tail.items():
    assert anchor_line in c, f'{lang} anchor not found'
    block = ''.join("  '%s': %s,\n" % (k, json.dumps(v[lang], ensure_ascii=False)) for k, v in keys.items())
    c = c.replace(anchor_line, anchor_line + '\n' + block.rstrip('\n'), 1)

with io.open(PATH, 'w', encoding='utf-8', newline='') as f:
    f.write(c)
print('added', len(keys), 'keys x 5 languages')
