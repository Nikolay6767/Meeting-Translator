import React, { useState, useEffect } from 'react';
import { AudioRecorder } from './components/AudioRecorder';
import { SummaryDisplay } from './components/SummaryDisplay';
import { HistoryModal } from './components/HistoryModal';
import { generateNotesFromAudio } from './services/gemini';
import { AppState, NoteType, ProcessingResult, SourceLanguage } from './types';
import { Bot, FileText, GraduationCap, Users, Sparkles, Loader2, Globe, AlertTriangle, History, Moon, Sun } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [noteType, setNoteType] = useState<NoteType>(NoteType.AUTO);
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>(SourceLanguage.ENGLISH);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // History State
  const [history, setHistory] = useState<ProcessingResult[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Apply Dark Mode Class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Load history from local storage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('notegenie_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history whenever it changes
  useEffect(() => {
    localStorage.setItem('notegenie_history', JSON.stringify(history));
  }, [history]);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setAppState(AppState.PROCESSING);
    setErrorMessage("");
    try {
      const text = await generateNotesFromAudio(audioBlob, noteType, sourceLanguage);
      
      // Heuristic to set the type for the UI label if it was auto
      let finalType = noteType;
      if (noteType === NoteType.AUTO) {
        finalType = text.includes('ဆုံးဖြတ်ချက်') || text.includes('Meeting') ? NoteType.MEETING : NoteType.LECTURE;
      }

      const newResult: ProcessingResult = {
        id: Date.now().toString(), // Simple ID generation
        text,
        type: finalType,
        timestamp: new Date().toISOString()
      };

      setResult(newResult);
      // Add to history (newest first)
      setHistory(prev => [newResult, ...prev]);
      setAppState(AppState.COMPLETED);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "An unexpected error occurred");
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setResult(null);
    setErrorMessage("");
  };

  const handleSelectHistoryNote = (note: ProcessingResult) => {
    setResult(note);
    setAppState(AppState.COMPLETED);
    setIsHistoryOpen(false);
  };

  const handleDeleteHistoryNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selection when clicking delete
    if (window.confirm("ဤမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?")) {
      setHistory(prev => prev.filter(item => item.id !== id));
      // If the currently displayed result is deleted, reset to home
      if (result && result.id === id) {
        handleReset();
      }
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      {/* History Modal */}
      <HistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectNote={handleSelectHistoryNote}
        onDeleteNote={handleDeleteHistoryNote}
      />

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">NoteGenie</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">AI Audio to Burmese Notes</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
             <button
               onClick={toggleDarkMode}
               className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
               title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
             >
               {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
             <button 
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-burmese font-medium"
             >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">မှတ်တမ်းများ</span>
             </button>
             <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
             <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Help</a>
             <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">About</a>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12">
        {appState === AppState.IDLE || appState === AppState.RECORDING ? (
          <div className="flex flex-col items-center space-y-10 animate-fade-in-up">
            
            {/* Hero Text */}
            <div className="text-center space-y-4 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
                Smart <span className="text-indigo-600 dark:text-indigo-400">Voice Notes</span>
              </h2>
              
              {/* Added Credit Badge */}
              <div className="inline-flex items-center justify-center">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-30 group-hover:opacity-75 transition duration-200"></div>
                  <div className="relative flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 leading-none">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span className="text-[10px] font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                      Idea by Mr Nikolay
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-burmese mt-2">
                အင်္ဂလိပ်၊ ရုရှား နှင့် မြန်မာဘာသာစကားများဖြင့်ပြောဆိုဆွေးနွေးသော အစည်းအဝေးများနှင့် သင်ခန်းစာများကို မှတ်တမ်းတင်ပြီး <span className="font-semibold text-indigo-700 dark:text-indigo-400">မြန်မာဘာသာသို့</span> အလိုအလျောက် အနှစ်ချုပ်ပြောင်းလဲ ရယူနိုင်ပါပြီ။
              </p>
            </div>

            {/* Config Selectors */}
            <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl justify-center items-center">
              
              {/* Language Selector - Dropdown */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Source Language
                </span>
                <div className="relative">
                  <select
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value as SourceLanguage)}
                    className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2.5 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-sm w-48 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                  >
                    <option value={SourceLanguage.AUTO}>Auto-detect (အလိုအလျောက်)</option>
                    <option value={SourceLanguage.ENGLISH}>English</option>
                    <option value={SourceLanguage.RUSSIAN}>Russian</option>
                    <option value={SourceLanguage.BURMESE}>Burmese (မြန်မာ)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <svg className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Type Selector */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Output Format</span>
                <div className="flex p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-x-auto max-w-[90vw]">
                  <button 
                    onClick={() => setNoteType(NoteType.AUTO)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${noteType === NoteType.AUTO ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Auto
                  </button>
                  <button 
                    onClick={() => setNoteType(NoteType.MEETING)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${noteType === NoteType.MEETING ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <Users className="w-4 h-4" />
                    Meeting
                  </button>
                  <button 
                    onClick={() => setNoteType(NoteType.LECTURE)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${noteType === NoteType.LECTURE ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
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
                  isProcessing={false}
                  sourceLanguage={sourceLanguage}
               />
            </div>

             {/* Features Grid */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl pt-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Smart Formatting</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Automatically formats text into clear bullet points, action items, and summaries.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                  <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                    <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Multilingual AI</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Understands English, Russian & Burmese source audio with high accuracy.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                  <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Native Burmese</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Outputs natural-sounding Myanmar language text ready for PDF export.</p>
                </div>
             </div>

          </div>
        ) : appState === AppState.PROCESSING ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Bot className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div className="text-center space-y-2">
               <h3 className="text-xl font-bold text-slate-800 dark:text-white font-burmese">ဆောင်ရွက်နေပါသည်...</h3>
               <p className="text-slate-500 dark:text-slate-400 font-burmese">
                 {sourceLanguage === SourceLanguage.AUTO 
                    ? "အသံဖိုင်၏ ဘာသာစကားကို အလိုအလျောက် ခွဲခြားပြီး မြန်မာဘာသာဖြင့် မှတ်တမ်းတင်နေပါသည်။" 
                    : `${sourceLanguage} အသံဖိုင်ကို နားထောင်ပြီး မြန်မာဘာသာဖြင့် မှတ်တမ်းတင်နေပါသည်။`}
               </p>
               <p className="text-xs text-slate-400">ကြာမြင့်ချိန်သည် အသံဖိုင်အရှည်ပေါ် မူတည်ပါသည်။</p>
            </div>
          </div>
        ) : appState === AppState.COMPLETED && result ? (
          <SummaryDisplay result={result} onReset={handleReset} />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 max-w-lg mx-auto text-center px-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white font-burmese">တောင်းပန်ပါသည်။ အမှားအယွင်း ဖြစ်ပေါ်နေပါသည်။</h3>
              <p className="text-slate-600 dark:text-slate-400 font-burmese">{errorMessage || "Please check your internet connection and try again."}</p>
            </div>
            <button 
              onClick={handleReset}
              className="px-6 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors font-medium font-burmese"
            >
              ပြန်လည်ကြိုးစားမည်
            </button>
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 transition-colors duration-300">
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