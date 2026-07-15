export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
}

export interface RecordingStatusEvent {
  isRecording: boolean;
}

export interface SpeechErrorEvent {
  message: string;
}

export interface PermissionResult {
  granted: boolean;
}
