/**
 * 고령자 등 저시력 사용자를 위한 "큰 글씨 모드" 토글입니다. html에 large-text 클래스를 붙여
 * index.css의 zoom 배율로 텍스트뿐 아니라 버튼·아이콘까지 함께 확대합니다.
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "timedeal-large-text";

function readInitial() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useLargeText() {
  const [enabled, setEnabled] = useState(readInitial);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", enabled);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // 저장소 접근이 막혀 있어도 화면 배율은 그대로 적용합니다.
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((value) => !value), []);
  return { enabled, toggle };
}
