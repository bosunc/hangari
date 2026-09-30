export type LeaderboardRow = {
  user_id: string;
  nickname: string;
  clear_time_ms: number;
};

export function formatTime(ms: number | null) {
  if (ms === null) return "--:--.---";
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  const millis = ms % 1_000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}
