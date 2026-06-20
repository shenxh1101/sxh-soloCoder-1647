import { create } from 'zustand'

interface AppState {
  theme: 'light' | 'dark'
  collapsed: boolean
  setTheme: (theme: 'light' | 'dark') => void
  toggleCollapsed: () => void
}

const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  collapsed: false,
  setTheme: (theme) => set({ theme }),
  toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed }))
}))

export default useAppStore
