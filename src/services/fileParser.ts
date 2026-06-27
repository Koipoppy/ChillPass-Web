/**
 * 文件解析服务
 * 支持 PDF、PPTX、TXT、MD
 */

/**
 * 解析文件，返回文本内容
 */
export async function parseFile(filePath: string, ext: string): Promise<string> {
  switch (ext) {
    case '.pdf':
      return parsePDF(filePath)
    case '.pptx':
    case '.ppt':
      return parsePPT(filePath)
    case '.txt':
    case '.md':
      return parseText(filePath)
    default:
      throw new Error(`不支持的文件格式: ${ext}`)
  }
}

/**
 * 解析 PDF 文件
 */
async function parsePDF(filePath: string): Promise<string> {
  const w = globalThis as any
  if (!w.electronAPI) throw new Error('文件 API 不可用')

  const buffer = await w.electronAPI.readFileBuffer(filePath)
  const uint8Array = new Uint8Array(buffer)

  // 动态导入 pdfjs-dist
  const pdfjs = await import('pdfjs-dist')

  // 设置 worker
  const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default

  const loadingTask = pdfjs.getDocument({ data: uint8Array })
  const pdf = await loadingTask.promise

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
    fullText += `\n--- 第 ${i} 页 ---\n${pageText}\n`
  }

  return fullText.trim()
}

/**
 * 解析 PPTX 文件
 * PPTX 是 ZIP 格式，包含 XML 文件
 */
async function parsePPT(filePath: string): Promise<string> {
  const w = globalThis as any
  if (!w.electronAPI) throw new Error('文件 API 不可用')

  const buffer = await w.electronAPI.readFileBuffer(filePath)
  const arrayBuffer = buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer).buffer

  // 使用 JSZip 解析 PPTX
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(arrayBuffer)

  let fullText = ''
  const slideFiles = Object.keys(zip.files)
    .filter(name => name.match(/ppt\/slides\/slide\d+\.xml/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0')
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0')
      return numA - numB
    })

  for (const slideFile of slideFiles) {
    const content = await zip.files[slideFile].async('text')
    // 提取 XML 中的文本
    const texts = content.match(/<a:t>([^<]*)<\/a:t>/g) || []
    const slideText = texts
      .map(t => t.replace(/<\/?a:t>/g, ''))
      .join(' ')
    const slideNum = slideFile.match(/slide(\d+)/)?.[1] || '?'
    fullText += `\n--- 幻灯片 ${slideNum} ---\n${slideText}\n`
  }

  return fullText.trim()
}

/**
 * 解析纯文本文件
 */
async function parseText(filePath: string): Promise<string> {
  const w = globalThis as any
  if (!w.electronAPI) throw new Error('文件 API 不可用')
  return await w.electronAPI.readTextFile(filePath)
}

/**
 * 清理文本（去除多余空白、换行）
 */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}
