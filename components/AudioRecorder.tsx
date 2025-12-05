import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';
import { SourceLanguage } from '../types';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isProcessing: boolean;
  sourceLanguage: SourceLanguage;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, isProcessing, sourceLanguage }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const getSupportedMimeType = () => {
    const types = [
      'audio/wav', // Native WAV (lossless) - Preferred for AI
      'audio/webm;codecs=pcm', // PCM in WebM (lossless-like)
      'audio/webm;codecs=opus', // High quality compressed
      'audio/webm',
      'audio/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm'; // Fallback
  };

  const startRecording = async () => {
    setError(null);
    try {
      // Audio quality constraints for noise suppression and echo cancellation
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // Mono is clear for speech
          sampleRate: 48000 // Higher sample rate for better quality
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const options: MediaRecorderOptions = {
        mimeType: mimeType,
      };

      // Set high bitrate for compressed formats (256 kbps)
      // PCM/WAV ignores this as it's uncompressed
      if (mimeType.includes('opus') || mimeType.includes('mp4') || mimeType === 'audio/webm') {
        options.audioBitsPerSecond = 256000;
      }

      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn("High quality config failed, falling back to default", e);
        mediaRecorder = new MediaRecorder(stream);
        mimeTypeRef.current = mediaRecorder.mimeType;
      }

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        onRecordingComplete(blob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      // Start timer
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("မိုက်ခရိုဖုန်း အသုံးပြုခွင့် မရရှိပါ။ (Microphone access denied)");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-slate-800 font-burmese">
          {isRecording ? 'အသံဖမ်းယူနေပါသည်...' : 'အသံဖမ်းယူရန် နှိပ်ပါ'}
        </h3>
        <p className="text-sm text-slate-500 font-burmese">
          {isRecording ? `${sourceLanguage} ဘာသာစကားဖြင့် ပြောဆိုပါ` : 'စတင်ရန် မိုက်ခရိုဖုန်းပုံကို နှိပ်ပါ'}
        </p>
      </div>

      <div className="relative group">
        {/* Pulse effect rings */}
        {isRecording && (
          <>
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
            <div className="absolute -inset-2 bg-red-500 rounded-full animate-pulse opacity-10"></div>
          </>
        )}
        
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`relative z-10 flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRecording ? (
            <Square className="w-10 h-10 text-white fill-current" />
          ) : (
            <Mic className="w-10 h-10 text-white" />
          )}
        </button>
      </div>

      <div className="font-mono text-2xl text-slate-700 tabular-nums">
        {formatDuration(duration)}
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm font-burmese">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};