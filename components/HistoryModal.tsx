import React from 'react';
import { X, Trash2, Calendar, FileText, GraduationCap, Users } from 'lucide-react';
import { ProcessingResult, NoteType } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ProcessingResult[];
  onSelectNote: (note: ProcessingResult) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelectNote, 
  onDeleteNote 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] transition-colors duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-burmese">မှတ်တမ်းများ (History)</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-burmese">
              မှတ်တမ်း မရှိသေးပါ။
            </div>
          ) : (
            history.map((note) => (
              <div 
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="group flex items-start gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer"
              >
                <div className={`mt-1 p-2 rounded-lg ${note.type === NoteType.MEETING || note.type === 'MEETING' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'}`}>
                   {note.type === NoteType.MEETING || note.type === 'MEETING' ? <Users className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 font-burmese truncate pr-2">
                      {note.text.split('\n')[0] || "Untitled Note"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(note.timestamp).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {note.type === 'MEETING' ? 'Meeting' : 'Lecture'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 font-burmese">
                    {note.text.replace(/^[#\*\- ]+/, '')}
                  </p>
                </div>

                <button 
                  onClick={(e) => onDeleteNote(note.id, e)}
                  className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors font-burmese"
          >
            ပိတ်မည်
          </button>
        </div>
      </div>
    </div>
  );
};