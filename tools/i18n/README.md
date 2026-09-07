# i18n 批量替换工作脚本

将界面硬编码中文文案批量替换为 `t('key')` 调用的开发辅助脚本，并把新翻译键注入 `src/i18n/translations.ts`（联合类型 + zh/en/ru/ja/ko 五语言）。

## 文件说明

- `scripts-keys-*.json` — 各批次新增键的五语言翻译表（键名 → { zh, en, ru, ja, ko }）
- `scripts-patch-*.py` — 各页面/文件的精确文本替换对（旧文案 → `t('key')`）
- `scripts-add-i18n.py` — 将 JSON 键表注入 translations.ts（联合类型 + 五语言对象，锚定 `notify.newNotice` 之后）

## 运行方式

**必须从仓库根目录执行**（脚本内部的 `src/...` 路径相对于当前工作目录）：

```bash
# 1. 注入新键
python tools/i18n/scripts-add-i18n.py tools/i18n/scripts-keys-<批次>.json

# 2. 应用文本替换
python tools/i18n/scripts-patch-<批次>.py

# 3. 校验
python -c "检查联合类型与五语言对象键一致"
npx tsc --noEmit
```

## 注意事项

- 替换是精确匹配，若源码已变会打印 `MISSING` 并跳过写入
- 新键名须先查重，translations.ts 对象字面量不允许重复键（联合类型同样会脏）
- 这批脚本属于一次性工作流工具，未纳入 git 跟踪；保留备查
