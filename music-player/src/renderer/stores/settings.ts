import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getServerUrl, setServerUrl } from '../config'

export const useSettingsStore = defineStore('settings', () => {
  const defaultVolume = ref(70)
  const serverUrl = ref(getServerUrl())
  const shortcuts = ref<Record<string, string>>({
    'playPause': 'Space',
    'next': 'Ctrl+Right',
    'prev': 'Ctrl+Left',
    'volumeUp': 'Ctrl+Up',
    'volumeDown': 'Ctrl+Down',
  })

  function updateServerUrl(url: string) {
    serverUrl.value = url
    setServerUrl(url)
  }

  function updateSettings(partial: Partial<{
    defaultVolume: number
    shortcuts: Record<string, string>
  }>) {
    if (partial.defaultVolume !== undefined) defaultVolume.value = partial.defaultVolume
    if (partial.shortcuts !== undefined) shortcuts.value = partial.shortcuts
  }

  return { defaultVolume, serverUrl, shortcuts, updateServerUrl, updateSettings }
})
