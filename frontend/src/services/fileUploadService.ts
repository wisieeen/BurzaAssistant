// File upload service for audio transcription
import { getApiUrl, BACKEND_CONFIG } from '@/config/backend'
import { TranscriptionResult } from './websocketService'

export interface FileUploadResult {
  success: boolean
  result?: TranscriptionResult
  error?: string
}

export class FileUploadService {
  /**
   * Upload audio file for transcription
   * @param file Audio file to transcribe
   * @param sessionId Optional session ID to associate with transcription
   * @returns Promise with transcription result
   */
  static async uploadAudioFile(file: File, sessionId?: string): Promise<FileUploadResult> {
    try {
      // Validate file type
      if (!this.isValidAudioFile(file)) {
        return {
          success: false,
          error: 'Invalid file type. Please select an audio file (mp3, wav, m4a, ogg, etc.)'
        }
      }

      // Validate file size (limit to 100MB)
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'File too large. Please select a file smaller than 100MB'
        }
      }

      // Create FormData
      const formData = new FormData()
      formData.append('file', file)
      
      // Add session ID if provided
      if (sessionId) {
        formData.append('session_id', sessionId)
      }

      // Upload file
      const response = await fetch(getApiUrl('/api/transcription'), {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const result = await response.json()
      
      // Convert backend result to frontend format
      const transcriptionResult: TranscriptionResult = {
        success: result.success || true,
        text: result.text || '',
        language: result.language || 'unknown',
        segments: result.segments || [],
        model: result.model || 'unknown',
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        error: result.error
      }

      return {
        success: true,
        result: transcriptionResult
      }

    } catch (error) {
      console.error('File upload failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file'
      }
    }
  }

  /**
   * Check if file is a valid audio file
   * @param file File to validate
   * @returns true if valid audio file
   */
  static isValidAudioFile(file: File): boolean {
    const validTypes = [
      'audio/mpeg',      // mp3
      'audio/wav',       // wav
      'audio/x-wav',     // wav
      'audio/mp4',       // m4a
      'audio/aac',       // aac
      'audio/ogg',       // ogg
      'audio/webm',      // webm
      'audio/flac',      // flac
      'audio/x-m4a',     // m4a
      'audio/m4a'        // m4a
    ]

    // Check MIME type
    if (validTypes.includes(file.type)) {
      return true
    }

    // Check file extension as fallback
    const validExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm', '.flac']
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    return validExtensions.includes(extension)
  }

  /**
   * Format file size for display
   * @param bytes File size in bytes
   * @returns Formatted size string
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
