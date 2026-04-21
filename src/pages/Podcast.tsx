import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Mic, Loader2, Play, Pause, Plus, Sparkles } from 'lucide-react';

export default function Podcast() {
  const { user, globalLanguage, setGlobalLanguage, history, setHistory } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(3);
  const [isLoading, setIsLoading] = useState(false);

  const [script, setScript] = useState<string | null>(() => localStorage.getItem('podcast_script'));
  const [notes, setNotes] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('podcast_notes') || '[]'); }
    catch { return []; }
  });

  const [noteText, setNoteText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentCharIndex = useRef(0);
  const pausedAtIndex = useRef(0);
  // FIX: Capture the exact char position the instant the modal opens.
  // Previously, saveNote() used currentCharIndex.current — but by the time
  // the user finishes typing and clicks Save, the audio has advanced forward,
  // so the saved timestamp was always ahead of where the note was actually taken.
  const noteTimestamp = useRef(0);

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  useEffect(() => {
    localStorage.setItem('podcast_notes', JSON.stringify(notes));
  }, [notes]);

  const handleGenerate = async () => {
    if (!file) return;

    setIsLoading(true);
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    pausedAtIndex.current = 0;
    currentCharIndex.current = 0;

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });

      const langRule = globalLanguage === 'Hindi'
        ? "FINAL CRITICAL INSTRUCTION: You MUST write the summary in natural Hindi (Devanagari script). Do NOT output any English words."
        : "FINAL CRITICAL INSTRUCTION: Write the script in English.";

      const promptText = `
      TASK: Write a continuous, spoken-word summary of the document.
      LENGTH: Target exactly ${duration * 120} words.
      STRICT RULES: DO NOT output speaker labels like "Host:". DO NOT output stage directions like "[Intro music plays]". Write ONLY the words to be spoken as a continuous paragraph.
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
          language: globalLanguage,
        })
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      const cleanScript = data.text
        .replace(/\[.*?\]/g, '')
        .replace(/^(Host|Speaker|Voice|Narrator):\s*/gim, '')
        .trim();

      setScript(cleanScript);
      setNotes([]);
      localStorage.setItem('podcast_script', cleanScript);
      localStorage.setItem('podcast_notes', '[]');

      const newHistory = [
        { id: Date.now().toString(), filename: file.name, type: 'podcast', date: new Date().toLocaleString(), data: { script: cleanScript } },
        ...history
      ].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem('studyHistory', JSON.stringify(newHistory));

    } catch (e) {
      alert("Failed to generate podcast. Check your API key or try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const startSpeaking = (fromIndex: number) => {
    if (!script) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const textToSpeak = script.substring(fromIndex);

    const cleanAudioText = textToSpeak
      .replace(/\[.*?\]/g, ' ')
      .replace(/[*#_`~0-9०-९\n\r"']/g, ' ')
      .trim();

    if (!cleanAudioText) return;

    const utterance = new SpeechSynthesisUtterance(cleanAudioText);

    if (globalLanguage === 'Hindi') {
      utterance.lang = 'hi-IN';
      const setHindiVoice = () => {
        const voices = synth.getVoices();
        const hindiVoice = voices.find(
          v => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi') || v.name.includes('Google हिन्दी')
        );
        if (hindiVoice) utterance.voice = hindiVoice;
      };
      if (synth.getVoices().length > 0) {
        setHindiVoice();
      } else {
        synth.onvoiceschanged = setHindiVoice;
      }
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onboundary = (e) => {
      if (e.name === 'word') currentCharIndex.current = fromIndex + e.charIndex;
    };
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      pausedAtIndex.current = 0;
      currentCharIndex.current = 0;
    };
    utterance.onerror = () => setIsPlaying(false);

    synth.speak(utterance);
  };

  const togglePlay = () => {
    if (isPlaying) {
      pausedAtIndex.current = currentCharIndex.current;
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      startSpeaking(pausedAtIndex.current);
    }
  };

  const saveNote = () => {
    // FIX: Use the frozen noteTimestamp (captured when modal opened), not
    // currentCharIndex (which has drifted forward while the user was typing).
    // Rewind 150 chars so playback starts just before the noted moment,
    // giving natural audio context rather than jumping to the exact character.
    const rewindBuffer = 150;
    const jumpIndex = Math.max(0, noteTimestamp.current - rewindBuffer);
    const newNotes = [...notes, { id: Date.now(), text: noteText, timestampIndex: jumpIndex }];
    setNotes(newNotes);
    setNoteText('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-10">
        <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
          <Mic className="text-indigo-600" /> AI Podcast Synthesizer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full p-4 font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-600"
          />
          <select
            value={globalLanguage}
            onChange={(e) => setGlobalLanguage(e.target.value)}
            className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold bg-white"
          >
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
          </select>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            placeholder="Mins (e.g. 3)"
            min="1"
            max="10"
            className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold bg-white"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={isLoading || !file}
          className="w-full bg-indigo-600 text-white p-6 rounded-2xl font-black flex justify-center gap-3 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <Sparkles />}
          {isLoading ? 'SYNTHESIZING...' : 'GENERATE PODCAST'}
        </button>
      </div>

      {script && (
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100">
          <div className="flex justify-between items-center mb-8 bg-slate-50 p-4 rounded-2xl">
            <button
              onClick={togglePlay}
              className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-colors"
            >
              {isPlaying ? <Pause /> : <Play />}
              {isPlaying ? 'PAUSE' : pausedAtIndex.current > 0 ? 'RESUME' : 'PLAY'}
            </button>
            {/* FIX: Freeze the timestamp here, the moment the user clicks the button */}
            <button
              onClick={() => {
                noteTimestamp.current = currentCharIndex.current;
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-50 text-blue-600 px-6 py-4 rounded-xl font-bold hover:bg-blue-100 transition-colors"
            >
              <Plus /> Add Timed Note
            </button>
          </div>

          {notes.length > 0 && (
            <div className="mb-8 grid gap-4">
              <h3 className="font-black text-slate-400">Timestamped Notes (Click to jump)</h3>
              {notes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { pausedAtIndex.current = n.timestampIndex; startSpeaking(n.timestampIndex); }}
                  className="bg-blue-50 p-4 rounded-xl cursor-pointer hover:bg-blue-100 flex gap-3 items-center group border border-blue-100"
                >
                  <Play className="text-blue-400 group-hover:text-blue-600 shrink-0" size={16} />
                  <p className="font-bold text-blue-900">{n.text}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-slate-900 p-8 rounded-[2rem] text-slate-300 font-medium leading-loose">
            {script}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black mb-4">Note at current position</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type your note..."
              className="w-full border-2 border-slate-200 p-4 rounded-xl mb-4 font-bold h-32 outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-slate-400">Cancel</button>
              <button onClick={saveNote} disabled={!noteText.trim()} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50">
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
