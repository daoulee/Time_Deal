/**
 * 오렌지 라이트·다크 테마 상태를 저장하고 문서 루트에 적용합니다.
 * AppShell과 AuthPage 등 전체 UI가 context를 통해 테마를 읽고 변경합니다.
 * 사용자 선택을 localStorage에 보존하되 저장소 접근 실패도 허용합니다.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type ThemeContextValue = { theme: Theme; toggleTheme: () => void; mounted: boolean };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("timedeal-theme");
    const next: Theme = saved === "dark" || saved === "light"
      ? saved
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("timedeal-theme", theme);
  }, [mounted, theme]);

  const value = useMemo(() => ({ theme, mounted, toggleTheme: () => setTheme((current) => current === "light" ? "dark" : "light") }), [mounted, theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme은 ThemeProvider 안에서 사용해야 합니다.");
  return context;
}
