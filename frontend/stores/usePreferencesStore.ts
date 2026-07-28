export const usePreferencesStore = defineStore(
  'preferences',
  () => {
    const sidebarCollapsed = ref(false)
    const theme = ref<'light' | 'dark'>('light')

    function toggleSidebar() {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }

    return { sidebarCollapsed, theme, toggleSidebar }
  },
  { persist: true },
)
