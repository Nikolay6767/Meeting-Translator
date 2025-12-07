import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, AlertCircle, Pause, Play, Upload } from 'lucide-react';
import { SourceLanguage } from '../types';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isProcessing: boolean;
  sourceLanguage: SourceLanguage;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, isProcessing, sourceLanguage }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);

  // Sync ref with state for animation loop
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus', // Best for speech & size efficiency
      'audio/webm',
      'audio/mp4',
      'audio/wav' // Fallback (large file size)
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm'; // Fallback
  };

  const startVisualizer = (stream: MediaStream) => {
    if (!canvasRef.current) return;

    try {
      // Create or resume AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; // Small size for simple bars
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        if (!canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        // Clear canvas
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        // Check for dark mode to adjust colors
        const isDark = document.documentElement.classList.contains('dark');

        // If paused, draw a flat line or inactive state
        if (isPausedRef.current) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(0, canvas.height/2);
            canvasCtx.lineTo(canvas.width, canvas.height/2);
            canvasCtx.strokeStyle = isDark ? '#475569' : '#e2e8f0'; // slate-600 : slate-200
            canvasCtx.lineWidth = 2;
            canvasCtx.stroke();
            return;
        }

        analyser.getByteFrequencyData(dataArray);

        const barCount = 5; 
        const gap = 6;
        const totalWidth = canvas.width;
        // Calculate bar width to center them
        const contentWidth = 100; // Fixed width for the bars area
        const barWidth = (contentWidth - (gap * (barCount - 1))) / barCount;
        const startX = (totalWidth - contentWidth) / 2;

        for (let i = 0; i < barCount; i++) {
           // Map to lower frequencies where voice lives (indices 1-5 roughly)
           const index = i + 1; 
           const val = dataArray[index] || 0;
           
           const percent = val / 255;
           // Dynamic height with minimum
           const height = Math.max(4, canvas.height * percent * 0.8); 
           const x = startX + i * (barWidth + gap);
           const y = (canvas.height - height) / 2;
           
           canvasCtx.fillStyle = isDark ? '#818cf8' : '#6366f1'; // Indigo 400 : Indigo 500
           
           // Draw rounded pill
           const radius = barWidth / 2;
           canvasCtx.beginPath();
           canvasCtx.roundRect(x, y, barWidth, height, radius);
           canvasCtx.fill();
        }
      };
      draw();
    } catch (e) {
      console.error("Visualizer setup failed:", e);
    }
  };

  const startRecording = async () => {
    setError(null);
    setIsPaused(false);
    try {
      // Audio quality constraints for noise suppression and echo cancellation
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // Mono is sufficient for speech
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Start Visualizer
      startVisualizer(stream);
      
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const options: MediaRecorderOptions = {
        mimeType: mimeType,
      };

      // Set bitrate to 64kbps (sufficient for high quality speech, saves space)
      if (mimeType.includes('opus') || mimeType.includes('webm') || mimeType.includes('mp4')) {
        options.audioBitsPerSecond = 64000;
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
        
        // Stop visualizer loop
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        // Clear canvas
        if (canvasRef.current) {
           const ctx = canvasRef.current.getContext('2d');
           ctx?.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
        }
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

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (isRecording || isPaused)) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setError("ဖိုင်အရွယ်အစား ကြီးလွန်းပါသည် (Max 20MB)");
        return;
      }
      onRecordingComplete(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusTitle = () => {
    if (isPaused) return 'ခေတ္တရပ်နားထားသည်';
    if (isRecording) return 'အသံဖမ်းယူနေပါသည်...';
    return 'အသံဖမ်းယူပါ သို့မဟုတ် ဖိုင်တင်ပါ';
  };

  const getStatusMessage = () => {
    if (isPaused) return 'ပြန်လည်စတင်ရန် Play ခလုတ်ကို နှိပ်ပါ';
    if (isRecording) {
         if (sourceLanguage === SourceLanguage.AUTO) return 'စတင်ပြောဆိုနိုင်ပါပြီ...';
         return `${sourceLanguage} ဘာသာစကားဖြင့် ပြောဆိုပါ`;
    }
    return 'စတင်ရန် မိုက်ခရိုဖုန်းကိုနှိပ်ပါ၊ သို့မဟုတ် အသံဖိုင်တင်ပါ';
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md mx-auto p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white font-burmese">
          {getStatusTitle()}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-burmese">
          {getStatusMessage()}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-6">
        {/* Visualizer Canvas - Always present but transparent if not recording to keep layout stable */}
        <div className={`h-12 w-full flex justify-center items-center transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
             <canvas ref={canvasRef} width={200} height={48} className="w-[200px] h-[48px]" />
        </div>

        <div className="flex items-center justify-center gap-6">
            
            {/* Pause/Resume Button */}
            {isRecording && (
            <button
                onClick={isPaused ? resumeRecording : pauseRecording}
                disabled={isProcessing}
                className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-all duration-200 border border-slate-200 dark:border-slate-600"
                title={isPaused ? "Resume Recording" : "Pause Recording"}
            >
                {isPaused ? (
                <Play className="w-8 h-8 fill-current text-indigo-600 dark:text-indigo-400" />
                ) : (
                <Pause className="w-8 h-8 fill-current text-slate-600 dark:text-slate-300" />
                )}
            </button>
            )}

            <div className="relative group">
                {/* Pulse effect rings - only when recording and NOT paused */}
                {isRecording && !isPaused && (
                    <>
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                    <div className="absolute -inset-2 bg-red-500 rounded-full animate-pulse opacity-10"></div>
                    </>
                )}
                
                {/* Main Record/Stop Button */}
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

            {/* Upload Button (Shows when NOT recording) */}
            {!isRecording && (
               <div className="flex flex-col items-center">
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="audio/*" 
                      className="hidden" 
                   />
                   <button
                        onClick={triggerFileUpload}
                        disabled={isProcessing}
                        className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:border-indigo-200 dark:hover:border-indigo-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 border border-slate-200 dark:border-slate-600 group"
                        title="Upload Audio File"
                    >
                        <Upload className="w-6 h-6 mb-1" />
                    </button>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-burmese absolute -bottom-6">ဖိုင်တင်ရန်</span>
               </div>
            )}
        </div>
      </div>

      <div className={`font-mono text-2xl tabular-nums transition-colors duration-300 ${isPaused ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
        {formatDuration(duration)}
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-4 py-2 rounded-lg text-sm font-burmese">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};