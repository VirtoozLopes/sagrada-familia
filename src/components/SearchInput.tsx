import { Search, Sparkles } from 'lucide-react';

interface SearchInputProps {
  onSearch: (query: string) => void;
  value: string;
}

export default function SearchInput({ onSearch, value }: SearchInputProps) {
  return (
    <div className="relative group max-w-2xl mx-auto w-full">
      {/* Search Glow effect - Divine Golden Light */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-stone-400/10 rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-primary transition-colors">
          <Search size={22} strokeWidth={2.5} />
        </div>
        
        <input
          type="text"
          placeholder="O que você deseja encontrar hoje? (Ex: Terço, Imagem...)"
          className="w-full bg-white/90 backdrop-blur-xl border border-stone-200 rounded-[1.5rem] py-5 pl-14 pr-12 text-stone-800 font-medium placeholder:text-stone-400 focus:outline-none focus:border-primary/50 transition-all shadow-xl"
          value={value}
          onChange={(e) => onSearch(e.target.value)}
        />
        
        <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-stone-300 group-focus-within:text-primary/50 transition-all">
          <Sparkles size={18} />
        </div>
      </div>
    </div>
  );
}
