import { useEffect, useState } from "react";
import { Text } from "react-native";

type Props = {
  deadline: string;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Time's up";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function PickupCountdown({ deadline }: Props) {
  const [remaining, setRemaining] = useState(() => new Date(deadline).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(new Date(deadline).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const urgent = remaining < 2 * 60 * 1000; // under 2 minutes left

  return (
    <Text className={`text-xs font-bold mt-1 ${urgent ? "text-danger" : "text-warning"}`}>
      Pickup within {formatRemaining(remaining)}
    </Text>
  );
}