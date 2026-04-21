import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { FileText, BookOpen, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export default function Quiz() {
  const { user, globalLanguage, setGlobalLanguage, history, setHistory } = useAppContext();

  const [file, setFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [quizData, setQuizData] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    setQuizData(null);
    setQuizSubmitted(false);
    setQuizAnswers({});
    setStatus('');
  }, [file, globalLanguage, numQuestions]);

  const handleGenerateQuiz = async () => {
    if (!file) return;
    setIsLoading(true);
    setStatus('');
    setQuizData(null);

    try {
      // FIX: Promise-based FileReader — cleaner and avoids closure bugs
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });

      const langRule = globalLanguage === 'Hindi'
        ? `FINAL CRITICAL INSTRUCTION: You MUST translate ALL questions, options, and explanations into Hindi (Devanagari script). ONLY the JSON keys must remain in English. Example: "question_text": "कंप्यूटर क्या है?"`
        : `FINAL CRITICAL INSTRUCTION: Write the entire response in English.`;

      const promptText = `
      TASK: Create a quiz based on the document.
      QUESTIONS: Generate exactly ${numQuestions} questions.
      FORMAT: Return ONLY a valid JSON object. No intro text, no markdown. Use this exact schema:
      {"quiz_title": "string", "questions": [{"question_text": "string", "options": {"A": "string", "B": "string", "C": "string", "D": "string"}, "correct_answer": "A", "explanation": "string"}]}
      
      ${langRule}
      `;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64,
          userId: user?.userId,
          filename: file.name,
          prompt: promptText,
          language: globalLanguage, // FIX: This was missing — backend system prompt needs this
        })
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      const parsedData = JSON.parse(data.text.replace(/```json|```/g, '').trim());
      setQuizData(parsedData);
      setQuizAnswers({});
      setQuizSubmitted(false);

      const newHistory = [
        { id: Date.now().toString(), filename: file.name, type: 'quiz', date: new Date().toLocaleString(), data: parsedData, recommendations: data.recommendations },
        ...history
      ].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem('studyHistory', JSON.stringify(newHistory));

    } catch (e) {
      setStatus('EduStream is busy or API limit reached. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-10">
        <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
          <BookOpen className="text-blue-600" /> Quiz Generator
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <FileText size={18} /> Upload PDF
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full p-4 font-bold text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-blue-600 file:text-white cursor-pointer outline-none border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50"
            />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700 uppercase tracking-widest">Language</label>
            <select
              value={globalLanguage}
              onChange={(e) => setGlobalLanguage(e.target.value)}
              className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold bg-white focus:border-blue-500 outline-none"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700 uppercase tracking-widest">Questions</label>
            <input
              type="number"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              min="1"
              max="20"
              className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold bg-white focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateQuiz}
          disabled={isLoading || !file}
          className="w-full relative overflow-hidden group bg-slate-900 text-white p-6 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          {isLoading
            ? <Loader2 className="animate-spin w-6 h-6" />
            : <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          }
          <span className="text-lg tracking-wide">
            {isLoading ? 'GENERATING QUIZ...' : 'GENERATE QUIZ'}
          </span>
        </button>

        {status && (
          <div className="mt-6 p-4 bg-amber-50 text-amber-800 font-bold rounded-xl flex items-center gap-3">
            <AlertCircle /> {status}
          </div>
        )}
      </div>

      {quizData && (
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-2xl animate-in slide-in-from-bottom-8">
          <div className="flex justify-between items-center border-b-2 border-slate-50 pb-8 mb-8">
            <h2 className="text-3xl font-black text-slate-900">{quizData.quiz_title}</h2>
          </div>
          <div className="space-y-10">
            {quizData.questions.map((q: any, i: number) => (
              <div key={i} className="bg-slate-50 p-8 rounded-[2rem] space-y-6">
                <p className="font-black text-xl text-slate-800">{i + 1}. {q.question_text}</p>
                <div className="grid gap-4">
                  {Object.entries(q.options).map(([k, v]: any) => (
                    <button
                      key={k}
                      disabled={quizSubmitted}
                      onClick={() => setQuizAnswers({ ...quizAnswers, [i]: k })}
                      className={cn(
                        "text-left p-5 rounded-2xl font-bold border-2 text-lg transition-all",
                        !quizSubmitted && quizAnswers[i] === k
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white hover:border-blue-300",
                        quizSubmitted && q.correct_answer === k
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200"
                          : quizSubmitted && quizAnswers[i] === k
                          ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-200"
                          : ""
                      )}
                    >
                      {k}. {v as React.ReactNode}
                    </button>
                  ))}
                </div>
                {quizSubmitted && q.explanation && (
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 font-bold text-sm">
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
          {!quizSubmitted ? (
            <button
              onClick={() => setQuizSubmitted(true)}
              className="w-full py-6 mt-12 bg-slate-900 text-white font-black text-2xl rounded-[2rem] hover:-translate-y-1 transition-all"
            >
              SUBMIT RESULTS
            </button>
          ) : (
            <button
              onClick={() => { setQuizSubmitted(false); setQuizAnswers({}); }}
              className="w-full py-6 mt-12 bg-blue-600 text-white font-black text-2xl rounded-[2rem] hover:-translate-y-1 transition-all"
            >
              RETRY QUIZ
            </button>
          )}
        </div>
      )}
    </div>
  );
}
