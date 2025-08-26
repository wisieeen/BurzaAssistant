// Voice Transcription App Types

export interface TranscriptionSegment {
  id: string
  text: string
  timestamp: Date
  confidence: number
  isFinal: boolean
}

export interface VoiceSettings {
  language: string
  audioQuality: 'low' | 'medium' | 'high'
  autoSave: boolean
  noiseReduction: boolean
  hotkey: string
}

export interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  startTime: Date | null
  duration: number // in seconds
  audioLevel: number // 0-100
}

export interface TranscriptionHistory {
  id: string
  title: string
  content: string
  createdAt: Date
  duration: number
  language: string
  saved: boolean
}

// Panel layout types (for future resizing/repositioning)
export interface PanelLayout {
  id: string
  type: 'input' | 'output' | 'control' | 'settings'
  gridPosition: { row: number; col: number }
  gridSpan: { rows: number; cols: number }
  isVisible: boolean
  isMinimized: boolean
}

export interface AppState {
  recording: RecordingState
  settings: VoiceSettings
  currentTranscription: string
  transcriptionHistory: TranscriptionHistory[]
  panelLayout: PanelLayout[]
}
