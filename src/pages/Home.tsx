import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BookOpen, Mic, History, Lightbulb, Layers, Trash2, X } from 'lucide-react';

export default function Home() {
  const { history, setHistory } = useAppContext();
  const [selectedItem, setSelectedItem] = useState<any>(null); // State for the popup modal
  
  const latestRecommendations = history.length > 0 && history[0].recommendations 
    ? history[0].recommendations 
    : [];

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevents the modal from opening when you click delete
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('studyHistory', JSON.stringify(newHistory));
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* SELECTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/quiz" className="bg-white p-8 rounded-[2rem] shadow-sm border-2 border-slate-100 hover:border-blue-500 hover:shadow-xl transition-all group flex flex-col items-center text-center">
          <div className="bg-blue-50 p-5 rounded-full text-blue-600 mb-4 group-hover:scale-110 transition-transform"><BookOpen size={40}/></div>
          <h3 className="text-2xl font-black text-slate-800">Generate Quiz</h3>
        </Link>
        <Link to="/podcast" className="bg-white p-8 rounded-[2rem] shadow-sm border-2 border-slate-100 hover:border-indigo-500 hover:shadow-xl transition-all group flex flex-col items-center text-center">
          <div className="bg-indigo-50 p-5 rounded-full text-indigo-600 mb-4 group-hover:scale-110 transition-transform"><Mic size={40}/></div>
          <h3 className="text-2xl font-black text-slate-800">AI Podcast</h3>
        </Link>
        <Link to="/flashcards" className="bg-white p-8 rounded-[2rem] shadow-sm border-2 border-slate-100 hover:border-amber-500 hover:shadow-xl transition-all group flex flex-col items-center text-center">
          <div className="bg-amber-50 p-5 rounded-full text-amber-600 mb-4 group-hover:scale-110 transition-transform"><Layers size={40}/></div>
          <h3 className="text-2xl font-black text-slate-800">Flashcards</h3>
        </Link>
      </div>

      {/* PERSONALIZED RECOMMENDATIONS */}
      {latestRecommendations.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] text-white shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-2 rounded-lg"><Lightbulb size={24}/></div>
            <h3 className="text-xl font-black">Personalized Next Steps</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {latestRecommendations.map((rec: string, i: number) => (
              <span key={i} className="bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-xl font-bold text-sm border border-white/20">{rec}</span>
            ))}
          </div>
        </div>
      )}

      {/* LEARNING HISTORY */}
      {history.length > 0 && (
        <div className="pt-6">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><History size={20}/> Learning History</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {history.map((item) => (
              <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-white p-6 rounded-[1.5rem] border-2 border-slate-100 flex items-center justify-between cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group">
                <div className="flex items-center gap-5">
                  <div className="text-3xl bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    {item.type === 'quiz' ? '📝' : '🎙️'}
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-800 truncate max-w-[200px]">{item.filename}</div>
                    <div className="text-xs font-bold text-slate-400 mt-1">{item.date}</div>
                  </div>
                </div>
                <button onClick={(e) => deleteHistoryItem(e, item.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY VIEW MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6 border-b-2 border-slate-50 pb-4">
              <div>
                <h3 className="text-2xl font-black text-slate-800">{selectedItem.filename}</h3>
                <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-widest">{selectedItem.type} Session</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors"><X size={24}/></button>
            </div>
            
            {/* Show Quiz Content */}
            {selectedItem.type === 'quiz' && selectedItem.data?.questions && (
              <div className="space-y-6">
                <h4 className="text-xl font-black text-slate-900">{selectedItem.data.quiz_title}</h4>
                {selectedItem.data.questions.map((q: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <p className="font-bold text-slate-800 mb-3">{idx + 1}. {q.question_text}</p>
                    <p className="text-emerald-600 font-bold bg-emerald-50 inline-block px-3 py-1 rounded-lg">
                      Correct Answer: {q.options[q.correct_answer]}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Show Podcast Content */}
            {selectedItem.type === 'podcast' && selectedItem.data?.script && (
              <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl leading-relaxed font-medium">
                {selectedItem.data.script}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}