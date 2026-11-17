/** Minimal typings for the YouTube IFrame Player API (only what we use). */
declare namespace YT {
  interface PlayerVars {
    playsinline?: 0 | 1
    rel?: 0 | 1
    modestbranding?: 0 | 1
    controls?: 0 | 1
    origin?: string
    start?: number
    enablejsapi?: 0 | 1
    cc_load_policy?: 0 | 1
  }
  interface PlayerEvent {
    target: Player
    data: number
  }
  interface PlayerOptions {
    videoId?: string
    width?: string | number
    height?: string | number
    host?: string
    playerVars?: PlayerVars
    events?: {
      onReady?: (e: PlayerEvent) => void
      onStateChange?: (e: PlayerEvent) => void
      onError?: (e: PlayerEvent) => void
      onPlaybackRateChange?: (e: PlayerEvent) => void
    }
  }
  class Player {
    constructor(el: HTMLElement | string, opts: PlayerOptions)
    playVideo(): void
    pauseVideo(): void
    seekTo(seconds: number, allowSeekAhead: boolean): void
    getCurrentTime(): number
    getDuration(): number
    getPlayerState(): number
    setPlaybackRate(rate: number): void
    getPlaybackRate(): number
    getAvailablePlaybackRates(): number[]
    cueVideoById(id: string, start?: number): void
    loadVideoById(id: string, start?: number): void
    destroy(): void
  }
  const PlayerState: { UNSTARTED: -1; ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 }
}
interface Window {
  YT?: typeof YT
  onYouTubeIframeAPIReady?: () => void
}
