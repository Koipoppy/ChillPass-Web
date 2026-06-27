import { marked } from 'marked'
import DOMPurify from 'dompurify'
import katex from 'katex'

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

export function renderMarkdown(content: string): string {
  if (!content) return ''

  // 1. 提取数学公式，替换为占位符
  const { text: textWithPlaceholders, placeholders } = extractAndRenderMath(content)

  // 2. 解析 Markdown
  const rawHtml = marked.parse(textWithPlaceholders) as string

  // 3. 恢复数学公式
  const htmlWithMath = restoreMath(rawHtml, placeholders)

  // 4. 消毒（允许 KaTeX 所需的标签和属性）
  return DOMPurify.sanitize(htmlWithMath, {
    ADD_TAGS: ['span', 'math', 'semantics', 'annotation', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mroot', 'mtext', 'mspace', 'mtable', 'mtr', 'mtd', 'mover', 'munder', 'munderover', 'mstyle', 'merror', 'mpadded', 'mphantom', 'mfenced', 'msubsup', 'maligngroup', 'malignmark', 'maction', 'mlongdiv', 'mscarries', 'mscarry', 'msgroup', 'msline', 'msrow', 'mstack'],
    ADD_ATTR: ['class', 'style', 'aria-hidden', 'role', 'encoding', 'xmlns', 'viewBox', 'd', 'fill', 'height', 'width', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'transform', 'points', 'preserveAspectRatio', 'encoding'],
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
