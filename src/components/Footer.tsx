import React from 'react';
import { Github, Heart, Music2, Sparkles, Terminal } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto border-t border-white/10 glass bg-black/40 py-6 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
        {/* Left: Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-spotify/20 border border-spotify/30 flex items-center justify-center text-spotify font-black">
            <Music2 className="w-4 h-4 text-spotify" />
          </div>
          <div>
            <div className="font-black text-white flex items-center gap-2">
              <span>Spoti<span className="text-spotify">Quiz</span></span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-spotify/15 text-spotify border border-spotify/30 font-bold">
                v0.3
              </span>
              <span className="text-[10px] font-mono text-neutral-500">
                build 18.10.26
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Real-Time Tactical Music Trivia Duel with Live Audio Previews & Sabotage Cards
            </p>
          </div>
        </div>

        {/* Center/Right: Developer Credits */}
        <div className="flex flex-wrap items-center gap-3 md:gap-6">
          <div className="flex items-center gap-1.5 text-neutral-300">
            <span>Created & Developed by</span>
            <a
              href="https://github.com/HydrogenXV"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-white hover:text-spotify flex items-center gap-1 underline transition-colors"
            >
              <span>HydrogenXV</span>
              <Sparkles className="w-3 h-3 text-spotify fill-spotify" />
            </a>
          </div>

          <a
            href="https://github.com/HydrogenXV"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium border border-white/10 hover:border-white/20 transition-all text-[11px]"
          >
            <Github className="w-3.5 h-3.5" />
            <span>github.com/HydrogenXV</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
