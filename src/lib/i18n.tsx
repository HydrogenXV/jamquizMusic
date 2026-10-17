import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from '../../shared/types';
import { DICTS } from './translations';

type TFn = (key: string, params?: Record<string, string | number>) => string;
interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
}

const Ctx = createContext<I18nCtx | null>(null);

function detect(): Lang {
  const saved = localStorage.getItem('sq.lang') as Lang | null;
  if (saved && saved in DICTS) return saved;
  const nav = navigator.language.slice(0, 2);
  return (['th', 'ja', 'es'].includes(nav) ? nav : 'en') as Lang;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);
  const setLang = useCallback((l: Lang) => {
    localStorage.setItem('sq.lang', l);
    setLangState(l);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const t = useCallback<TFn>(
    (key, params) => {
      let s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
      if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
      return s;
    },
    [lang],
  );
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n outside provider');
  return c;
}
