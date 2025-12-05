import React, { useState } from 'react';
import { AudioRecorder } from './components/AudioRecorder';
import { SummaryDisplay } from './components/SummaryDisplay';
import { generateNotesFromAudio } from './services/gemini';
import { AppState, NoteType, ProcessingResult, SourceLanguage } from './types';
import { Bot, FileText, GraduationCap, Users, Sparkles, Loader2, Globe } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [noteType, setNoteType] = useState<NoteType>(NoteType.AUTO);
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>(SourceLanguage.ENGLISH);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setAppState(AppState.PROCESSING);
    try {
      const text = await generateNotesFromAudio(audioBlob, noteType, sourceLanguage);
      
      // Heuristic to set the type for the UI label if it was auto
      let finalType = noteType;
      if (noteType === NoteType.AUTO) {
        // Simple check if auto-detected type (this is just for UI label, Gemini handles content)
        finalType = text.includes('ဆုံးဖြတ်ချက်') || text.includes('Meeting') ? NoteType.MEETING : NoteType.LECTURE;
      }

      setResult({
        text,
        type: finalType,
        timestamp: new Date().toISOString()
      });
      setAppState(AppState.COMPLETED);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">NoteGenie</h1>
              <p className="text-xs text-slate-500 hidden sm:block">AI Audio to Burmese Notes</p>
            </div>
          </div>
          <div className="flex gap-4 text-sm text-slate-600">
             <a href="#" className="hover:text-indigo-600 transition-colors">Help</a>
             <a href="#" className="hover:text-indigo-600 transition-colors">About</a>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12">
        {appState === AppState.IDLE || appState === AppState.RECORDING ? (
          <div className="flex flex-col items-center space-y-10 animate-fade-in-up">
            
            {/* Hero Text */}
            <div className="text-center space-y-4 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                Turn Speech into <span className="text-indigo-600">Structured Notes</span>
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Record English or Russian lectures and meetings. Get instant, formatted summaries in <span className="font-burmese font-semibold">Myanmar Language</span>.
              </p>
            </div>

            {/* Config Selectors */}
            <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl justify-center items-center">
              
              {/* Language Selector */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Source Language
                </span>
                <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <button 
                    onClick={() => setSourceLanguage(SourceLanguage.ENGLISH)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sourceLanguage === SourceLanguage.ENGLISH ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  >
                    English
                  </button>
                  <div className="w-px bg-slate-100 my-1"></div>
                  <button 
                    onClick={() => setSourceLanguage(SourceLanguage.RUSSIAN)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sourceLanguage === SourceLanguage.RUSSIAN ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  >
                    Russian
                  </button>
                </div>
              </div>

              {/* Type Selector */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Output Format</span>
                <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto max-w-[90vw]">
                  <button 
                    onClick={() => setNoteType(NoteType.AUTO)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${noteType === NoteType.AUTO ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Auto
                  </button>
                  <button 
                    onClick={() => setNoteType(NoteType.MEETING)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${noteType === NoteType.MEETING ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  >
                    <Users className="w-4 h-4" />
                    Meeting
                  </button>
                  <button 
                    onClick={() => setNoteType(NoteType.LECTURE)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${noteType === NoteType.LECTURE ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    Lecture
                  </button>
                </div>
              </div>
            </div>

            {/* Recorder Section */}
            <div className="w-full">
               <AudioRecorder 
                  onRecordingComplete={handleRecordingComplete} 
                  isProcessing={appState === AppState.PROCESSING}
                  sourceLanguage={sourceLanguage}
               />
            </div>

             {/* Features Grid */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl pt-8">
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">Smart Formatting</h3>
                  <p className="text-sm text-slate-500">Automatically formats text into clear bullet points, action items, and summaries.</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-4">
                    <Bot className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">Multilingual AI</h3>
                  <p className="text-sm text-slate-500">Understands English & Russian source audio with high accuracy.</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">Native Burmese</h3>
                  <p className="text-sm text-slate-500">Outputs natural-sounding Myanmar language text ready for PDF export.</p>
                </div>
             </div>

          </div>
        ) : appState === AppState.PROCESSING ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Bot className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
               <h3 className="text-xl font-bold text-slate-800">Processing Audio...</h3>
               <p className="text-slate-500">Transcribing {sourceLanguage} audio and summarizing in Myanmar language.</p>
               <p className="text-xs text-slate-400">This may take a minute depending on recording length.</p>
            </div>
          </div>
        ) : appState === AppState.COMPLETED && result ? (
          <SummaryDisplay result={result} onReset={handleReset} />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="p-4 bg-red-50 rounded-full">
              <FileText className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Something went wrong</h3>
            <p className="text-slate-500">Please check your internet connection and try again.</p>
            <button 
              onClick={handleReset}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-400">
            Powered by Gemini 2.5 Flash • Built for Education & Productivity
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;