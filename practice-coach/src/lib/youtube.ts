/** Loads the YouTube IFrame Player API once. Rejects when offline / blocked. */
let promise: Promise<typeof YT> | null = null

export function loadYouTubeApi(timeoutMs = 12000): Promise<typeof YT> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (promise) return promise
  promise = new Promise<typeof YT>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady
    const timer = setTimeout(() => {
      promise = null
      reject(new Error('timeout'))
    }, timeoutMs)
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer)
      prev?.()
      resolve(window.YT!)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    s.onerror = () => {
      clearTimeout(timer)
      promise = null
      s.remove()
      reject(new Error('load'))
    }
    document.head.appendChild(s)
  })
  return promise
}

export const ytWatchUrl = (id: string, t?: number) => `https://www.youtube.com/watch?v=${id}${t ? `&t=${Math.floor(t)}s` : ''}`
export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`

/** Human message for IFrame API error codes. */
export function ytErrorMessage(code: number | 'offline'): string {
  if (code === 'offline') return "The video player needs a connection. Everything else works offline."
  if (code === 101 || code === 150 || code === 153) return "The creator doesn't allow this video to play inside other apps."
  if (code === 100) return 'This video was removed or made private.'
  if (code === 2) return "That video ID isn't valid."
  return "The video couldn't play here."
}
