import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}

export function SearchableSelect({ label, value, onChange, options, placeholder }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  // Allow manual entry if not found
  const showManualEntry = search.length > 0 && !options.some(opt => opt.toLowerCase() === search.toLowerCase());

  return (
    <div className="space-y-1.5 relative" ref={wrapperRef}>
      <label className="text-xs font-semibold text-gray-300">{label}</label>
      <div 
        className="w-full bg-black/40 border border-white/10 rounded-2xl p-3.5 text-xs text-white flex justify-between items-center cursor-pointer hover:border-pink-500/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-white" : "text-gray-500"}>{value || placeholder || "Select..."}</span>
        <ChevronDown size={14} className="text-gray-400" />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-50 w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-2 border-b border-white/10 flex items-center gap-2">
              <Search size={14} className="text-gray-400" />
              <input 
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or type..."
                className="w-full bg-transparent text-xs text-white focus:outline-none"
              />
            </div>
            <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(opt => (
                  <div 
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`p-2.5 text-xs rounded-lg cursor-pointer flex justify-between items-center ${value === opt ? 'bg-pink-500/20 text-pink-300' : 'text-gray-300 hover:bg-white/5'}`}
                  >
                    <span>{opt}</span>
                    {value === opt && <Check size={12} />}
                  </div>
                ))
              ) : (
                <div className="p-3 text-xs text-gray-500 text-center">No matches found</div>
              )}
              {showManualEntry && (
                <div 
                  onClick={() => {
                    onChange(search);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="p-2.5 text-xs rounded-lg cursor-pointer bg-indigo-500/20 text-indigo-300 mt-1 flex items-center gap-2"
                >
                  <Check size={12} />
                  Use "{search}"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
