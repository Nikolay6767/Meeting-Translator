export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export enum NoteType {
  AUTO = 'AUTO',
  MEETING = 'MEETING',
  LECTURE = 'LECTURE'
}

export enum SourceLanguage {
  ENGLISH = 'English',
  RUSSIAN = 'Russian'
}

export interface ProcessingResult {
  text: string;
  type: string;
  timestamp: string;
}

// Augment window to include html2pdf
declare global {
  interface Window {
    html2pdf: any;
  }
}