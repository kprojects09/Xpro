import { useEffect } from 'react';

export const ThemeApplier = ({ theme }: { theme: any }) => {
  useEffect(() => {
    if (!theme) return;
    document.documentElement.style.setProperty('--bg-app', theme.isLight ? '#f8fafc' : '#060413');
    document.documentElement.style.setProperty('--bg-panel', theme.isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.45)');
    document.documentElement.style.setProperty('--text-main', theme.isLight ? '#0f172a' : '#ffffff');
    document.documentElement.style.setProperty('--text-muted', theme.isLight ? '#64748b' : '#9ca3af');
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    
    const style = document.createElement('style');
    style.id = 'theme-overrides';
    style.innerHTML = `
      html, body, .bg-\\[\\#060413\\] { background-color: var(--bg-app) !important; color: var(--text-main) !important; }
      .bg-slate-900, .bg-slate-900\\/40, .bg-slate-950, .bg-slate-950\\/95, .bg-slate-900\\/80, .bg-slate-900\\/50 { background-color: var(--bg-panel) !important; }
      .text-white { color: var(--text-main) !important; }
      .text-gray-400, .text-gray-300, .text-gray-500 { color: var(--text-muted) !important; }
      .border-white\\/10, .border-white\\/5 { border-color: ${theme.isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'} !important; }
      .text-indigo-400, .text-pink-400, .text-purple-400, .text-rose-400 { color: var(--theme-primary) !important; }
      .bg-indigo-500\\/10, .bg-pink-500\\/10, .bg-purple-500\\/10 { background-color: ${theme.button} !important; }
    `;
    const existing = document.getElementById('theme-overrides');
    if (existing) existing.remove();
    document.head.appendChild(style);
    
    return () => { 
      const e = document.getElementById('theme-overrides'); 
      if (e) e.remove(); 
    };
  }, [theme]);
  
  return null;
};
