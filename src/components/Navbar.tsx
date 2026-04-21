import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { LogOut, User, BookOpen, Mic, Home, Layers } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export default function Navbar() {
  const { user, logout } = useAppContext();
  const location = useLocation();

  if (!user) return null;

  const NavLink = ({ to, icon: Icon, label }: any) => {
    const isActive = location.pathname === to;
    return (
      <Link to={to} className={cn("px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center gap-2", isActive ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:bg-white/50")}>
        <Icon size={16}/> <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  };

  return (
    <header className="bg-white p-4 md:p-6 mb-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-4 duration-500">
      <div>
        <Link to="/" className="text-3xl font-black text-slate-900 hover:opacity-80 transition-opacity">
          EduStream <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">AI</span>
        </Link>
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1 flex items-center gap-2">
          <User size={14}/> {user.email}
        </p>
      </div>
      
      <nav className="flex flex-wrap justify-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
        <NavLink to="/" icon={Home} label="Home" />
        <NavLink to="/quiz" icon={BookOpen} label="Quiz" />
        <NavLink to="/podcast" icon={Mic} label="Podcast" />
        <NavLink to="/flashcards" icon={Layers} label="Flashcards" />
      </nav>

      <button onClick={logout} className="flex items-center gap-2 px-5 py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors border border-slate-100">
        <LogOut size={18}/> <span className="hidden sm:inline">Sign Out</span>
      </button>
    </header>
  );
}