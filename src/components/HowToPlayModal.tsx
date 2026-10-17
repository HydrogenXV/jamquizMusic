import React, { useState } from 'react';
import { useI18n } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import {
  X, BookOpen, Trophy, Zap, Shield, Sparkles, Flame, Radio,
  Disc3, Mic, Clock, HelpCircle, Layers, Swords, Target, AlertTriangle
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<Props> = ({ open, onClose }) => {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<'rules' | 'modes' | 'cards' | 'tips'>('rules');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-strong border border-white/15 rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>{lang === 'th' ? 'วิธีการเล่น SpotiQuiz' : 'How to Play SpotiQuiz'}</span>
                <span className="text-[10px] bg-spotify/20 text-spotify px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  Guide
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {lang === 'th' ? 'กฎ กติกา โหมดเกม และกลยุทธ์การ์ดทั้งหมด' : 'Rules, game modes, ability cards & combat tips'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sfx.click();
              onClose();
            }}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-3 border-b border-white/10 bg-black/30 overflow-x-auto shrink-0">
          {[
            { id: 'rules', icon: <Target className="w-4 h-4 text-emerald-400" />, label: lang === 'th' ? '🎯 กฎและการคิดแต้ม' : '🎯 Basic Rules' },
            { id: 'modes', icon: <Disc3 className="w-4 h-4 text-pink-400" />, label: lang === 'th' ? '🎮 6 โหมดเกม' : '🎮 6 Game Modes' },
            { id: 'cards', icon: <Sparkles className="w-4 h-4 text-yellow-400" />, label: lang === 'th' ? '🃏 การ์ดบัฟ & ก่อกวน' : '🃏 Cards Strategy' },
            { id: 'tips', icon: <Zap className="w-4 h-4 text-cyan-400" />, label: lang === 'th' ? '💡 เคล็ดลับ & คีย์ลัด' : '💡 Pro Tips & Keys' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                sfx.click();
                setTab(item.id as any);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                tab === item.id
                  ? 'bg-spotify text-black shadow-lg shadow-spotify/25 font-black'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-neutral-300 leading-relaxed">
          {tab === 'rules' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="font-black text-white text-base flex items-center gap-2">
                  <span className="text-spotify">01.</span>
                  <span>{lang === 'th' ? 'ฟังเพลงแล้วทายคำตอบ' : 'Listen & Answer Fast'}</span>
                </h4>
                <p className="text-xs text-neutral-300">
                  {lang === 'th'
                    ? 'แต่ละรอบระบบจะเล่นตัวอย่างเพลงความยาว 10 วินาที จากนั้นคุณต้องตอบคำถามจาก 4 ตัวเลือก (ชื่อเพลง, ศิลปิน หรือปีที่ปล่อย) ให้ถูกต้อง'
                    : 'Each round plays a 10-second song preview. Guess the song title, artist, or release year from 4 multiple-choice buttons.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="font-black text-white text-base flex items-center gap-2">
                  <span className="text-yellow-400">02.</span>
                  <span>{lang === 'th' ? 'โบนัสความเร็ว (Speed Bonus)' : 'Speed Bonus Scoring'}</span>
                </h4>
                <p className="text-xs text-neutral-300">
                  {lang === 'th'
                    ? 'ตอบถูกได้คะแนนฐาน 1,000 คะแนน ยิ่งตอบเร็วเท่าไรยิ่งได้โบนัสความเร็วเพิ่มสูงสุดอีก +1,000 คะแนน (รวมสูงสุด 2,000 คะแนนต่อรอบก่อนตัวคูณ!)'
                    : 'A correct answer earns 1,000 base points. The faster you lock in your answer, the higher your speed bonus (up to +1,000 extra points)!'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="font-black text-white text-base flex items-center gap-2">
                  <span className="text-rose-400">03.</span>
                  <span>{lang === 'th' ? 'คอมโบความต่อเนื่อง (Streak Multiplier)' : 'Streak Multipliers'}</span>
                </h4>
                <p className="text-xs text-neutral-300">
                  {lang === 'th'
                    ? 'ตอบถูกติดต่อกันจะเพิ่มตัวคูณคะแนน เช่น 1.1×, 1.2× ไปจนถึง 1.5× (หรือสูงสุด 3.0× ในโหมดสปีดบลิตซ์!) แต่ถ้าตอบผิด Streak จะรีเซ็ตกลับเป็น 1× ทันที'
                    : 'Consecutive correct answers build streak multipliers up to 1.5× (or 3.0× in Speed Blitz!). Missing a question resets your streak back to 1×.'}
                </p>
              </div>
            </div>
          )}

          {tab === 'modes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-white">
                  <span className="text-xl">🎧</span>
                  <span>Classic Trivia Duel</span>
                </div>
                <p className="text-xs text-neutral-400">
                  {lang === 'th'
                    ? 'โหมดมาตรฐาน ดราฟต์การ์ด 3 ใบ ตัวอย่างเพลง 10 วิ ตัวคูณมาตรฐาน'
                    : 'Standard rules. 10s audio previews, draft 3 cards, steady pacing.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-pink-300">
                  <span className="text-xl">🎤</span>
                  <span>Mic Mayhem</span>
                </div>
                <p className="text-xs text-neutral-400">
                  {lang === 'th'
                    ? 'เปิดไมค์แล้วร้องหรือฮัมตามเพลง วิชวลไลเซอร์จะตรวจจับจังหวะและระดับเสียงเพื่อแจกแต้มโบนัสสูงสุด +500 แต้ม'
                    : 'Sing or hum along into your microphone! Audio visualizer tracks energy and rhythm for up to +500 bonus points.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-yellow-300">
                  <span className="text-xl">⚡</span>
                  <span>30s Speed Blitz</span>
                </div>
                <p className="text-xs text-neutral-400">
                  {lang === 'th'
                    ? 'เพลงเปลี่ยนทุก 3 วินาที! ตอบไวสุดขีด คอมโบพุ่งสูงสุดถึง 3.0×'
                    : 'Ultra rapid-fire! Songs change every 3 seconds with streak combos scaling all the way up to 3.0×.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-purple-300">
                  <span className="text-xl">🃏</span>
                  <span>Card Mayhem Duel</span>
                </div>
                <p className="text-xs text-neutral-400">
                  {lang === 'th'
                    ? 'มานา +2 ทุกรอบ ใช้การ์ดไม่จำกัดต่อรอบ ยิงสกิลและแก้ทางกันอย่างดุเดือด'
                    : 'Overcharged mana (+2 per round), unlimited casts per round. High-action card clashes.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-cyan-300">
                  <span className="text-xl">🕰️</span>
                  <span>Decade Time Machine</span>
                </div>
                <p className="text-xs text-neutral-400">
                  {lang === 'th'
                    ? 'ย้อนเวลาจากยุค 80s สู่ 2020s ทายปีที่ปล่อยเพลง พร้อมเรดาร์บอกช่วงทศวรรษ'
                    : 'Chronological eras from 80s to 2020s. Guess release years with Decade Radar guidance.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-pink-500/40 bg-pink-950/20 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-pink-300">
                  <span className="text-xl">🎪</span>
                  <span>Special Event Mode</span>
                </div>
                <p className="text-xs text-neutral-300">
                  {lang === 'th'
                    ? 'แจกการ์ดแบบสุ่มทันที 3 ใบ, มีเหตุการณ์ป่วนเวที (Blackout, Double Stakes, แอร์ดรอป) และการท้าทาย The Ascension Challenge (ถูก 3 ข้อติดขึ้นที่ 1 ทันที ผิด 1 ข้อตกไปบ๊วยสุด!)'
                    : 'Instant 3 random cards, global stage disruptions, and the Ascension Challenge: answer 3 in a row to jump directly to 1st place!'}
                </p>
              </div>
            </div>
          )}

          {tab === 'cards' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
                <h4 className="font-black text-emerald-300 text-xs uppercase tracking-wider mb-2">
                  🛡️ {lang === 'th' ? 'การ์ดบัฟตัวเอง (Buff Cards)' : 'Self-Buff Cards'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div><b>50/50 Purge:</b> {lang === 'th' ? 'ตัดตัวเลือกผิดออก 1-2 ข้อ' : 'Eliminates wrong choices'}</div>
                  <div><b>Double Down:</b> {lang === 'th' ? 'คะแนนคูณสองในข้อถัดไป' : 'Doubles next correct points'}</div>
                  <div><b>Time Warp:</b> {lang === 'th' ? 'ยืดเวลาเพิ่มอีก 5 วินาที' : 'Adds +5 extra seconds'}</div>
                  <div><b>Sonic Shield:</b> {lang === 'th' ? 'ป้องกันการก่อกวนทุกชนิด' : 'Blocks all opponent debuffs'}</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30">
                <h4 className="font-black text-rose-300 text-xs uppercase tracking-wider mb-2">
                  ⚔️ {lang === 'th' ? 'การ์ดก่อกวนคู่แข่ง (Sabotage Cards)' : 'Sabotage / Debuff Cards'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div><b>Ink Splat:</b> {lang === 'th' ? 'หมึกบังตา 8 จุด ต้องเช็ด 2 ครั้ง' : '8 dense ink splats, 2 wipes each'}</div>
                  <div><b>Cryo Freeze:</b> {lang === 'th' ? 'แช่แข็งปุ่มกด 3.5 วินาที' : 'Freezes rival choices for 3.5 seconds'}</div>
                  <div><b>Smoke Screen:</b> {lang === 'th' ? 'หมอกควันหนาทึบบังตัวเลือก' : 'Thick heavy fog obscuring answers'}</div>
                  <div><b>Jumble:</b> {lang === 'th' ? 'สลับตำแหน่งปุ่มและกวนตัวอักษร' : 'Shuffles buttons and scrambles text'}</div>
                  <div><b>Parasite Leech:</b> {lang === 'th' ? 'ขโมยแต้มจากคู่แข่ง 450 แต้ม' : 'Steals 450 pts from victim'}</div>
                  <div><b>Static Glitch:</b> {lang === 'th' ? 'สัญญาณ VHS รบกวนหน้าจอ' : 'Floods rival screen with static noise'}</div>
                </div>
              </div>
            </div>
          )}

          {tab === 'tips' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="font-black text-white text-xs uppercase tracking-wider">
                  ⌨️ {lang === 'th' ? 'ปุ่มคีย์ลัดบนคีย์บอร์ด (Hotkeys)' : 'Keyboard Shortcuts'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="glass p-2 rounded-xl border border-white/10">
                    <span className="font-mono font-black text-spotify text-sm">1 / A</span>
                    <p className="text-[11px] text-neutral-400">Choice A</p>
                  </div>
                  <div className="glass p-2 rounded-xl border border-white/10">
                    <span className="font-mono font-black text-spotify text-sm">2 / B</span>
                    <p className="text-[11px] text-neutral-400">Choice B</p>
                  </div>
                  <div className="glass p-2 rounded-xl border border-white/10">
                    <span className="font-mono font-black text-spotify text-sm">3 / C</span>
                    <p className="text-[11px] text-neutral-400">Choice C</p>
                  </div>
                  <div className="glass p-2 rounded-xl border border-white/10">
                    <span className="font-mono font-black text-spotify text-sm">4 / D</span>
                    <p className="text-[11px] text-neutral-400">Choice D</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="font-black text-white text-xs uppercase tracking-wider">
                  🔊 {lang === 'th' ? 'ระบบปรับเสียง & โหมดโฟกัส' : 'Volume & Quiet Mode (-50%)'}
                </h4>
                <p className="text-xs text-neutral-300">
                  {lang === 'th'
                    ? 'ที่มุมขวาล่างของหน้าจอมี Music Player Widget ที่สามารถปรับระดับเสียง หรือกดปุ่ม "Quiet 50%" เพื่อลดเสียงลงครึ่งหนึ่งทันทีเมื่อต้องการพูดคุยกับเพื่อนใน Discord'
                    : 'The bottom-right Music Player Widget features a volume slider and a Quick -50% Quiet Mode button for chatting with friends.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="font-black text-white text-xs uppercase tracking-wider">
                  🎵 {lang === 'th' ? 'เลือกหลายหมวดหมู่พร้อมกัน (Multi-Topic)' : 'Multi-Topic Trivia'}
                </h4>
                <p className="text-xs text-neutral-300">
                  {lang === 'th'
                    ? 'ในหน้า Match Settings คุณสามารถเลือกประเภทคำถามได้พร้อมกัน เช่น เลือกทั้ง "ชื่อเพลง" และ "ศิลปิน/นักร้อง" ระบบจะสุ่มถามทั้ง 2 หมวดสลับกันในแต่ละรอบ!'
                    : 'In Match Settings, you can select multiple question types simultaneously (e.g. Song Titles + Singers). Questions will alternate dynamically!'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-end shrink-0">
          <button
            onClick={() => {
              sfx.click();
              onClose();
            }}
            className="btn-primary py-2 px-6 text-xs font-black cursor-pointer"
          >
            {t('close') || 'Got it!'}
          </button>
        </div>
      </div>
    </div>
  );
};
