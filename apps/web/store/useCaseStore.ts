import { create } from 'zustand'

/** Analysis result data structure returned by the legal analysis API. */
export interface AnalysisResult {
  overview: string
  laws: Array<{ section: string; description: string }>
  precedents: Array<{ name: string; relevance: string; url?: string }>
  arguments: { plaintiff: string[]; defendant: string[] }
  gaps: string[]
  strengthScore: number
}

/** Internal state shape for the case analysis Zustand store. */
interface CaseState {
  currentCaseId: string | null
  analysisResult: AnalysisResult | null
  setAnalysisResult: (result: AnalysisResult) => void
  updateAnalysisScore: (score: number) => void
}

/** Zustand store for managing case analysis state across the dashboard. */
export const useCaseStore = create<CaseState>((set) => ({
  currentCaseId: null,
  analysisResult: null,
  setAnalysisResult: (result) => set({ analysisResult: result }),
  updateAnalysisScore: (score) => set((state) => ({
    analysisResult: state.analysisResult ? { ...state.analysisResult, strengthScore: score } : null
  })),
}))
