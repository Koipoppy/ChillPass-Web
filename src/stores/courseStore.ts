import { create } from 'zustand'
import { nanoid } from 'nanoid'
import * as courseApi from '../api/courses'
import type { Course, CourseFile, ExamPoint, Lesson, LessonContent, Progress, Priority, CourseBundle } from '@types/index'

const emptyProgress: Progress = {
  totalLessons: 0,
  completedLessons: 0,
  chillCoins: 0,
  currentStreak: 0,
}

function createEmptyBundle(course: Course): CourseBundle {
  return {
    course,
    examPoints: [],
    lessons: [],
    progress: emptyProgress,
    rawText: '',
    generatingLessons: false,
    generationProgress: { current: 0, total: 0 },
  }
}

function mapApiCourseToBundle(apiData: any): CourseBundle {
  const course: Course = {
    id: apiData.course.id,
    name: apiData.course.name,
    files: (apiData.course.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.id,
      ext: f.ext,
      size: f.size,
      uploadedAt: f.uploaded_at || f.uploadedAt,
    })),
    status: apiData.course.status || 'ready',
    examDate: apiData.course.exam_date || apiData.course.examDate,
    createdAt: apiData.course.created_at || apiData.course.createdAt,
    updatedAt: apiData.course.updated_at || apiData.course.updatedAt,
  }

  const examPoints: ExamPoint[] = (apiData.examPoints || []).map((ep: any) => ({
    id: ep.id,
    title: ep.title,
    priority: ep.priority,
    description: ep.description || '',
    keyFormulas: ep.keyFormulas || (ep.key_formulas ? JSON.parse(ep.key_formulas) : []),
    examples: ep.examples || [],
    pageRefs: ep.pageRefs || (ep.page_refs ? JSON.parse(ep.page_refs) : []),
    sourceFile: ep.sourceFile || ep.source_file || '',
  }))

  const lessons: Lesson[] = (apiData.lessons || []).map((l: any) => ({
    id: l.id,
    courseId: l.course_id || l.courseId,
    order: l.order_num || l.order,
    title: l.title,
    examPointId: l.exam_point_id || l.examPointId,
    priority: l.priority,
    status: l.status,
    coins: l.coins,
    content: l.content,
    completedAt: l.completed_at || l.completedAt,
    sourceFile: l.source_file || l.sourceFile || '',
  }))

  const progress: Progress = apiData.progress
    ? {
        totalLessons: apiData.progress.totalLessons || 0,
        completedLessons: apiData.progress.completedLessons || 0,
        chillCoins: apiData.progress.chillCoins || 0,
        currentStreak: apiData.progress.currentStreak || 0,
        totalStudyMinutes: apiData.progress.totalStudyMinutes || 0,
      }
    : emptyProgress

  return {
    course,
    examPoints,
    lessons,
    progress,
    rawText: apiData.rawText || apiData.raw_text || '',
    generatingLessons: false,
    generationProgress: { current: 0, total: 0 },
  }
}

interface CourseState {
  courses: CourseBundle[]
  currentCourseId: string | null
  loading: boolean
  error: string | null

  fetchCourses: () => Promise<void>
  createCourse: (name: string) => Promise<string | null>
  switchCourse: (id: string) => void
  renameCourse: (id: string, newName: string) => Promise<void>
  deleteCourse: (id: string) => Promise<void>
  addFiles: (files: CourseFile[]) => void
  setRawText: (text: string) => void
  appendRawText: (text: string) => void
  setExamPoints: (points: ExamPoint[]) => void
  mergeExamPoints: (points: ExamPoint[]) => void
  generateLessons: () => void
  setLessonContent: (lessonId: string, content: LessonContent) => void
  setGeneratingLessons: (generating: boolean, progress?: { current: number; total: number }) => void
  completeLesson: (lessonId: string) => Promise<void>
  skipLesson: (lessonId: string) => Promise<void>
  addStudyCoins: (minutes: number) => void
  spendCoins: (amount: number) => boolean
  setExamDate: (date: string) => Promise<void>
  resetCourse: () => void
  updateFilePaths: (pathMap: Record<string, string>) => void
  exportCourse: (id: string) => void
  importCourse: (data: CourseBundle) => boolean
}

function updateCurrentBundle(state: CourseState, updater: (bundle: CourseBundle) => CourseBundle): Partial<CourseState> {
  if (!state.currentCourseId) return {}
  return {
    courses: state.courses.map(b =>
      b.course.id === state.currentCourseId ? updater(b) : b
    )
  }
}

export const useCourseStore = create<CourseState>()((set, get) => ({
  courses: [],
  currentCourseId: null,
  loading: false,
  error: null,

  fetchCourses: async () => {
    set({ loading: true, error: null })
    try {
      const res = await courseApi.getCourses()
      const bundles = (res.courses || []).map(mapApiCourseToBundle)
      set({
        courses: bundles,
        currentCourseId: bundles.length > 0 ? bundles[0].course.id : null,
        loading: false,
      })
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.error || '加载课程失败' })
    }
  },

  createCourse: async (name) => {
    const trimmedName = name.trim()
    if (!trimmedName) return null

    const existing = get().courses.find(b => b.course.name === trimmedName)
    if (existing) {
      set({ currentCourseId: existing.course.id })
      return null
    }

    try {
      const res = await courseApi.createCourse(trimmedName)
      const bundle = mapApiCourseToBundle(res)
      set(state => ({
        courses: [...state.courses, bundle],
        currentCourseId: bundle.course.id,
      }))
      return bundle.course.id
    } catch (err: any) {
      console.error('[CourseStore] 创建课程失败:', err)
      return null
    }
  },

  switchCourse: (id) => {
    set({ currentCourseId: id })
  },

  renameCourse: async (id, newName) => {
    const name = newName.trim()
    if (!name) return
    try {
      await courseApi.renameCourse(id, name)
      set(state => ({
        courses: state.courses.map(bundle =>
          bundle.course.id === id ? { ...bundle, course: { ...bundle.course, name } } : bundle
        ),
      }))
    } catch (err) {
      console.error('[CourseStore] 重命名失败:', err)
    }
  },

  deleteCourse: async (id) => {
    try {
      await courseApi.deleteCourse(id)
      set(state => {
        const courses = state.courses.filter(b => b.course.id !== id)
        const currentCourseId = state.currentCourseId === id
          ? (courses[0]?.course.id ?? null)
          : state.currentCourseId
        return { courses, currentCourseId }
      })
    } catch (err) {
      console.error('[CourseStore] 删除失败:', err)
    }
  },

  addFiles: (files) => {
    set(state => updateCurrentBundle(state, bundle => ({
      ...bundle,
      course: {
        ...bundle.course,
        files: [...bundle.course.files, ...files],
        status: 'uploaded' as const,
        updatedAt: Date.now(),
      }
    })))
  },

  setRawText: (text) => {
    set(state => updateCurrentBundle(state, bundle => ({
      ...bundle,
      course: { ...bundle.course, status: 'uploaded' as const, updatedAt: Date.now() },
      rawText: text,
    })))
  },

  appendRawText: (text) => {
    set(state => updateCurrentBundle(state, bundle => ({
      ...bundle,
      course: { ...bundle.course, status: 'uploaded' as const, updatedAt: Date.now() },
      rawText: bundle.rawText + '\n\n' + text,
    })))
  },

  setExamPoints: (points) => {
    const courseId = get().currentCourseId
    set(state => {
      const updated = updateCurrentBundle(state, bundle => ({
        ...bundle,
        course: { ...bundle.course, status: 'ready' as const, updatedAt: Date.now() },
        examPoints: points,
      }))
      if (courseId) {
        const currentBundle = updated.courses?.find(b => b.course.id === courseId)
        const currentName = currentBundle?.course.name
        if (currentName) {
          updated.courses = updated.courses.filter(b =>
            b.course.id === courseId || b.course.status === 'ready' || b.course.name !== currentName
          )
        }
      }
      return updated
    })
    get().generateLessons()
  },

  mergeExamPoints: (newPoints) => {
    const state = get()
    if (!state.currentCourseId) return
    const bundle = state.courses.find(b => b.course.id === state.currentCourseId)
    if (!bundle) return

    const existingTitles = new Set(bundle.examPoints.map(p => p.title))
    const trulyNewPoints = newPoints.filter(p => !existingTitles.has(p.title))

    if (trulyNewPoints.length === 0) {
      set(s => updateCurrentBundle(s, b => ({
        ...b,
        course: { ...b.course, status: 'ready' as const, updatedAt: Date.now() },
      })))
      return
    }

    const allPoints = [...bundle.examPoints, ...trulyNewPoints]
    const priorityOrder: Record<Priority, number> = { must: 0, high: 1, know: 2 }
    const sortedPoints = [...allPoints].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    const existingLessons = bundle.lessons
    const newLessons: Lesson[] = trulyNewPoints.map(point => ({
      id: nanoid(),
      courseId: bundle.course.id,
      order: 0,
      title: point.title,
      examPointId: point.id,
      priority: point.priority,
      status: 'locked' as const,
      coins: point.priority === 'must' ? 40 : point.priority === 'high' ? 35 : 30,
      sourceFile: point.sourceFile,
    }))

    const allLessons = [...existingLessons, ...newLessons]
    const sortedLessons = [...allLessons].sort((a, b) => {
      const pa = priorityOrder[a.priority]
      const pb = priorityOrder[b.priority]
      if (pa !== pb) return pa - pb
      return 0
    })

    let foundFirstIncomplete = false
    const reorderedLessons = sortedLessons.map((lesson, index) => {
      let status = lesson.status
      if (status !== 'completed') {
        if (!foundFirstIncomplete) {
          status = 'available'
          foundFirstIncomplete = true
        } else {
          status = 'locked'
        }
      }
      return { ...lesson, order: index + 1, status }
    })

    set(s => updateCurrentBundle(s, b => ({
      ...b,
      course: { ...b.course, status: 'ready' as const, updatedAt: Date.now() },
      examPoints: sortedPoints,
      lessons: reorderedLessons,
      progress: { ...b.progress, totalLessons: reorderedLessons.length },
    })))
  },

  generateLessons: () => {
    const state = get()
    if (!state.currentCourseId) return
    const bundle = state.courses.find(b => b.course.id === state.currentCourseId)
    if (!bundle || bundle.examPoints.length === 0) return

    const priorityOrder: Record<Priority, number> = { must: 0, high: 1, know: 2 }
    const sorted = [...bundle.examPoints].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    const lessons: Lesson[] = sorted.map((point, index) => ({
      id: nanoid(),
      courseId: bundle.course.id,
      order: index + 1,
      title: point.title,
      examPointId: point.id,
      priority: point.priority,
      status: index === 0 ? 'available' as const : 'locked' as const,
      coins: point.priority === 'must' ? 40 : point.priority === 'high' ? 35 : 30,
      sourceFile: point.sourceFile,
    }))

    set(s => updateCurrentBundle(s, b => ({
      ...b,
      lessons,
      progress: { totalLessons: lessons.length, completedLessons: 0, chillCoins: 0, currentStreak: 0 },
    })))
  },

  setLessonContent: (lessonId, content) => {
    set(state => updateCurrentBundle(state, bundle => ({
      ...bundle,
      lessons: bundle.lessons.map(l => l.id === lessonId ? { ...l, content } : l),
    })))
  },

  setGeneratingLessons: (generating, progress) => {
    set(state => updateCurrentBundle(state, bundle => ({
      ...bundle,
      generatingLessons: generating,
      generationProgress: progress ?? bundle.generationProgress,
    })))
  },

  completeLesson: async (lessonId) => {
    const state = get()
    if (!state.currentCourseId) return
    const bundle = state.courses.find(b => b.course.id === state.currentCourseId)
    if (!bundle) return

    try {
      await courseApi.completeLesson(state.currentCourseId, lessonId)
      set(s => updateCurrentBundle(s, bundle => {
        const lesson = bundle.lessons.find(l => l.id === lessonId)
        if (!lesson || lesson.status === 'completed') return bundle

        const reward = typeof lesson.coins === 'number' ? lesson.coins : 30
        const currentCoins = typeof bundle.progress.chillCoins === 'number' ? bundle.progress.chillCoins : 0

        const updatedLessons = bundle.lessons.map(l => {
          if (l.id === lessonId) return { ...l, status: 'completed' as const, completedAt: Date.now() }
          if (l.order === lesson.order + 1 && l.status === 'locked') return { ...l, status: 'available' as const }
          return l
        })

        return {
          ...bundle,
          lessons: updatedLessons,
          progress: {
            ...bundle.progress,
            completedLessons: bundle.progress.completedLessons + 1,
            chillCoins: currentCoins + reward,
          },
        }
      }))
    } catch (err) {
      console.error('[CourseStore] 完成关卡失败:', err)
    }
  },

  skipLesson: async (lessonId) => {
    const state = get()
    if (!state.currentCourseId) return
    const bundle = state.courses.find(b => b.course.id === state.currentCourseId)
    if (!bundle) return
    const lesson = bundle.lessons.find(l => l.id === lessonId)
    if (!lesson || lesson.status === 'completed' || lesson.status === 'available') return

    try {
      await courseApi.skipLesson(state.currentCourseId, lessonId)
      const cost = typeof lesson.coins === 'number' ? lesson.coins : 30
      set(s => updateCurrentBundle(s, b => {
        const updatedLessons = b.lessons.map(l => {
          if (l.id === lessonId) return { ...l, status: 'available' as const }
          return l
        })
        const coins = typeof b.progress.chillCoins === 'number' ? b.progress.chillCoins : 0
        return {
          ...b,
          lessons: updatedLessons,
          progress: { ...b.progress, chillCoins: Math.max(0, coins - cost) },
        }
      }))
    } catch (err: any) {
      if (err.response?.data?.error?.includes('Chill币不足')) {
        throw new Error('Chill币不足')
      }
      console.error('[CourseStore] 跳关失败:', err)
    }
  },

  addStudyCoins: (minutes) => {
    const coins = Math.floor(minutes)
    if (!Number.isFinite(coins) || coins <= 0) return
    set(state => updateCurrentBundle(state, bundle => {
      const currentCoins = typeof bundle.progress.chillCoins === 'number' ? bundle.progress.chillCoins : 0
      const currentMinutes = typeof bundle.progress.totalStudyMinutes === 'number' ? bundle.progress.totalStudyMinutes : 0
      return {
        ...bundle,
        progress: {
          ...bundle.progress,
          chillCoins: currentCoins + coins,
          totalStudyMinutes: currentMinutes + coins,
        },
      }
    }))
  },

  spendCoins: (amount) => {
    if (!Number.isFinite(amount) || amount <= 0) return false
    const state = get()
    if (!state.currentCourseId) return false
    const bundle = state.courses.find(b => b.course.id === state.currentCourseId)
    if (!bundle) return false
    const currentCoins = typeof bundle.progress.chillCoins === 'number' ? bundle.progress.chillCoins : 0
    if (currentCoins < amount) return false
    set(s => updateCurrentBundle(s, b => ({
      ...b,
      progress: { ...b.progress, chillCoins: Math.max(0, currentCoins - amount) },
    })))
    return true
  },

  setExamDate: async (date) => {
    const state = get()
    if (state.currentCourseId) {
      try {
        await courseApi.setExamDate(state.currentCourseId, date)
      } catch (err) { console.error('[CourseStore] 设置考试日期失败:', err) }
    }
    set(state => updateCurrentBundle(state, bundle => ({
      ...bundle,
      course: { ...bundle.course, examDate: date, updatedAt: Date.now() },
    })))
  },

  resetCourse: () => {
    set(state => updateCurrentBundle(state, bundle => createEmptyBundle({
      ...bundle.course,
      files: [],
      status: 'empty' as const,
      examDate: undefined,
      updatedAt: Date.now(),
    })))
  },

  updateFilePaths: (pathMap) => {
    set(state => ({
      courses: state.courses.map(bundle => ({
        ...bundle,
        course: {
          ...bundle.course,
          files: bundle.course.files.map(f => {
            const newPath = pathMap[f.path]
            return newPath ? { ...f, path: newPath } : f
          }),
        },
      })),
    }))
  },

  exportCourse: (id) => {
    const bundle = get().courses.find(b => b.course.id === id)
    if (!bundle) return
    const json = JSON.stringify(bundle, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const date = new Date()
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const a = document.createElement('a')
    a.href = url
    a.download = `ChillPass-${bundle.course.name}-${dateStr}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  importCourse: (data) => {
    if (!data || typeof data !== 'object') return false
    if (!data.course || !Array.isArray(data.examPoints) || !Array.isArray(data.lessons)) return false

    const incomingPointTitles = new Set(data.examPoints.map(p => p.title))
    const existingDuplicate = get().courses.find(b => {
      if (b.course.name === data.course.name) return true
      if (b.examPoints.length === 0 || incomingPointTitles.size === 0) return false
      const existingTitles = new Set(b.examPoints.map(p => p.title))
      let overlap = 0
      for (const t of incomingPointTitles) { if (existingTitles.has(t)) overlap++ }
      const overlapRate = overlap / Math.max(incomingPointTitles.size, existingTitles.size)
      return overlapRate > 0.8
    })

    if (existingDuplicate) {
      set({ currentCourseId: existingDuplicate.course.id })
      return false
    }

    const newCourseId = nanoid()
    const examPointIdMap: Record<string, string> = {}
    const newExamPoints: ExamPoint[] = data.examPoints.map(p => {
      const newId = nanoid()
      examPointIdMap[p.id] = newId
      return { ...p, id: newId }
    })
    const newLessons: Lesson[] = data.lessons.map(l => ({
      ...l,
      id: nanoid(),
      courseId: newCourseId,
      examPointId: examPointIdMap[l.examPointId] ?? l.examPointId,
    }))

    const newBundle: CourseBundle = {
      ...data,
      course: { ...data.course, id: newCourseId, status: 'ready' as const, updatedAt: Date.now() },
      examPoints: newExamPoints,
      lessons: newLessons,
      generatingLessons: false,
      generationProgress: { current: 0, total: 0 },
    }

    set(state => ({ courses: [...state.courses, newBundle], currentCourseId: newCourseId }))
    return true
  },
}))

export function useCurrentBundle(): CourseBundle | null {
  return useCourseStore(s => {
    if (!s.currentCourseId) return null
    return s.courses.find(b => b.course.id === s.currentCourseId) ?? null
  })
}
