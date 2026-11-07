import { useEffect, useState } from "react";

export function useCountdown(expiresAt: string | number): {
  remainingMs: number;
  isExpired: boolean;
} {
  const target =
    typeof expiresAt === "number"
      ? expiresAt
      : new Date(expiresAt).getTime();
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, target - Date.now()),
  );

  useEffect(() => {
    const tick = () => {
      setRemainingMs(Math.max(0, target - Date.now()));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return { remainingMs, isExpired: remainingMs <= 0 };
}
