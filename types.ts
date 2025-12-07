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
  AUTO = 'Auto-detect',
  ENGLISH = 'English',
  RUSSIAN = 'Russian',
  BURMESE = 'Burmese'
}

export interface ProcessingResult {
  id: string;
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