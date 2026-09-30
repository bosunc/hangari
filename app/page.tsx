"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { formatTime, type LeaderboardRow } from "@/lib/types";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), { ssr: false });
type View = "home" | "login" | "signup" | "game";
type AuthView = Exclude<View, "game">;

export default function Home() {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>("home");
  const [loading, setLoading] = useState(configured);
  const [nickname, setNickname] = useState("");
  const [best, setBest] = useState<number | null>(null);
  const [ranking, setRanking] = useState<LeaderboardRow[]>([]);
  const [clearResult, setClearResult] = useState<{ time: number; rank: number | null } | null>(null);

  const loadStats = useCallback(async (userId: string) => {
    const supabase = getSupabase();
    const [{ data: profile }, { data: record }, { data: board }] = await Promise.all([
      supabase.from("profiles").select("nickname").eq("user_id", userId).single(),
      supabase.from("game_records").select("clear_time_ms").eq("user_id", userId).eq("stage", 1).order("clear_time_ms").limit(1).maybeSingle(),
      supabase.from("stage1_leaderboard").select("user_id,nickname,clear_time_ms").limit(10),
    ]);
    setNickname(profile?.nickname ?? "등반가");
    setBest(record?.clear_time_ms ?? null);
    setRanking((board as LeaderboardRow[] | null) ?? []);
  }, []);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) void loadStats(data.session.user.id);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) void loadStats(nextSession.user.id);
    });
    return () => listener.subscription.unsubscribe();
  }, [configured, loadStats]);

  const saveClear = useCallback(async (time: number) => {
    if (!session) return { best: time, rank: null };
    const supabase = getSupabase();
    const { error } = await supabase.from("game_records").insert({ user_id: session.user.id, stage: 1, clear_time_ms: time });
    if (error) throw error;
    const { data: board } = await supabase.from("stage1_leaderboard").select("user_id,nickname,clear_time_ms").limit(10);
    const nextBoard = (board as LeaderboardRow[] | null) ?? [];
    setRanking(nextBoard);
    setBest((previous) => previous === null ? time : Math.min(previous, time));
    const personalBest = best === null ? time : Math.min(best, time);
    const rank = nextBoard.findIndex((row) => row.user_id === session.user.id) + 1 || null;
    setClearResult({ time, rank });
    return { best: personalBest, rank };
  }, [best, session]);

  if (!configured) return <SetupNotice />;
  if (loading) return <main className="center"><div className="loader" /><p>베이스캠프 준비 중…</p></main>;
  if (!session) {
    const authView: AuthView = view === "game" ? "home" : view;
    return <AuthScreen view={authView} setView={setView} />;
  }
  if (view === "game") return <GameCanvas onExit={() => { setView("home"); setClearResult(null); }} onClear={saveClear} />;

  return (
    <main className="shell">
      <header className="topbar"><Brand /><div className="user-chip"><span>●</span>{nickname}</div></header>
      <section className="hero dashboard">
        <div>
          <p className="eyebrow">PROTOTYPE v0.1 · STAGE 01</p>
          <h1>정상까지,<br /><em>도구 하나로.</em></h1>
          <p className="subtitle">고철 캡슐과 자석 곡괭이를 이용해 유리 협곡을 올라보세요. 떨어져도 길은 다시 이어집니다.</p>
          <button className="primary large" onClick={() => { setClearResult(null); setView("game"); }}>STAGE 1 시작 <b>→</b></button>
          <div className="controls-hint"><kbd>마우스</kbd> 도구 회전 <span /> <kbd>R</kbd> 재시작</div>
        </div>
        <aside className="stats-card">
          <p>MY PERSONAL BEST</p><strong>{formatTime(best)}</strong>
          <div className="mountain-mark">△<i>◉</i></div>
          <small>STAGE 1 · GLASS RAVINE</small>
        </aside>
      </section>
      {clearResult && <section className="clear-banner"><div><small>STAGE CLEAR</small><b>{formatTime(clearResult.time)}</b></div><div><small>PERSONAL BEST</small><b>{formatTime(best)}</b></div><div><small>GLOBAL RANK</small><b>{clearResult.rank ? `#${clearResult.rank}` : "TOP 10 밖"}</b></div></section>}
      <Leaderboard rows={ranking} userId={session.user.id} />
      <footer><span>SUMMIT SCRAP / 2026</span><button className="text-button" onClick={() => getSupabase().auth.signOut()}>로그아웃</button></footer>
    </main>
  );
}

function Brand() { return <div className="brand"><i>▲</i><b>SUMMIT<br />SCRAP</b></div>; }

function SetupNotice() {
  return <main className="center"><Brand /><section className="auth-card"><p className="eyebrow">SETUP REQUIRED</p><h2>Supabase 연결이 필요합니다</h2><p><code>.env.example</code>을 <code>.env.local</code>로 복사하고 프로젝트 값을 입력하세요.</p><p>자세한 순서는 README의 설정 가이드를 확인하세요.</p></section></main>;
}

function AuthScreen({ view, setView }: { view: AuthView; setView: (v: AuthView) => void }) {
  if (view === "home") return <main className="landing"><nav><Brand /><span>PHYSICS CLIMBING EXPERIMENT</span></nav><section><p className="eyebrow">A VERTICAL JOURNEY</p><h1>흔들려도<br /><em>올라간다.</em></h1><p>중력과 관성, 단 하나의 자석 곡괭이.<br />당신만의 방식으로 폐허의 정상을 정복하세요.</p><div className="actions"><button className="primary" onClick={() => setView("login")}>로그인</button><button className="secondary" onClick={() => setView("signup")}>회원가입</button></div></section><div className="landing-art"><div className="sun"/><div className="peak p1"/><div className="peak p2"/><div className="capsule">●<i /></div></div></main>;
  return <AuthForm mode={view} goBack={() => setView("home")} switchMode={() => setView(view === "login" ? "signup" : "login")} />;
}

function AuthForm({ mode, goBack, switchMode }: { mode: "login" | "signup"; goBack: () => void; switchMode: () => void }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget); const email = String(form.get("email")); const password = String(form.get("password"));
    const supabase = getSupabase();
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { nickname: String(form.get("nickname")) } } });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("가입 확인 메일을 확인한 뒤 로그인하세요.");
  }
  return <main className="center"><button className="back" onClick={goBack}>← 처음으로</button><form className="auth-card" onSubmit={submit}><Brand /><p className="eyebrow">{mode === "login" ? "WELCOME BACK" : "JOIN THE CLIMB"}</p><h2>{mode === "login" ? "베이스캠프 입장" : "등반가 등록"}</h2>{mode === "signup" && <label>닉네임<input name="nickname" minLength={2} maxLength={20} required placeholder="2~20자" /></label>}<label>이메일<input name="email" type="email" required placeholder="climber@example.com" /></label><label>비밀번호<input name="password" type="password" minLength={6} required placeholder="6자 이상" /></label>{message && <p className="form-message">{message}</p>}<button className="primary" disabled={busy}>{busy ? "처리 중…" : mode === "login" ? "로그인" : "회원가입"}</button><button type="button" className="text-button" onClick={switchMode}>{mode === "login" ? "처음인가요? 회원가입" : "이미 계정이 있나요? 로그인"}</button></form></main>;
}

function Leaderboard({ rows, userId }: { rows: LeaderboardRow[]; userId: string }) {
  return <section className="leaderboard"><div className="section-title"><div><p className="eyebrow">GLOBAL RECORDS</p><h2>Stage 1 TOP 10</h2></div><span>최단 기록 기준</span></div><div className="table"><div className="tr head"><span>RANK</span><span>CLIMBER</span><span>TIME</span></div>{rows.length === 0 && <p className="empty">아직 기록이 없습니다. 첫 기록의 주인공이 되어보세요.</p>}{rows.map((row, i) => <div className={`tr ${row.user_id === userId ? "mine" : ""}`} key={row.user_id}><span>{String(i + 1).padStart(2, "0")}</span><span>{row.nickname}{row.user_id === userId && <small>YOU</small>}</span><strong>{formatTime(row.clear_time_ms)}</strong></div>)}</div></section>;
}
