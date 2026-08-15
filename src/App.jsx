import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sun, Sparkles, Plus, X, Trash2, Lock, Check, Edit3, Bell, Crown, RefreshCw, LogOut, Mail } from "lucide-react";

/* ---------------- Supabase project (filled in from your dashboard) ---------------- */
const SUPABASE_URL = "https://zqzdcvvraxqfgmyyitzj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Pvi7m5c8p5LBgV35C9nMdw_J9N5Ie-H";

/* Browser-storage shim — window.storage only exists inside Claude's preview.
   On a real deployed site we use plain localStorage instead, same shape. */
const storage = {
  async get(key) {
    const v = window.localStorage.getItem(key);
    return v !== null ? { key, value: v } : null;
  },
  async set(key, value) {
    window.localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    window.localStorage.removeItem(key);
    return { key, deleted: true };
  },
};


/* ---------------- design tokens — dark, high-contrast + liquid glass ---------------- */
const C = {
  bg: "#14181B",
  text: "#F5F1E6",
  textSoft: "rgba(245,241,230,0.58)",
  accent: "#E8A23D",
  accent2: "#6FB3A0",
  line: "rgba(245,241,230,0.14)",
  danger: "#E8846B",
  onAccent: "#14181B",
};

const PALETTE = [
  { name: "amber", hex: "#E8A23D" },
  { name: "teal", hex: "#6FB3A0" },
  { name: "clay", hex: "#E29277" },
  { name: "slate", hex: "#89AEDB" },
];

const EMOJIS = ["💧", "🧘", "🏃", "📖", "🥗", "😴"];
const TAB_ORDER = ["today", "habits", "progress"];
const FREE_HABIT_LIMIT = 3;

const glass = (extra = {}) => ({
  background: "linear-gradient(158deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))",
  backdropFilter: "blur(18px) saturate(180%)",
  WebkitBackdropFilter: "blur(18px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.18), 0 10px 30px rgba(0,0,0,0.35)",
  ...extra,
});

const todayStr = () => new Date().toISOString().slice(0, 10);
const dateNDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/* ---------------- Supabase helpers — plain fetch, no SDK needed ---------------- */

async function sbFetch(path, { method = "GET", body, accessToken, prefer } = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers["Prefer"] = prefer;
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const err = new Error(errBody.error_description || errBody.msg || errBody.message || `Ошибка запроса (${res.status})`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function friendlyAuthError(msg) {
  if (!msg) return "Что-то пошло не так, попробуйте ещё раз.";
  if (msg.includes("Invalid login credentials")) return "Неверный email или пароль.";
  if (msg.includes("User already registered")) return "Этот email уже зарегистрирован — попробуйте войти.";
  if (msg.toLowerCase().includes("password")) return "Пароль слишком короткий (минимум 6 символов).";
  if (msg.toLowerCase().includes("email")) return "Проверьте, правильно ли указан email.";
  return msg;
}

function useGoogleFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      .mh-btn:focus-visible, .mh-input:focus-visible, .mh-tap:focus-visible {
        outline: 2px solid ${C.accent};
        outline-offset: 2px;
      }
      .mh-input::placeholder { color: rgba(245,241,230,0.4); }

      @keyframes mh-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes mh-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes mh-pop { 0% { transform: scale(1); } 45% { transform: scale(1.16); } 100% { transform: scale(1); } }
      @keyframes mh-drift1 { 0%,100% { transform: translate(0,0) rotate(0deg) scale(1); } 50% { transform: translate(-16px,18px) rotate(8deg) scale(1.1); } }
      @keyframes mh-drift2 { 0%,100% { transform: translate(0,0) rotate(0deg) scale(1); } 50% { transform: translate(18px,-14px) rotate(-10deg) scale(1.12); } }
      @keyframes mh-drift3 { 0%,100% { transform: translate(0,0) rotate(0deg) scale(1); } 50% { transform: translate(-12px,-16px) rotate(6deg) scale(0.92); } }
      @keyframes mh-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
      @keyframes mh-glow { 0%,100% { box-shadow: 0 0 0 0 ${C.accent}55; } 50% { box-shadow: 0 0 0 6px ${C.accent}00; } }
      @keyframes mh-slide-right { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes mh-slide-left { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes mh-burst { from { transform: translate(0,0) scale(1); opacity: 1; } to { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; } }
      @keyframes mh-spin { to { transform: rotate(360deg); } }
      @keyframes mh-cell-in { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
      @keyframes mh-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes mh-sheet-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }

      .mh-slide-right { animation: mh-slide-right 0.26s ease both; }
      .mh-slide-left { animation: mh-slide-left 0.26s ease both; }
      .mh-rise { animation: mh-rise 0.32s ease both; }
      .mh-pebble { transition: background-color 0.22s ease; }
      .mh-cell-in { animation: mh-cell-in 0.28s ease both; }
      .mh-check { transition: background-color 0.18s ease, border-color 0.18s ease; }
      .mh-check.done { animation: mh-pop 0.32s ease; }
      .mh-nav-btn { transition: color 0.18s ease; }
      .mh-nav-icon { transition: transform 0.18s ease; }
      .mh-nav-btn.active .mh-nav-icon { animation: mh-pop 0.3s ease; }
      .mh-nav-pill { transition: transform 0.32s cubic-bezier(.34,1.4,.5,1); }
      .mh-btn, .mh-tap { transition: transform 0.12s ease, opacity 0.15s ease; }
      .mh-btn:active, .mh-tap:active { transform: scale(0.96); }
      .mh-btn:hover, .mh-card-hover:hover { transform: translateY(-1px); }
      .mh-blob1 { animation: mh-drift1 9s ease-in-out infinite; }
      .mh-blob2 { animation: mh-drift2 11s ease-in-out infinite; }
      .mh-blob3 { animation: mh-drift3 13s ease-in-out infinite; }
      .mh-breathe { animation: mh-breathe 2.8s ease-in-out infinite; }
      .mh-glow { animation: mh-glow 2.4s ease-in-out infinite; }
      .mh-particle { animation: mh-burst 0.5s ease-out both; }
      .mh-spinner { animation: mh-spin 0.9s linear infinite; }
      .mh-toast { animation: mh-toast-in 0.22s ease both; }
      .mh-sheet { animation: mh-sheet-in 0.28s ease both; }
      .mh-swipe-row { transition: transform 0.2s ease; }

      @media (prefers-reduced-motion: reduce) {
        .mh-slide-right, .mh-slide-left, .mh-rise, .mh-check.done, .mh-blob1, .mh-blob2, .mh-blob3,
        .mh-breathe, .mh-glow, .mh-nav-btn.active .mh-nav-icon, .mh-particle, .mh-spinner, .mh-cell-in,
        .mh-toast, .mh-sheet { animation: none !important; }
        .mh-pebble, .mh-check, .mh-nav-btn, .mh-btn, .mh-tap, .mh-nav-pill, .mh-nav-icon, .mh-swipe-row { transition: none !important; }
        .mh-btn:active, .mh-tap:active, .mh-btn:hover, .mh-card-hover:hover { transform: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);
}

function useCountUp(target, duration = 650) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
}

function AmbientBlobs() {
  return (
    <>
      <div className="mh-blob1" style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: C.accent, opacity: 0.35, filter: "blur(70px)", pointerEvents: "none", zIndex: 0 }} />
      <div className="mh-blob2" style={{ position: "absolute", bottom: 120, left: -70, width: 240, height: 240, borderRadius: "50%", background: C.accent2, opacity: 0.3, filter: "blur(80px)", pointerEvents: "none", zIndex: 0 }} />
      <div className="mh-blob3" style={{ position: "absolute", top: "40%", right: -50, width: 160, height: 160, borderRadius: "50%", background: "#89AEDB", opacity: 0.2, filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />
    </>
  );
}

export default function MicroHabitsApp() {
  useGoogleFonts();
  const [tab, setTab] = useState("today");
  const [dir, setDir] = useState(1);
  const [session, setSession] = useState(null); // { access_token, refresh_token, user_id, email }
  const sessionRef = useRef(null);
  const [habits, setHabits] = useState([]);
  const [checkins, setCheckins] = useState({});
  const [onboarded, setOnboarded] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [booting, setBooting] = useState(true); // checking stored session / first fetch
  const [saveError, setSaveError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const deleteTimer = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const changeTab = (next) => {
    setDir(TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? 1 : -1);
    setTab(next);
  };

  const persistSession = async (s) => {
    try {
      if (s) await storage.set("microhabits:session", JSON.stringify(s));
      else await storage.delete("microhabits:session");
    } catch (e) {
      /* non-fatal */
    }
  };

  // wraps a Supabase call, refreshing the token once on 401
  const request = useCallback(async (fn) => {
    try {
      return await fn(sessionRef.current.access_token);
    } catch (e) {
      if (e.status === 401 && sessionRef.current && sessionRef.current.refresh_token) {
        try {
          const refreshed = await sbFetch("/auth/v1/token?grant_type=refresh_token", {
            method: "POST",
            body: { refresh_token: sessionRef.current.refresh_token },
          });
          const next = {
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            user_id: refreshed.user.id,
            email: refreshed.user.email,
          };
          sessionRef.current = next;
          setSession(next);
          persistSession(next);
          return await fn(next.access_token);
        } catch (e2) {
          setSession(null);
          persistSession(null);
          throw e2;
        }
      }
      throw e;
    }
  }, []);

  const loadRemoteData = useCallback(async () => {
    const [habitRows, checkinRows] = await request((token) =>
      Promise.all([
        sbFetch("/rest/v1/habits?select=*&order=created_at.asc", { accessToken: token }),
        sbFetch("/rest/v1/checkins?select=habit_id,date", { accessToken: token }),
      ])
    );
    setHabits(
      (habitRows || []).map((h) => ({
        id: h.id,
        name: h.name,
        color: h.color,
        emoji: h.emoji,
        reminder: h.reminder,
        createdAt: h.created_at,
      }))
    );
    const map = {};
    (checkinRows || []).forEach((r) => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r.habit_id);
    });
    setCheckins(map);
  }, [request]);

  // boot: restore local flags + session, then fetch remote data if logged in
  useEffect(() => {
    (async () => {
      try {
        const flags = await storage.get("microhabits:flags");
        if (flags && flags.value) {
          const parsed = JSON.parse(flags.value);
          setOnboarded(!!parsed.onboarded);
          setIsPremium(!!parsed.isPremium);
        }
      } catch (e) {
        /* first run */
      }

      let restored = null;
      try {
        const res = await storage.get("microhabits:session");
        if (res && res.value) restored = JSON.parse(res.value);
      } catch (e) {
        /* not logged in yet */
      }

      if (restored) {
        sessionRef.current = restored;
        setSession(restored);
        try {
          await loadRemoteData();
        } catch (e) {
          setSession(null);
          persistSession(null);
        }
      }
      setBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistFlags = useCallback(async (next) => {
    try {
      await storage.set("microhabits:flags", JSON.stringify(next));
    } catch (e) {
      /* non-fatal */
    }
  }, []);

  const finishOnboarding = () => {
    setOnboarded(true);
    persistFlags({ onboarded: true, isPremium });
  };

  const activatePremium = () => {
    setIsPremium(true);
    persistFlags({ onboarded, isPremium: true });
    setShowSubscribe(false);
  };

  const handleAuthed = async (s) => {
    sessionRef.current = s;
    setSession(s);
    await persistSession(s);
    setBooting(true);
    try {
      await loadRemoteData();
    } catch (e) {
      setSaveError(true);
    }
    setBooting(false);
  };

  const signOut = () => {
    setSession(null);
    sessionRef.current = null;
    persistSession(null);
    setHabits([]);
    setCheckins({});
  };

  const addHabit = async (name, color, emoji) => {
    if (!isPremium && habits.length >= FREE_HABIT_LIMIT) {
      setShowSubscribe(true);
      return false;
    }
    try {
      const [row] = await request((token) =>
        sbFetch("/rest/v1/habits", {
          method: "POST",
          accessToken: token,
          prefer: "return=representation",
          body: [{ user_id: sessionRef.current.user_id, name, color, emoji, reminder: false }],
        })
      );
      setHabits((prev) => [...prev, { id: row.id, name: row.name, color: row.color, emoji: row.emoji, reminder: row.reminder, createdAt: row.created_at }]);
      return true;
    } catch (e) {
      setSaveError(true);
      return false;
    }
  };

  const updateHabit = async (id, patch) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    try {
      await request((token) => sbFetch(`/rest/v1/habits?id=eq.${id}`, { method: "PATCH", accessToken: token, prefer: "return=minimal", body: patch }));
    } catch (e) {
      setSaveError(true);
    }
  };

  const requestDelete = (habit) => {
    setPendingDelete({ id: habit.id, name: habit.name });
    clearTimeout(deleteTimer.current);
    deleteTimer.current = setTimeout(() => finalizeDelete(habit.id), 4000);
  };

  const finalizeDelete = async (id) => {
    try {
      await request((token) => sbFetch(`/rest/v1/checkins?habit_id=eq.${id}`, { method: "DELETE", accessToken: token }));
      await request((token) => sbFetch(`/rest/v1/habits?id=eq.${id}`, { method: "DELETE", accessToken: token }));
      setHabits((prev) => prev.filter((h) => h.id !== id));
    } catch (e) {
      setSaveError(true);
    }
    setPendingDelete((p) => (p && p.id === id ? null : p));
  };

  const undoDelete = () => {
    clearTimeout(deleteTimer.current);
    setPendingDelete(null);
  };

  const toggleToday = async (habitId) => {
    const t = todayStr();
    const wasDone = (checkins[t] || []).includes(habitId);
    const day = new Set(checkins[t] || []);
    wasDone ? day.delete(habitId) : day.add(habitId);
    setCheckins((prev) => ({ ...prev, [t]: Array.from(day) }));

    try {
      if (wasDone) {
        await request((token) => sbFetch(`/rest/v1/checkins?habit_id=eq.${habitId}&date=eq.${t}`, { method: "DELETE", accessToken: token }));
      } else {
        await request((token) =>
          sbFetch("/rest/v1/checkins", { method: "POST", accessToken: token, body: [{ user_id: sessionRef.current.user_id, habit_id: habitId, date: t }] })
        );
      }
    } catch (e) {
      // revert optimistic update on failure
      setCheckins((prev) => ({ ...prev, [t]: checkins[t] || [] }));
      setSaveError(true);
    }
  };

  const isDone = (habitId, date) => (checkins[date] || []).includes(habitId);
  const visibleHabits = habits.filter((h) => !pendingDelete || pendingDelete.id !== h.id);

  const totalPebbles = Object.values(checkins).reduce((s, arr) => s + arr.length, 0);
  const activeDays = Object.keys(checkins).filter((d) => checkins[d].length > 0).length;

  if (booting) {
    return (
      <div style={{ background: "#0A0C0A", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center" }}>
        <div className="mh-spinner" style={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid ${C.line}`, borderTopColor: C.accent }} />
        <p style={{ fontFamily: "Manrope, sans-serif", color: C.textSoft, fontSize: 14 }}>Загружаю…</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#0A0C0A", minHeight: "100vh", display: "flex", justifyContent: "center", padding: "24px 12px", fontFamily: "Manrope, sans-serif" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: `radial-gradient(120% 100% at 30% 0%, #1B211C, ${C.bg} 60%)`,
          borderRadius: 32,
          minHeight: 720,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
          border: `1px solid ${C.line}`,
          position: "relative",
        }}
      >
        <AmbientBlobs />

        {!session && <AuthScreen onAuthed={handleAuthed} />}

        {session && !onboarded && <Onboarding onFinish={finishOnboarding} />}

        {session && onboarded && (
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div className="mh-rise">
              <Header saveError={saveError} isPremium={isPremium} email={session.email} onSignOut={signOut} />
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 104px" }}>
              <div key={tab} className={dir === 1 ? "mh-slide-right" : "mh-slide-left"}>
                {tab === "today" && (
                  <TodayTab habits={visibleHabits} checkins={checkins} isDone={isDone} toggleToday={toggleToday} onGoAdd={() => changeTab("habits")} />
                )}
                {tab === "habits" && (
                  <HabitsTab
                    habits={visibleHabits}
                    addHabit={addHabit}
                    updateHabit={updateHabit}
                    requestDelete={requestDelete}
                    isPremium={isPremium}
                    onOpenSubscribe={() => setShowSubscribe(true)}
                  />
                )}
                {tab === "progress" && (
                  <ProgressTab habits={visibleHabits} isDone={isDone} totalPebbles={totalPebbles} activeDays={activeDays} isPremium={isPremium} onOpenSubscribe={() => setShowSubscribe(true)} />
                )}
              </div>
            </div>

            {pendingDelete && (
              <div className="mh-toast" style={{ position: "absolute", left: 16, right: 16, bottom: 84, zIndex: 5, ...glass({ borderRadius: 14 }), padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: C.text }}>Привычка «{pendingDelete.name}» удалена</span>
                <button className="mh-tap" onClick={undoDelete} style={{ background: "none", border: "none", color: C.accent, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Отменить
                </button>
              </div>
            )}

            <BottomNav tab={tab} setTab={changeTab} />
          </div>
        )}

        {showSubscribe && <SubscribeSheet onClose={() => setShowSubscribe(false)} onActivate={activatePremium} />}
      </div>
    </div>
  );
}

/* ---------------- AUTH ---------------- */

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async () => {
    setError("");
    setInfo("");
    if (!email.trim() || password.length < 6) {
      setError("Введите email и пароль от 6 символов.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await sbFetch("/auth/v1/signup", { method: "POST", body: { email: email.trim(), password } });
        if (res && res.access_token) {
          onAuthed({ access_token: res.access_token, refresh_token: res.refresh_token, user_id: res.user.id, email: res.user.email });
        } else {
          setInfo("Готово! Проверьте почту и подтвердите email по ссылке, потом войдите здесь.");
          setMode("login");
        }
      } else {
        const res = await sbFetch("/auth/v1/token?grant_type=password", { method: "POST", body: { email: email.trim(), password } });
        onAuthed({ access_token: res.access_token, refresh_token: res.refresh_token, user_id: res.user.id, email: res.user.email });
      }
    } catch (e) {
      setError(friendlyAuthError(e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%", minHeight: 720, padding: "60px 24px 32px", justifyContent: "space-between" }}>
      <div className="mh-rise" style={{ textAlign: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Sun size={22} color={C.onAccent} />
        </div>
        <h1 style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 700, fontSize: 20, color: C.text, margin: "0 0 6px" }}>Микропривычки</h1>
        <p style={{ fontSize: 13, color: C.textSoft, margin: 0 }}>
          {mode === "login" ? "Войдите, чтобы продолжить с любого устройства" : "Создайте аккаунт — это займёт минуту"}
        </p>
      </div>

      <div style={{ ...glass(), borderRadius: 18, padding: 18 }}>
        <label style={{ fontSize: 11.5, color: C.textSoft, display: "block", marginBottom: 6 }}>Email</label>
        <input
          className="mh-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: "100%", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 12, padding: "11px 12px", fontSize: 15, color: C.text, background: "rgba(0,0,0,0.18)", outline: "none", boxSizing: "border-box", marginBottom: 12, fontFamily: "Manrope, sans-serif" }}
        />
        <label style={{ fontSize: 11.5, color: C.textSoft, display: "block", marginBottom: 6 }}>Пароль</label>
        <input
          className="mh-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="минимум 6 символов"
          style={{ width: "100%", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 12, padding: "11px 12px", fontSize: 15, color: C.text, background: "rgba(0,0,0,0.18)", outline: "none", boxSizing: "border-box", marginBottom: 14, fontFamily: "Manrope, sans-serif" }}
        />

        {error && <p style={{ fontSize: 12.5, color: C.danger, margin: "0 0 10px" }}>{error}</p>}
        {info && <p style={{ fontSize: 12.5, color: C.accent2, margin: "0 0 10px" }}>{info}</p>}

        <button
          className="mh-btn"
          onClick={submit}
          disabled={loading}
          style={{ width: "100%", background: C.accent, color: C.onAccent, border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {loading ? <span className="mh-spinner" style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${C.onAccent}55`, borderTopColor: C.onAccent }} /> : <Mail size={15} />}
          {mode === "login" ? "Войти" : "Зарегистрироваться"}
        </button>

        <button
          className="mh-tap"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
            setInfo("");
          }}
          style={{ width: "100%", background: "none", border: "none", color: C.textSoft, fontSize: 12.5, padding: "12px 0 0", cursor: "pointer" }}
        >
          {mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- ONBOARDING ---------------- */

function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0);
  const slides = [
    { icon: "🌱", title: "Маленькие шаги", text: "Не «бегать по утрам», а «выпить стакан воды». Микропривычки проще начать и проще не бросить." },
    { icon: "🪨", title: "Без чувства вины", text: "Пропущенный день не обнуляет прогресс. Мы считаем собранные отметки, а не разорванные стрики." },
    { icon: "✨", title: "Готовы начать?", text: "Добавьте первую привычку — и возвращайтесь сюда каждый день хотя бы на минуту." },
  ];
  const s = slides[step];
  const last = step === slides.length - 1;

  return (
    <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%", minHeight: 720, padding: "40px 28px", justifyContent: "space-between" }}>
      <div key={step} className="mh-rise" style={{ textAlign: "center", marginTop: 60 }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>{s.icon}</div>
        <h2 style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 700, fontSize: 22, color: C.text, margin: "0 0 12px" }}>{s.title}</h2>
        <p style={{ fontSize: 14.5, color: C.textSoft, lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>{s.text}</p>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 22 }}>
          {slides.map((_, i) => (
            <span key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? C.accent : "rgba(245,241,230,0.25)", transition: "all .2s ease" }} />
          ))}
        </div>
        <button
          className="mh-btn"
          onClick={() => (last ? onFinish() : setStep(step + 1))}
          style={{ width: "100%", background: C.accent, color: C.onAccent, border: "none", borderRadius: 14, padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
        >
          {last ? "Начать" : "Далее"}
        </button>
        {!last && (
          <button className="mh-tap" onClick={onFinish} style={{ width: "100%", background: "none", border: "none", color: C.textSoft, fontSize: 13, padding: "12px 0 0", cursor: "pointer" }}>
            Пропустить
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- SUBSCRIBE SHEET (mock — no real payment) ---------------- */

function SubscribeSheet({ onClose, onActivate }) {
  const [plan, setPlan] = useState("year");
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end" }}>
      <div className="mh-sheet" style={{ width: "100%", ...glass({ borderRadius: "24px 24px 0 0" }), padding: "22px 20px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Crown size={18} color={C.accent} />
            <h2 style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 700, fontSize: 17, color: C.text, margin: 0 }}>Микропривычки Premium</h2>
          </div>
          <button className="mh-tap" onClick={onClose} aria-label="Закрыть" style={{ background: "none", border: "none", color: C.textSoft, cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 16px" }}>
          Безлимит привычек и еженедельный ИИ-инсайт вместо трёх привычек и общей статистики.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { id: "month", label: "Месяц", price: "199 ₽" },
            { id: "year", label: "Год", price: "1490 ₽", badge: "−38%" },
          ].map((p) => (
            <button
              key={p.id}
              className="mh-tap"
              onClick={() => setPlan(p.id)}
              style={{
                flex: 1,
                textAlign: "left",
                borderRadius: 14,
                padding: "12px 14px",
                cursor: "pointer",
                border: plan === p.id ? `1.5px solid ${C.accent}` : "1px solid rgba(255,255,255,0.16)",
                background: plan === p.id ? "rgba(232,162,61,0.12)" : "rgba(255,255,255,0.04)",
                position: "relative",
              }}
            >
              {p.badge && (
                <span style={{ position: "absolute", top: -8, right: 10, background: C.accent, color: C.onAccent, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8 }}>{p.badge}</span>
              )}
              <div style={{ fontSize: 12.5, color: C.textSoft }}>{p.label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text, fontFamily: "Unbounded, sans-serif" }}>{p.price}</div>
            </button>
          ))}
        </div>

        <button
          className="mh-btn"
          onClick={onActivate}
          style={{ width: "100%", background: C.accent, color: C.onAccent, border: "none", borderRadius: 14, padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
        >
          Оформить
        </button>
        <p style={{ fontSize: 11, color: C.textSoft, textAlign: "center", marginTop: 10 }}>
          Демо-режим: оплата не списывается, кнопка просто включает Premium локально.
        </p>
      </div>
    </div>
  );
}

function Header({ saveError, isPremium, email, onSignOut }) {
  const label = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div style={{ ...glass({ borderRadius: 0, border: "none", borderBottom: `1px solid ${C.line}` }), padding: "24px 20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent2, margin: 0, fontWeight: 600 }}>
            {label}
          </p>
          <h1 style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 700, fontSize: 21, color: C.text, margin: "4px 0 0" }}>
            Микропривычки
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isPremium && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(232,162,61,0.16)", border: `1px solid ${C.accent}55`, borderRadius: 20, padding: "4px 9px" }}>
              <Crown size={12} color={C.accent} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: C.accent }}>Premium</span>
            </span>
          )}
          <button className="mh-tap" onClick={onSignOut} aria-label="Выйти" title={email} style={{ background: "none", border: "none", color: C.textSoft, cursor: "pointer", padding: 4 }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
      {email && <p style={{ fontSize: 11, color: C.textSoft, margin: "6px 0 0" }}>{email}</p>}
      {saveError && (
        <p style={{ fontSize: 12, color: C.danger, marginTop: 6 }}>Не удалось сохранить — проверьте связь и попробуйте ещё раз.</p>
      )}
    </div>
  );
}

/* ---------------- TODAY ---------------- */

function TodayTab({ habits, checkins, isDone, toggleToday, onGoAdd }) {
  if (habits.length === 0) {
    return (
      <EmptyState
        title="Пока пусто"
        text="Добавьте одну маленькую привычку — не «бегать по утрам», а «выпить стакан воды». С малого проще начать."
        actionLabel="Добавить привычку"
        onAction={onGoAdd}
      />
    );
  }

  const t = todayStr();
  const doneToday = (checkins[t] || []).length;

  return (
    <div>
      <p style={{ fontSize: 14, color: C.textSoft, margin: "18px 0 20px" }}>
        Сегодня отмечено {doneToday} из {habits.length}. Пропущенный день — не повод начинать сначала.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {habits.map((h, i) => (
          <div key={h.id} className="mh-rise" style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}>
            <HabitCard habit={h} checkins={checkins} isDone={isDone} onToggleToday={() => toggleToday(h.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function HabitCard({ habit, isDone, onToggleToday }) {
  const days = [6, 5, 4, 3, 2, 1, 0].map((n) => dateNDaysAgo(n));
  const t = todayStr();
  const doneToday = isDone(habit.id, t);
  const [burst, setBurst] = useState(false);

  const handleToggle = () => {
    if (!doneToday) {
      setBurst(true);
      setTimeout(() => setBurst(false), 500);
    }
    onToggleToday();
  };

  const particles = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2;
    return { dx: Math.cos(angle) * 26, dy: Math.sin(angle) * 26 };
  });

  return (
    <div className="mh-card-hover" style={{ ...glass(), borderRadius: 18, padding: "16px 16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 26, height: 26, borderRadius: "50%", background: `${habit.color}26`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
            {habit.emoji || "•"}
          </span>
          <span style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 600, fontSize: 14, color: C.text }}>{habit.name}</span>
          {habit.reminder && <Bell size={12} color={C.textSoft} />}
        </div>
        <div style={{ position: "relative", width: 36, height: 36 }}>
          {burst &&
            particles.map((p, i) => (
              <span
                key={i}
                className="mh-particle"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: habit.color,
                  marginTop: -2.5,
                  marginLeft: -2.5,
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                }}
              />
            ))}
          <button
            className={`mh-tap mh-check${doneToday ? " done" : ""}`}
            onClick={handleToggle}
            aria-pressed={doneToday}
            style={{
              position: "relative",
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: doneToday ? "none" : "1px solid rgba(255,255,255,0.28)",
              background: doneToday ? habit.color : "linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))",
              backdropFilter: doneToday ? "none" : "blur(6px)",
              WebkitBackdropFilter: doneToday ? "none" : "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {doneToday && <Check size={18} color={C.onAccent} strokeWidth={3} />}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
        {days.map((d) => {
          const done = isDone(habit.id, d);
          const isToday = d === t;
          return (
            <span
              key={d}
              title={d}
              className="mh-pebble"
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background: done ? habit.color : "rgba(245,241,230,0.1)",
                outline: isToday ? `1.5px solid ${habit.color}` : "none",
                outlineOffset: 2,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- HABITS (manage) ---------------- */

function HabitsTab({ habits, addHabit, updateHabit, requestDelete, isPremium, onOpenSubscribe }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0].hex);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [reminder, setReminder] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setName("");
    setColor(PALETTE[0].hex);
    setEmoji(EMOJIS[0]);
    setReminder(false);
    setEditingId(null);
  };

  const startEdit = (h) => {
    setEditingId(h.id);
    setName(h.name);
    setColor(h.color);
    setEmoji(h.emoji || EMOJIS[0]);
    setReminder(!!h.reminder);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    if (editingId) {
      await updateHabit(editingId, { name: trimmed, color, emoji, reminder });
      resetForm();
    } else {
      const ok = await addHabit(trimmed, color, emoji);
      if (ok !== false) resetForm();
    }
    setBusy(false);
  };

  const atLimit = !isPremium && habits.length >= FREE_HABIT_LIMIT && !editingId;

  return (
    <div>
      <p style={{ fontSize: 14, color: C.textSoft, margin: "18px 0 16px" }}>
        Держите привычки маленькими. Проще отметить, проще не бросить.
      </p>

      <div style={{ ...glass(), borderRadius: 18, padding: 16, marginBottom: 20 }}>
        {editingId && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: C.accent2, fontWeight: 600 }}>Редактирование</span>
            <button className="mh-tap" onClick={resetForm} style={{ background: "none", border: "none", color: C.textSoft, fontSize: 12, cursor: "pointer" }}>Отмена</button>
          </div>
        )}

        <input
          className="mh-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Например: выпить стакан воды"
          style={{
            width: "100%",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 12,
            padding: "11px 12px",
            fontSize: 15,
            fontFamily: "Manrope, sans-serif",
            color: C.text,
            background: "rgba(0,0,0,0.18)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
          {EMOJIS.map((e) => (
            <button
              key={e}
              className="mh-tap"
              onClick={() => setEmoji(e)}
              style={{
                width: 32, height: 32, borderRadius: 10, fontSize: 15, cursor: "pointer",
                border: emoji === e ? `1.5px solid ${C.accent}` : "1px solid rgba(255,255,255,0.14)",
                background: emoji === e ? "rgba(232,162,61,0.14)" : "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {e}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {PALETTE.map((p) => (
            <button
              key={p.hex}
              className="mh-tap"
              onClick={() => setColor(p.hex)}
              aria-label={p.name}
              style={{
                width: 27,
                height: 27,
                borderRadius: "50%",
                background: p.hex,
                border: color === p.hex ? `2px solid ${C.text}` : "2px solid transparent",
                boxShadow: color === p.hex ? "0 0 0 3px rgba(0,0,0,0.3)" : "none",
                cursor: "pointer",
                padding: 0,
                transition: "transform 0.15s ease",
                transform: color === p.hex ? "scale(1.12)" : "scale(1)",
              }}
            />
          ))}
        </div>

        <button
          className="mh-tap"
          onClick={() => setReminder((r) => !r)}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 14 }}
        >
          <span style={{ width: 34, height: 20, borderRadius: 10, background: reminder ? C.accent : "rgba(255,255,255,0.16)", position: "relative", transition: "background .18s ease" }}>
            <span style={{ position: "absolute", top: 2, left: reminder ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: C.onAccent, transition: "left .18s ease" }} />
          </span>
          <span style={{ fontSize: 12.5, color: C.textSoft }}>Напоминание (демо — без реальных пуш-уведомлений)</span>
        </button>

        {atLimit ? (
          <button
            className="mh-btn"
            onClick={onOpenSubscribe}
            style={{ width: "100%", background: "rgba(255,255,255,0.08)", color: C.text, border: `1px dashed ${C.accent}80`, borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}
          >
            <Lock size={14} /> Бесплатно — до {FREE_HABIT_LIMIT}. Открыть безлимит
          </button>
        ) : (
          <button
            className="mh-btn"
            onClick={submit}
            disabled={busy}
            style={{
              width: "100%",
              background: C.accent,
              color: C.onAccent,
              border: "none",
              borderRadius: 12,
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
              boxShadow: `0 8px 22px ${C.accent}40`,
            }}
          >
            {busy ? (
              <span className="mh-spinner" style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${C.onAccent}55`, borderTopColor: C.onAccent }} />
            ) : editingId ? (
              <Check size={16} strokeWidth={2.6} />
            ) : (
              <Plus size={16} strokeWidth={2.6} />
            )}
            {editingId ? "Сохранить изменения" : "Добавить привычку"}
          </button>
        )}
      </div>

      {!isPremium && (
        <p style={{ fontSize: 11.5, color: C.textSoft, margin: "-12px 0 16px" }}>
          {habits.length}/{FREE_HABIT_LIMIT} привычек на бесплатном плане
        </p>
      )}

      {habits.length === 0 ? (
        <p style={{ fontSize: 13, color: C.textSoft }}>Список пуст — добавьте первую привычку выше.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {habits.map((h, i) => (
            <div key={h.id} className="mh-rise" style={{ animationDelay: `${Math.min(i, 5) * 30}ms` }}>
              <SwipeRow habit={h} onEdit={() => startEdit(h)} onDelete={() => requestDelete(h)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SwipeRow({ habit, onEdit, onDelete }) {
  const [dx, setDx] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);

  const onDown = (e) => {
    dragging.current = true;
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    setDx(Math.min(0, Math.max(x - startX.current, -88)));
  };
  const onUp = () => {
    dragging.current = false;
    if (dx < -60) onDelete();
    else setDx(0);
  };

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: C.danger, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 18px" }}>
        <Trash2 size={16} color="#14181B" />
      </div>
      <div
        className="mh-swipe-row"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={() => dragging.current && onUp()}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
        style={{
          ...glass(),
          transform: `translateX(${dx}px)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: 14,
          padding: "12px 14px",
          touchAction: "pan-y",
          cursor: "grab",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>{habit.emoji || "•"}</span>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: habit.color }} />
          <span style={{ fontSize: 14, color: C.text }}>{habit.name}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="mh-tap" onClick={onEdit} aria-label={`Редактировать ${habit.name}`} style={{ background: "none", border: "none", cursor: "pointer", color: C.textSoft, padding: 4 }}>
            <Edit3 size={15} />
          </button>
          <button className="mh-tap" onClick={onDelete} aria-label={`Удалить ${habit.name}`} style={{ background: "none", border: "none", cursor: "pointer", color: C.textSoft, padding: 4 }}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- PROGRESS ---------------- */

function ProgressTab({ habits, isDone, totalPebbles, activeDays, isPremium, onOpenSubscribe }) {
  const pebbleCount = useCountUp(totalPebbles);
  const dayCount = useCountUp(activeDays);

  if (habits.length === 0) {
    return <EmptyState title="Пока нечего показать" text="Прогресс появится, как только вы отметите первую привычку." />;
  }

  const days28 = Array.from({ length: 28 }, (_, i) => dateNDaysAgo(27 - i));

  return (
    <div>
      <div
        style={{
          background: `linear-gradient(158deg, ${C.accent}, #C97F2A)`,
          borderRadius: 18,
          padding: "18px 18px 16px",
          margin: "18px 0 16px",
          display: "flex",
          gap: 24,
          position: "relative",
          overflow: "hidden",
          boxShadow: `0 12px 30px ${C.accent}35`,
        }}
      >
        <div className="mh-blob1" style={{ position: "absolute", top: -30, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.22)", filter: "blur(20px)" }} />
        <div style={{ position: "relative" }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 600, fontSize: 26, color: C.onAccent, margin: 0 }}>{pebbleCount}</p>
          <p style={{ fontSize: 11, color: "rgba(20,24,27,0.72)", margin: "2px 0 0", fontWeight: 600 }}>отметок собрано</p>
        </div>
        <div style={{ position: "relative" }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 600, fontSize: 26, color: C.onAccent, margin: 0 }}>{dayCount}</p>
          <p style={{ fontSize: 11, color: "rgba(20,24,27,0.72)", margin: "2px 0 0", fontWeight: 600 }}>дней с отметкой</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
        {habits.map((h, i) => {
          const count = days28.filter((d) => isDone(h.id, d)).length;
          return (
            <div key={h.id} className="mh-rise" style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}>
              <div style={{ ...glass(), borderRadius: 16, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{h.emoji} {h.name}</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 600, color: h.color }}>{count}/28</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 3 }}>
                  {days28.map((d, di) => (
                    <span
                      key={d}
                      className="mh-cell-in"
                      style={{
                        aspectRatio: "1",
                        borderRadius: 3,
                        background: isDone(h.id, d) ? h.color : "rgba(245,241,230,0.1)",
                        animationDelay: `${(di % 14) * 10}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AiInsightCard habits={habits} isDone={isDone} isPremium={isPremium} onOpenSubscribe={onOpenSubscribe} />
    </div>
  );
}

function AiInsightCard({ habits, isDone, isPremium, onOpenSubscribe }) {
  const [cached, setCached] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isPremium) return;
    (async () => {
      try {
        const res = await storage.get("microhabits:insight");
        if (res && res.value) setCached(JSON.parse(res.value));
      } catch (e) {
        /* nothing cached yet */
      }
    })();
  }, [isPremium]);

  const generate = async () => {
    setLoading(true);
    setError(false);
    try {
      const days = [6, 5, 4, 3, 2, 1, 0].map((n) => dateNDaysAgo(n));
      const summary = habits.map((h) => `${h.name}: ${days.filter((d) => isDone(h.id, d)).length} из 7 дней`).join("; ");
      const prompt = `Ты — тёплый, поддерживающий коуч по привычкам. Вот прогресс пользователя за неделю: ${summary}. Напиши короткий персональный комментарий на русском (2-3 предложения), без нотаций и чувства вины: отметь, что получается хорошо, и мягко предложи один маленький шаг на следующую неделю.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await response.json();
      const text = (data.content || []).map((b) => b.text || "").join("").trim();
      const entry = { date: todayStr(), text: text || "Не получилось сгенерировать комментарий, попробуйте ещё раз." };
      setCached(entry);
      storage.set("microhabits:insight", JSON.stringify(entry)).catch(() => {});
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <div style={{ ...glass({ border: `1px dashed ${C.accent}70` }), borderRadius: 16, padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div className="mh-glow" style={{ width: 30, height: 30, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Lock size={14} color={C.onAccent} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={14} color={C.accent} />
            <span style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 600, fontSize: 12.5, color: C.text }}>ИИ-инсайт недели</span>
          </div>
          <p style={{ fontSize: 12.5, color: C.textSoft, margin: "6px 0 10px", lineHeight: 1.5 }}>Персональный разбор недели и мягкая подсказка — часть Premium.</p>
          <button className="mh-tap" onClick={onOpenSubscribe} style={{ background: "none", border: "none", color: C.accent, fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0 }}>
            Открыть Premium →
          </button>
        </div>
      </div>
    );
  }

  const isStale = !cached || cached.date !== todayStr();

  return (
    <div style={{ ...glass(), borderRadius: 16, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={14} color={C.accent} />
          <span style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 600, fontSize: 12.5, color: C.text }}>ИИ-инсайт недели</span>
        </div>
        {cached && (
          <button className="mh-tap" onClick={generate} disabled={loading} aria-label="Обновить" style={{ background: "none", border: "none", color: C.textSoft, cursor: "pointer", padding: 2 }}>
            <RefreshCw size={13} className={loading ? "mh-spinner" : ""} />
          </button>
        )}
      </div>

      {loading && !cached && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
          <div className="mh-spinner" style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${C.line}`, borderTopColor: C.accent }} />
          <span style={{ fontSize: 12.5, color: C.textSoft }}>Думаю над комментарием…</span>
        </div>
      )}

      {error && <p style={{ fontSize: 12.5, color: C.danger }}>Не получилось получить ответ. Попробуйте ещё раз.</p>}

      {cached && !loading && <p style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.55, margin: "0 0 10px" }}>{cached.text}</p>}

      {isStale && !loading && (
        <button className="mh-btn" onClick={generate} style={{ background: C.accent, color: C.onAccent, border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          {cached ? "Обновить инсайт" : "Сгенерировать инсайт"}
        </button>
      )}
    </div>
  );
}

function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 12px 0" }}>
      <div className="mh-breathe" style={{ ...glass(), width: 50, height: 50, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Sun size={21} color={C.accent2} />
      </div>
      <h2 style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 600, fontSize: 15, color: C.text, margin: "0 0 6px" }}>{title}</h2>
      <p style={{ fontSize: 13.5, color: C.textSoft, maxWidth: 240, margin: "0 auto", lineHeight: 1.5 }}>{text}</p>
      {actionLabel && (
        <button
          className="mh-btn"
          onClick={onAction}
          style={{ marginTop: 18, background: C.accent, color: C.onAccent, border: "none", borderRadius: 12, padding: "11px 20px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 22px ${C.accent}40` }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ---------------- NAV ---------------- */

function BottomNav({ tab, setTab }) {
  const items = [
    { id: "today", label: "Сегодня", icon: Sun },
    { id: "habits", label: "Привычки", icon: Plus },
    { id: "progress", label: "Прогресс", icon: Sparkles },
  ];
  const activeIndex = items.findIndex((it) => it.id === tab);

  return (
    <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, ...glass({ borderRadius: 20 }), padding: 6 }}>
      <div style={{ position: "relative", display: "flex" }}>
        <div
          className="mh-nav-pill"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: `${100 / items.length}%`,
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 14,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {items.map((it) => {
          const Icon = it.icon;
          const active = tab === it.id;
          return (
            <button
              key={it.id}
              className={`mh-tap mh-nav-btn${active ? " active" : ""}`}
              onClick={() => setTab(it.id)}
              style={{ position: "relative", zIndex: 1, flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0", cursor: "pointer", color: active ? C.accent : C.textSoft }}
            >
              <span className="mh-nav-icon" style={{ display: "flex" }}>
                <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
              </span>
              <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 400 }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
