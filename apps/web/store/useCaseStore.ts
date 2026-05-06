import { create } from 'zustand'

export interface AnalysisResult {
  overview: string
  laws: Array<{ section: string; description: string }>
  precedents: Array<{ name: string; relevance: string; url?: string }>
  arguments: { plaintiff: string[]; defendant: string[] }
  gaps: string[]
  strengthScore: number
}

interface CaseState {
  currentCaseId: string | null
  analysisResult: AnalysisResult | null
  setAnalysisResult: (result: AnalysisResult) => void
  updateAnalysisScore: (score: number) => void
}

export const useCaseStore = create<CaseState>((set) => ({
  currentCaseId: null,
  analysisResult: null,
  setAnalysisResult: (result) => set({ analysisResult: result }),
  updateAnalysisScore: (score) => set((state) => ({
    analysisResult: state.analysisResult ? { ...state.analysisResult, strengthScore: score } : null
  })),
}))
