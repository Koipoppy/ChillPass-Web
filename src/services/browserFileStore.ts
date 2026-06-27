/**
 * 浏览器文件存储服务
 * 使用 IndexedDB 持久化用户上传的课件文件内容
 * 替代 Electron 的文件系统访问能力
 */

const DB_NAME = 'chillpass-files'
const DB_VERSION = 1
const STORE_NAME = 'files'

/** 文件元数据 + 内容 */
interface StoredFile {
  id: string
  name: string
  ext: string
  size: number
  buffer: ArrayBuffer
  uploadedAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

/** 打开/创建 IndexedDB 数据库 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })

  return dbPromise
}

/**
 * 存储文件到 IndexedDB
 * @param id 文件唯一 ID（作为路径使用）
 * @param file File 对象
 * @returns 文件元数据
 */
export async function storeFile(
  id: string,
  file: File,
): Promise<{ path: string; name: string; ext: string; size: number }> {
  const buffer = await file.arrayBuffer()
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()

  const stored: StoredFile = {
    id,
    name: file.name,
    ext,
    size: file.size,
    buffer,
    uploadedAt: Date.now(),
  }

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(stored)
    request.onsuccess = () =>
      resolve({ path: id, name: file.name, ext, size: file.size })
    request.onerror = () => reject(request.error)
  })
}

/**
 * 从 IndexedDB 读取文件 ArrayBuffer
 * @param id 文件 ID（即应用中的 path）
 */
export async function readFileBuffer(id: string): Promise<ArrayBuffer> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)
    request.onsuccess = () => {
      const result = request.result as StoredFile | undefined
      if (result) {
        resolve(result.buffer)
      } else {
        reject(new Error(`文件未找到: ${id}`))
      }
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * 从 IndexedDB 读取文件并解码为文本
 * @param id 文件 ID（即应用中的 path）
 */
export async function readTextFile(id: string): Promise<string> {
  const buffer = await readFileBuffer(id)
  return new TextDecoder('utf-8').decode(buffer)
}

/**
 * 检查文件是否存在
 * @param id 文件 ID
 */
export async function fileExists(id: string): Promise<boolean> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.count(id)
    request.onsuccess = () => resolve(request.result > 0)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 获取文件大小
 * @param id 文件 ID
 */
export async function getFileSize(id: string): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)
    request.onsuccess = () => {
      const result = request.result as StoredFile | undefined
      resolve(result?.size ?? 0)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * 删除单个文件
 * @param id 文件 ID
 */
export async function deleteFile(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 清除所有存储的文件
 */
export async function clearAllFiles(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 获取所有已存储文件的元数据列表
 */
export async function getAllFiles(): Promise<
  { id: string; name: string; ext: string; size: number; uploadedAt: number }[]
> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => {
      const results = (request.result || []) as StoredFile[]
      resolve(
        results.map(f => ({
          id: f.id,
          name: f.name,
          ext: f.ext,
          size: f.size,
          uploadedAt: f.uploadedAt,
        })),
      )
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * 获取 IndexedDB 存储总大小（字节）
 */
export async function getStorageSize(): Promise<number> {
  const files = await getAllFiles()
  return files.reduce((sum, f) => sum + f.size, 0)
}
