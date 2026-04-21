import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Navbar from './components/Navbar';
import { User, Lock } from 'lucide-react';

import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Podcast from './pages/Podcast';
import Flashcards from './pages/Flashcards';

const LoginView = () => {
  const { setUser } = useAppContext();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [status, setStatus] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    try {
      const res = await fetch(isLogin ? '/api/auth/login' : '/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (isLogin) {
        // ✅ FIX: Store userId (the real DB id) and token separately.
        // Previously this was: userId: data.token — which stored the JWT as the userId,
        // causing the backend's db.users.findIndex(u => u.id === userId) to ALWAYS fail.
        const userObj = { email: data.email, userId: data.userId, token: data.token };
        setUser(userObj);
        localStorage.setItem('user', JSON.stringify(userObj));
      } else {
        alert("Account created! Please login.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setStatus(err.message || 'Something went wrong.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100">
        <h1 className="text-5xl font-black text-center text-slate-900 mb-8">
          EduStream <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">AI</span>
        </h1>
        <form onSubmit={handleAuth} className="space-y-5">
          <div className="relative group">
            <User className="absolute left-4 top-4 text-slate-400" size={22}/>
            <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-blue-500" />
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-4 text-slate-400" size={22}/>
            <input required type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-blue-500" />
          </div>
          <button className="w-full py-5 bg-slate-900 text-white font-black text-lg rounded-2xl">
            {isLogin ? 'LOGIN' : 'SIGN UP'}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-sm font-bold text-slate-400">
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </button>
        {status && <p className="mt-4 text-center text-red-500 font-bold">{status}</p>}
      </div>
    </div>
  );
};

const AppRouter = () => {
  const { user } = useAppContext();
  return (
    <BrowserRouter>
      {user ? (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
          <div className="max-w-5xl mx-auto">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/podcast" element={<Podcast />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </div>
      ) : (
        <Routes><Route path="*" element={<LoginView />} /></Routes>
      )}
    </BrowserRouter>
  );
};

export default function App() { return <AppProvider><AppRouter /></AppProvider>; }
