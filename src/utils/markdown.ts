import { marked } from 'marked'
import DOMPurify from 'dompurify'
import katex from 'katex'
import { translate, type TranslationKey } from '../i18n/translations'
import { useLanguageStore } from '@stores/languageStore'

marked.setOptions({
  breaks: true,
  gfm: true,
})

/**
 * 使用占位符策略渲染数学公式：
 * 1. 先提取所有数学表达式，替换为唯一占位符
 * 2. 让 marked 解析剩余的 Markdown（不会破坏占位符）
 * 3. 将占位符替换回 KaTeX 渲染后的 HTML
 * 4. DOMPurify 消毒
 */

interface MathPlaceholder {
  id: string
  html: string
}

/** 提取并渲染所有数学表达式，返回替换后的文本和占位符映射 */
function extractAndRenderMath(text: string): { text: string; placeholders: MathPlaceholder[] } {
  const placeholders: MathPlaceholder[] = []
  let counter = 0

  const replace = (math: string, displayMode: boolean): string => {
    const id = `KATEXMATH${counter}ENDMATH`
    counter++
    try {
      const html = katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        output: 'htmlAndMathml',
      })
      placeholders.push({ id, html })
      return id
    } catch {
      return displayMode ? `$$${math}$$` : `$${math}$`
    }
  }

  // 顺序很重要：先处理 $$...$$ 和 \[...\]（块级），再处理 $...$ 和 \(...\)（行内）
  // 块级公式：$$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => replace(math.trim(), true))
  // 块级公式：\[...\]
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => replace(math.trim(), true))
  // 行内公式：$...$（不匹配跨行，不匹配空内容）
  text = text.replace(/\$([^\$\n]+?)\$/g, (_, math) => replace(math, false))
  // 行内公式：\(...\)
  text = text.replace(/\\\((.+?)\\\)/g, (_, math) => replace(math, false))

  return { text, placeholders }
}

/** 将占位符替换回 KaTeX HTML */
function restoreMath(html: string, placeholders: MathPlaceholder[]): string {
  for (const p of placeholders) {
    // 占位符可能被 marked 包裹在 <p> 标签中，需要处理块级公式
    html = html.replace(new RegExp(`<p>\\s*${p.id}\\s*</p>`, 'g'), p.html)
    html = html.replace(new RegExp(p.id, 'g'), p.html)
  }
  return html
}

/* ===================== SVG 图形渲染 ===================== */

/** 从 AI 回复中抽取 SVG（```svg 代码块，或直接输出的 <svg>…</svg>） */
const SVG_FENCE_RE = /```(?:svg|xml)?[ \t]*\r?\n([\s\S]*?)```/g
const SVG_BARE_RE = /<svg[\s\S]*?<\/svg>/gi

/** SVG 消毒配置：仅允许图形相关标签/属性，脚本与事件处理器一律移除 */
const SVG_SANITIZE_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'image', 'use', 'animate', 'set'],
  FORBID_ATTR: ['onload', 'onclick', 'onerror', 'href', 'xlink:href'],
}

/** HTML 转义（用于源码回显） */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 消毒并渲染一个 SVG 片段，返回可直接插入的 HTML */
function renderSvgBlock(source: string): string {
  const cleaned = DOMPurify.sanitize(source, SVG_SANITIZE_CONFIG)
  const lang = useLanguageStore.getState().language
  const sourceLabel = translate(lang, 'chat.svgSource' as TranslationKey)

  // 消毒后没有 <svg> 说明内容不是有效图形，退回普通代码块展示
  if (!/<svg[\s>]/i.test(cleaned)) {
    return `<pre><code>${escapeHtml(source)}</code></pre>`
  }

  return (
    '<div class="svgBlock">' +
    `<div class="svgBlockCanvas">${cleaned}</div>` +
    '<details class="svgBlockSource">' +
    `<summary>${sourceLabel}</summary>` +
    `<pre><code>${escapeHtml(source)}</code></pre>` +
    '</details>' +
    '</div>'
  )
}

/**
 * 把 SVG 图形替换为占位符，避免被 marked 当作文本转义
 * 返回替换后的文本与「占位符 → HTML」映射
 */
function extractSvg(text: string): { text: string; svgs: MathPlaceholder[] } {
  const svgs: MathPlaceholder[] = []
  let counter = 0

  const stash = (source: string): string => {
    const trimmed = source.trim()
    // 代码块里必须真的含 <svg>，否则留给 marked 当普通代码处理
    if (!/<svg[\s>]/i.test(trimmed)) return source
    const id = `CHARTSVG${counter}ENDSVG`
    counter++
    svgs.push({ id, html: renderSvgBlock(trimmed) })
    return id
  }

  // ```svg / ```xml 代码块
  text = text.replace(SVG_FENCE_RE, (match, body: string) => stash(body))
  // 直接输出的裸 <svg>
  text = text.replace(SVG_BARE_RE, (match) => stash(match))

  return { text, svgs }
}

export function renderMarkdown(content: string): string {
  if (!content) return ''

  // 1. 先抽取 SVG 图形（其中已单独消毒，避免被当作纯文本转义）
  const { text: textWithoutSvg, svgs } = extractSvg(content)

  // 2. 提取数学公式，替换为占位符
  const { text: textWithPlaceholders, placeholders } = extractAndRenderMath(textWithoutSvg)

  // 3. 解析 Markdown
  const rawHtml = marked.parse(textWithPlaceholders) as string

  // 4. 恢复数学公式与 SVG 图形
  const htmlWithMath = restoreMath(restoreMath(rawHtml, placeholders), svgs)

  // 5. 消毒（允许 KaTeX 与 SVG 所需的标签和属性）
  return DOMPurify.sanitize(htmlWithMath, {
    ADD_TAGS: ['span', 'math', 'semantics', 'annotation', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mroot', 'mtext', 'mspace', 'mtable', 'mtr', 'mtd', 'mover', 'munder', 'munderover', 'mstyle', 'merror', 'mpadded', 'mphantom', 'mfenced', 'msubsup', 'maligngroup', 'malignmark', 'maction', 'mlongdiv', 'mscarries', 'mscarry', 'msgroup', 'msline', 'msrow', 'mstack', 'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'defs', 'marker', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'pattern', 'filter', 'feGaussianBlur', 'feOffset', 'feBlend', 'feColorMatrix', 'title', 'desc', 'details', 'summary', 'pre', 'code'],
    ADD_ATTR: ['class', 'style', 'aria-hidden', 'role', 'encoding', 'xmlns', 'viewBox', 'd', 'fill', 'height', 'width', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'transform', 'points', 'preserveAspectRatio', 'open', 'rx', 'ry', 'cx', 'cy', 'r', 'dx', 'dy', 'font-size', 'font-weight', 'font-family', 'text-anchor', 'dominant-baseline', 'marker-end', 'marker-start', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'offset', 'stop-color', 'stop-opacity', 'id'],
  })
}

/** 将 Markdown 内容渲染为安全的内联 HTML（不包裹 <p>，适合放在 span/按钮等内联元素中） */
export function renderInlineMarkdown(content: string): string {
  if (!content) return ''

  // 1. 提取数学公式，替换为占位符
  const { text: textWithPlaceholders, placeholders } = extractAndRenderMath(content)

  // 2. 解析内联 Markdown
  const rawHtml = marked.parseInline(textWithPlaceholders) as string

  // 3. 恢复数学公式
  const htmlWithMath = restoreMath(rawHtml, placeholders)

  // 4. 消毒
  return DOMPurify.sanitize(htmlWithMath, {
    ADD_TAGS: ['span', 'math', 'semantics', 'annotation', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mroot', 'mtext', 'mspace', 'mtable', 'mtr', 'mtd', 'mover', 'munder', 'munderover', 'mstyle', 'merror', 'mpadded', 'mphantom', 'mfenced', 'msubsup'],
    ADD_ATTR: ['class', 'style', 'aria-hidden', 'role', 'encoding', 'xmlns', 'viewBox', 'd', 'fill', 'height', 'width', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'transform', 'points', 'preserveAspectRatio', 'encoding'],
  })
}
