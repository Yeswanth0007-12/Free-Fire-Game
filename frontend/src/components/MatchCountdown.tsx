"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownProps {
  targetDate: string;
  prefix?: string;
  onFinish?: () => void;
}

export default function MatchCountdown({ targetDate, prefix = "Starts in:", onFinish }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
    isEnded: boolean;
  }>({
    hours: "00",
    minutes: "00",
    seconds: "00",
    isEnded: false,
  });

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: "00", minutes: "00", seconds: "00", isEnded: true });
        if (onFinish) onFinish();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
        isEnded: false,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onFinish]);

  if (timeLeft.isEnded) {
    return <span className="text-rose-400 font-semibold text-xs uppercase tracking-wider">Time reached</span>;
  }

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
      <Clock className="h-3.5 w-3.5 text-amber-400" />
      <span className="text-slate-400">{prefix}</span>
      <span className="font-bold text-amber-400">
        {timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
      </span>
    </div>
  );
}
