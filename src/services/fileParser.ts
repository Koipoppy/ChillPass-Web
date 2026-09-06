/**
 * 文件解析服务
 * 支持 PDF、PPTX、DOCX、DOC、TXT、MD
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
    case '.docx':
      return parseDocx(filePath)
    case '.doc':
      return parseDoc(filePath)
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

/** 解码 XML 实体（&amp; &lt; &gt; &quot; &apos; 与数字引用） */
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/**
 * 解析 DOCX 文件（Word 2007+，ZIP 容器 + word/document.xml）
 */
async function parseDocx(filePath: string): Promise<string> {
  const w = globalThis as any
  if (!w.electronAPI) throw new Error('文件 API 不可用')

  const buffer = await w.electronAPI.readFileBuffer(filePath)
  const arrayBuffer = buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer).buffer

  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(arrayBuffer)

  const docXml = await zip.file('word/document.xml')?.async('text')
  if (!docXml) throw new Error('无法读取 Word 文档内容（缺少 document.xml），请确认文件为有效的 .docx')

  // 按段落 <w:p> 切分；段内 <w:t> 为文本，<w:tab> 转空格，<w:br>/<w:cr> 转换行
  const paragraphs = docXml.match(/<w:p[\s>][\s\S]*?<\/w:p>|<w:p\/>/g) || []

  const lines = paragraphs.map(p =>
    p
      .replace(/<w:tab[^>]*\/>/g, ' ')
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<w:cr[^>]*\/>/g, '\n')
      .replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, '$1')
      .replace(/<[^>]+>/g, '')
  )

  const text = decodeXmlEntities(lines.join('\n'))
  if (text.trim().length < 5) throw new Error('未能从 Word 文档中提取到文本内容')
  return text.trim()
}

/**
 * 解析 DOC 文件（Word 97-2003 二进制格式，OLE/CFB 复合文档）
 * 流程：解析 CFB 结构 → 读取 WordDocument 流与 Table 流 → FIB 定位分段表（piece table）
 * → 按分段解码文本（UTF-16LE 或单字节压缩编码）
 */
async function parseDoc(filePath: string): Promise<string> {
  const w = globalThis as any
  if (!w.electronAPI) throw new Error('文件 API 不可用')

  const buffer = await w.electronAPI.readFileBuffer(filePath)
  const bytes = new Uint8Array(buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer).buffer)

  // 魔数识别：部分"doc"实际是改了扩展名的 docx/RTF
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return parseDocx(filePath)
  if (bytes[0] === 0x7b && bytes[1] === 0x5c) throw new Error('该文件实为 RTF 格式，请用 Word 另存为 .docx 后重新导入')

  const cfb = new CfbReader(bytes)
  const wordDoc = cfb.readStream('WordDocument')
  if (!wordDoc) throw new Error('无法读取 Word 文档内容（WordDocument 流缺失）')

  // FIB 标志位 bit9 决定表流名：1Table 或 0Table
  const dv = new DataView(wordDoc.buffer, wordDoc.byteOffset, wordDoc.byteLength)
  if (dv.getUint16(0, true) !== 0xa5ec) throw new Error('该文件不是有效的 Word 97-2003 文档')
  const flags = dv.getUint16(0x0a, true)
  const tableStream = cfb.readStream(flags & 0x0200 ? '1Table' : '0Table')

  const fcMin = dv.getUint32(0x18, true)
  const fcMac = dv.getUint32(0x1c, true)
  const fcClx = dv.getUint32(0x01a2, true)
  const lcbClx = dv.getUint32(0x01a6, true)

  const gbkDecoder = new TextDecoder('gbk')
  const utf16Decoder = new TextDecoder('utf-16le')

  let text = ''

  if (tableStream && lcbClx > 0 && fcClx + lcbClx <= tableStream.length) {
    // ── Word 97+：从分段表（piece table）拼装正文 ──
    const pieces = parsePieceTable(tableStream, fcClx, lcbClx)
    for (const piece of pieces) {
      if (piece.compressed) {
        // 单字节压缩分段：PCD 中存的是 (实际偏移/2)，需乘回
        const start = piece.fc * 2
        text += gbkDecoder.decode(wordDoc.subarray(start, start + piece.length))
      } else {
        text += utf16Decoder.decode(wordDoc.subarray(piece.fc, piece.fc + piece.length * 2))
      }
    }
  } else {
    // ── 兜底：无分段表（旧版/简单文档），按 fcMin~fcMac 连续区域解码 ──
    const start = Math.min(fcMin, wordDoc.length)
    const end = Math.min(Math.max(fcMac, start), wordDoc.length)
    let utf16Likely = false
    for (let i = start + 1; i < Math.min(end, start + 128); i += 2) {
      if (wordDoc[i] === 0) { utf16Likely = true; break }
    }
    text = utf16Likely
      ? utf16Decoder.decode(wordDoc.subarray(start, end))
      : gbkDecoder.decode(wordDoc.subarray(start, end))
  }

  // 清理 Word 控制字符：\r 段落、\x07 表格单元格/行尾、\x0b 软换行、\x0c 分页、\x1e 短横线、\x13-\x15 域标记
  text = text
    .replace(/\x07/g, ' ')
    .replace(/\r\x07/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\x0b/g, '\n')
    .replace(/\x0c/g, '\n\n')
    .replace(/\x1e/g, '-')
    .replace(/[\x13\x14\x15]/g, '')
    .replace(/[\x00-\x08\x0e-\x1f]/g, '')

  if (text.replace(/\s/g, '').length < 10) {
    throw new Error('未能从 DOC 文件中提取到有效文本，建议用 Word 将文件另存为 .docx 后重新导入')
  }
  return text.trim()
}

interface DocTextPiece {
  /** 文本在 WordDocument 流中的字节偏移（压缩分段时为 偏移/2） */
  fc: number
  /** 字符数 */
  length: number
  /** 是否单字节压缩编码 */
  compressed: boolean
}

/** 解析分段表（CLX → Pcdt → PlcPcd），跳过属性覆盖段（Prc） */
function parsePieceTable(table: Uint8Array, fcClx: number, lcbClx: number): DocTextPiece[] {
  const dv = new DataView(table.buffer, table.byteOffset, table.byteLength)
  let p = fcClx
  const end = fcClx + lcbClx

  while (p < end) {
    const clxt = table[p]
    if (clxt === 1) {
      // Prc：属性覆盖，跳过（1 字节类型 + 1 字节长度；长度 0xFF 时为 2 字节长度）
      const cb = table[p + 1]
      if (cb === 0xff) {
        const cb2 = dv.getUint16(p + 2, true)
        p += 4 + cb2
      } else {
        p += 2 + cb
      }
    } else if (clxt === 2) {
      // Pcdt：4 字节长度 + PlcPcd
      const plcLen = dv.getUint32(p + 1, true)
      const plcStart = p + 5
      const n = Math.floor((plcLen - 4) / 12)
      const pieces: DocTextPiece[] = []
      for (let i = 0; i < n; i++) {
        const cpStart = dv.getUint32(plcStart + i * 4, true)
        const cpEnd = dv.getUint32(plcStart + (i + 1) * 4, true)
        const pcdOffset = plcStart + (n + 1) * 4 + i * 8
        const rawFc = dv.getUint32(pcdOffset + 2, true)
        const compressed = (rawFc & 0x40000000) !== 0
        pieces.push({
          fc: rawFc & 0x3fffffff,
          length: cpEnd - cpStart,
          compressed,
        })
      }
      return pieces
    } else {
      break
    }
  }
  return []
}

/**
 * 最小 CFB（OLE2 复合文档）读取器：仅支持读取命名流
 * 实现 FAT/DIFAT 链、目录遍历与 Mini Stream（< 4096 字节的小流）
 */
class CfbReader {
  private view: DataView
  private sectorSize: number
  private miniCutoff: number
  private fat: Uint32Array = new Uint32Array(0)
  private miniFat: Uint32Array = new Uint32Array(0)
  private directory: Uint8Array = new Uint8Array(0)
  private data: Uint8Array

  constructor(data: Uint8Array) {
    const magic = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
    if (data.length < 512 || magic.some((b, i) => data[i] !== b)) {
      throw new Error('该文件不是有效的 Word 97-2003 文档（缺少 OLE 复合文档头）')
    }
    this.data = data
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    this.sectorSize = 1 << this.view.getUint16(0x1e, true)
    this.miniCutoff = this.view.getUint32(0x3c, true)
    this.readFat()
    this.readDirectory()
    this.readMiniFat()
  }

  private sectorOffset(sector: number): number {
    return (sector + 1) * this.sectorSize
  }

  private readSectorChain(start: number, fat: Uint32Array): number[] {
    const chain: number[] = []
    let s = start
    const guard = fat.length + 1
    while (s !== 0xfffffffe && s !== 0xffffffff && chain.length <= guard) {
      chain.push(s)
      s = fat[s]
    }
    return chain
  }

  private readSectors(chain: number[]): Uint8Array {
    const out = new Uint8Array(chain.length * this.sectorSize)
    chain.forEach((sector, i) => {
      const off = this.sectorOffset(sector)
      out.set(this.data.subarray(off, off + this.sectorSize), i * this.sectorSize)
    })
    return out
  }

  private readFat(): void {
    const dv = this.view
    const fatSectors: number[] = []
    for (let i = 0; i < 109; i++) {
      const s = dv.getUint32(0x4c + i * 4, true)
      if (s !== 0xffffffff && s !== 0xfffffffe) fatSectors.push(s)
    }
    // 扩展 DIFAT 扇区链
    let difatSector = dv.getUint32(0x48, true)
    const entriesPerDifat = this.sectorSize / 4 - 1
    let guard = 0
    while (difatSector !== 0xfffffffe && difatSector !== 0xffffffff && guard++ < 65536) {
      const base = this.sectorOffset(difatSector)
      for (let i = 0; i < entriesPerDifat; i++) {
        const s = dv.getUint32(base + i * 4, true)
        if (s !== 0xffffffff && s !== 0xfffffffe) fatSectors.push(s)
      }
      difatSector = dv.getUint32(base + entriesPerDifat * 4, true)
    }
    const fat = new Uint32Array(fatSectors.length * (this.sectorSize / 4))
    fatSectors.forEach((sector, i) => {
      const off = this.sectorOffset(sector)
      for (let j = 0; j < this.sectorSize / 4; j++) {
        fat[i * (this.sectorSize / 4) + j] = this.view.getUint32(off + j * 4, true)
      }
    })
    this.fat = fat
  }

  private readDirectory(): void {
    const firstDir = this.view.getUint32(0x30, true)
    this.directory = this.readSectors(this.readSectorChain(firstDir, this.fat))
  }

  private readMiniFat(): void {
    const first = this.view.getUint32(0x40, true)
    if (first === 0xfffffffe || first === 0xffffffff) return
    const chain = this.readSectorChain(first, this.fat)
    const raw = this.readSectors(chain)
    this.miniFat = new Uint32Array(raw.buffer, raw.byteOffset, raw.length / 4)
  }

  private findEntry(name: string): { start: number; size: number } | null {
    for (let off = 0; off + 128 <= this.directory.length; off += 128) {
      const type = this.directory[off + 66]
      if (type !== 2) continue // 2 = stream
      // 条目名为 UTF-16LE，nameLen 为含终止符的字节数（全部从 directory 数组读取）
      const nameLen = Math.min(this.directory[off + 64] | (this.directory[off + 65] << 8), 64)
      let entryName = ''
      for (let i = 0; i < Math.max(0, nameLen - 2) / 2; i++) {
        entryName += String.fromCharCode(
          this.directory[off + i * 2] | (this.directory[off + i * 2 + 1] << 8)
        )
      }
      if (entryName === name) {
        const u32 = (o: number) =>
          this.directory[o] |
          (this.directory[o + 1] << 8) |
          (this.directory[o + 2] << 16) |
          (this.directory[o + 3] << 24)
        return { start: u32(off + 116), size: u32(off + 120) }
      }
    }
    return null
  }

  /** 按名称读取流内容（自动处理 Mini Stream） */
  readStream(name: string): Uint8Array | null {
    const entry = this.findEntry(name)
    if (!entry) return null

    if (entry.size >= this.miniCutoff) {
      const chain = this.readSectorChain(entry.start, this.fat)
      const raw = this.readSectors(chain)
      return raw.subarray(0, entry.size)
    }

    // 小流存放在 Root Entry 的 mini stream 中（目录第一个条目），经 Mini FAT 寻址
    const rootStart =
      this.directory[116] |
      (this.directory[117] << 8) |
      (this.directory[118] << 16) |
      (this.directory[119] << 24)
    const miniStream = this.readSectors(this.readSectorChain(rootStart, this.fat))
    const chain: number[] = []
    let s = entry.start
    const guard = this.miniFat.length + 1
    while (s !== 0xfffffffe && s !== 0xffffffff && chain.length <= guard) {
      chain.push(s)
      s = this.miniFat[s]
    }
    const out = new Uint8Array(chain.length * 64)
    chain.forEach((sector, i) => {
      out.set(miniStream.subarray(sector * 64, sector * 64 + 64), i * 64)
    })
    return out.subarray(0, entry.size)
  }
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
