import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Layers, Loader2, Sparkles } from 'lucide-react';

export default function Flashcards() {
  const { user, globalLanguage, setGlobalLanguage } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [activeCard, setActiveCard] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const handleGenerate = async () => {
    if (!file) return;
    setIsLoading(true);
    setCards([]);
    setFlipped(false);
    setActiveCard(0);

    try {
      // ✅ FIX: Promise-based FileReader (same pattern as Quiz/Podcast)
      // The old callback-based version had a bug where setIsLoading(false) ran
      // before the async onload callback, making the spinner disappear immediately.
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });

      const res = await fetch('/api/ai/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✅ FIX: Pass language so the backend generates cards in the correct language
        body: JSON.stringify({ fileData: base64, language: globalLanguage })
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const parsed = JSON.parse(data.text.replace(/```json|```/g, '').trim());
      setCards(parsed);
    } catch (e) {
      alert("Error generating flashcards. Check your API key or try again.");
    } finally {
      setIsLoading(false); // ✅ Now correctly runs AFTER the await chain finishes
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-10">
        <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
          <Layers className="text-amber-600" /> Flashcard Generator
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700 uppercase tracking-widest">Upload PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full p-4 font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-amber-500 file:text-white cursor-pointer"
            />
          </div>
          {/* ✅ FIX: Language selector added to Flashcards page */}
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700 uppercase tracking-widest">Language</label>
            <select
              value={globalLanguage}
              onChange={(e) => setGlobalLanguage(e.target.value)}
              className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold bg-white focus:border-amber-500 outline-none"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700 uppercase tracking-widest invisible">Generate</label>
            <button
              onClick={handleGenerate}
              disabled={isLoading || !file}
              className="w-full bg-amber-500 text-white p-4 rounded-2xl font-black disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              {isLoading ? 'GENERATING...' : 'GENERATE'}
            </button>
          </div>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="flex flex-col items-center">
          <p className="text-sm font-bold text-slate-400 mb-4">Click the card to flip it</p>
          <div
            onClick={() => setFlipped(!flipped)}
            className="w-full max-w-2xl aspect-[3/2] cursor-pointer"
            style={{ perspective: '1000px' }}
          >
            <div
              className="relative w-full h-full transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateX(180deg)' : 'rotateX(0deg)'
              }}
            >
              {/* Front */}
              <div
                className="absolute w-full h-full bg-white rounded-3xl shadow-xl flex items-center justify-center p-10 border-2 border-amber-100 text-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <h2 className="text-3xl font-black text-slate-800">{cards[activeCard].front}</h2>
              </div>
              {/* Back */}
              <div
                className="absolute w-full h-full bg-amber-50 rounded-3xl shadow-xl flex items-center justify-center p-10 border-2 border-amber-200 text-center"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}
              >
                <p className="text-2xl font-bold text-amber-900 leading-relaxed">{cards[activeCard].back}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-8 items-center">
            <button
              onClick={() => { setActiveCard(Math.max(0, activeCard - 1)); setFlipped(false); }}
              disabled={activeCard === 0}
              className="bg-slate-200 px-6 py-3 rounded-xl font-bold hover:bg-slate-300 disabled:opacity-40 transition-colors"
            >
              PREV
            </button>
            <span className="py-3 font-black text-slate-400">{activeCard + 1} / {cards.length}</span>
            <button
              onClick={() => { setActiveCard(Math.min(cards.length - 1, activeCard + 1)); setFlipped(false); }}
              disabled={activeCard === cards.length - 1}
              className="bg-slate-200 px-6 py-3 rounded-xl font-bold hover:bg-slate-300 disabled:opacity-40 transition-colors"
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
