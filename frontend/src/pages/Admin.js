import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApi } from "../lib/api";
import { useMe } from "../lib/useMe";
import Navbar from "../components/Navbar";
import Icon from "../components/Icon";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";

const fmtNum = (n) => (n || 0).toLocaleString();
const fmtDate = (s) => { try { return new Date(s).toLocaleString(); } catch { return "—"; } };
const fmtDur = (ms) => (ms ? `${(ms / 1000).toFixed(1)}s` : "—");

function Stat({ icon, label, value, accent }) {
  return (
    <div className="rounded-3xl glass-card p-5">
      <div className="flex items-center gap-2 text-muted text-xs font-semibold uppercase tracking-[0.16em]">
        <Icon name={icon} className="h-4 w-4" style={{ color: accent }} /> {label}
      </div>
      <div className="font-display text-3xl font-semibold text-ink mt-2">{value}</div>
    </div>
  );
}

const TIER_COLORS = { free: "#71717a", pro: "#8B5CF6", max: "#F59E0B" };

export default function Admin() {
  const api = useApi();
  const navigate = useNavigate();
  const { isAdmin, loading: meLoading } = useMe();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [gens, setGens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("users");

  const loadAll = useCallback(async () => {
    try {
      const [o, u, g] = await Promise.all([
        api.get("/admin/overview"),
        api.get("/admin/users"),
        api.get("/admin/generations"),
      ]);
      setOverview(o.data);
      setUsers(u.data.users || []);
      setGens(g.data.generations || []);
    } catch (e) { /* ignore */ } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { if (!meLoading && isAdmin) loadAll(); else if (!meLoading) setLoading(false); }, [meLoading, isAdmin, loadAll]);

  const changeTier = async (userId, tier) => {
    setUsers((u) => u.map((x) => (x.userId === userId ? { ...x, tier } : x)));
    try { await api.post(`/admin/users/${userId}/tier`, { tier }); } catch (e) { loadAll(); }
  };

  if (meLoading) return <div className="min-h-screen grid place-items-center text-violet-500"><Spinner size={28} /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen relative">
        <Navbar />
        <div className="grid place-items-center py-32 text-center px-6">
          <div>
            <Icon name="ShieldAlert" className="h-12 w-12 mx-auto text-muted mb-4" />
            <h2 className="font-display text-2xl text-ink">Admin access required</h2>
            <p className="text-muted mt-2">Your account doesn't have admin privileges.</p>
            <Button variant="secondary" onClick={() => navigate("/dashboard")} className="mt-6">Back to dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="hero-glow" />
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 lg:px-10 pb-24" data-testid="admin-panel">
        <div className="pt-6 pb-6">
          <h1 className="font-display text-4xl font-light tracking-tight text-ink flex items-center gap-3"><Icon name="ShieldCheck" className="h-8 w-8 text-violet-500" /> Admin</h1>
          <p className="text-muted mt-1">Monitor users, generations, model usage and tokens.</p>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20 text-violet-500"><Spinner size={28} /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Stat icon="Users" label="Users" value={fmtNum(overview?.totalUsers)} accent="#8B5CF6" />
              <Stat icon="LayoutGrid" label="Decks" value={fmtNum(overview?.totalDecks)} accent="#22D3EE" />
              <Stat icon="Sparkles" label="Generations" value={fmtNum(overview?.totalGenerations)} accent="#E879F9" />
              <Stat icon="Cpu" label="Tokens" value={fmtNum(overview?.totalTokens)} accent="#F59E0B" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <div className="rounded-3xl glass-card p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted mb-4">Usage by model</div>
                <div className="space-y-2.5">
                  {(overview?.byModel || []).map((m) => {
                    const max = Math.max(...(overview?.byModel || []).map((x) => x.count), 1);
                    return (
                      <div key={m.model}>
                        <div className="flex items-center justify-between text-sm text-ink mb-1">
                          <span className="font-mono text-xs">{m.model}</span>
                          <span className="text-muted text-xs">{m.count} gens · {fmtNum(m.tokens)} tok</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${(m.count / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {(overview?.byModel || []).length === 0 && <p className="text-muted text-sm">No generations yet.</p>}
                </div>
              </div>

              <div className="rounded-3xl glass-card p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted mb-4">Users by tier</div>
                <div className="flex flex-wrap gap-3">
                  {(overview?.byTier || []).map((t) => (
                    <div key={t.tier} className="flex items-center gap-2 rounded-2xl glass px-4 py-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIER_COLORS[t.tier] || "#71717a" }} />
                      <span className="text-sm text-ink capitalize">{t.tier}</span>
                      <span className="font-display text-lg font-semibold text-ink">{t.count}</span>
                    </div>
                  ))}
                  {(overview?.byTier || []).length === 0 && <p className="text-muted text-sm">No users yet.</p>}
                </div>
              </div>
            </div>

            {/* tabs */}
            <div className="flex items-center gap-2 mb-4">
              {["users", "generations"].map((t) => (
                <button key={t} onClick={() => setTab(t)} data-testid={`admin-tab-${t}`}
                  className={`rounded-full px-4 py-2 text-sm capitalize transition-all ${tab === t ? "bg-[var(--fg)] text-[var(--bg)]" : "glass text-muted hover:text-ink"}`}>{t}</button>
              ))}
            </div>

            {tab === "users" ? (
              <div className="rounded-3xl glass-card overflow-hidden" data-testid="admin-users-table">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted border-b border-[var(--glass-border)]">
                        <th className="px-5 py-3 font-medium">User</th>
                        <th className="px-5 py-3 font-medium">Tier</th>
                        <th className="px-5 py-3 font-medium">Decks</th>
                        <th className="px-5 py-3 font-medium">Gens</th>
                        <th className="px-5 py-3 font-medium">Tokens</th>
                        <th className="px-5 py-3 font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.userId} className="border-b border-[var(--glass-border)] last:border-0" data-testid={`admin-user-${u.userId}`}>
                          <td className="px-5 py-3 text-ink">
                            <div className="flex items-center gap-2">
                              {u.email || u.userId}
                              {u.isAdmin && <span className="text-[10px] uppercase tracking-wider text-violet-500 border border-violet-400/40 rounded-full px-1.5 py-0.5">admin</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <select value={u.tier} onChange={(e) => changeTier(u.userId, e.target.value)} data-testid={`tier-select-${u.userId}`}
                              className="rounded-lg bg-[var(--surface-2)] border border-[var(--glass-border)] text-ink px-2.5 py-1.5 outline-none capitalize">
                              <option value="free">free</option>
                              <option value="pro">pro</option>
                              <option value="max">max</option>
                            </select>
                          </td>
                          <td className="px-5 py-3 text-muted">{u.deckCount}</td>
                          <td className="px-5 py-3 text-muted">{u.generations}</td>
                          <td className="px-5 py-3 text-muted">{fmtNum(u.tokens)}</td>
                          <td className="px-5 py-3 text-muted whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                        </tr>
                      ))}
                      {users.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">No users yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl glass-card overflow-hidden" data-testid="admin-generations-table">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted border-b border-[var(--glass-border)]">
                        <th className="px-5 py-3 font-medium">When</th>
                        <th className="px-5 py-3 font-medium">User</th>
                        <th className="px-5 py-3 font-medium">Deck</th>
                        <th className="px-5 py-3 font-medium">Model</th>
                        <th className="px-5 py-3 font-medium">Mode</th>
                        <th className="px-5 py-3 font-medium">Tokens</th>
                        <th className="px-5 py-3 font-medium">Time</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gens.map((g) => (
                        <tr key={g.id} className="border-b border-[var(--glass-border)] last:border-0">
                          <td className="px-5 py-3 text-muted whitespace-nowrap">{fmtDate(g.createdAt)}</td>
                          <td className="px-5 py-3 text-ink">{g.email || g.userId}</td>
                          <td className="px-5 py-3 text-muted max-w-[160px] truncate">{g.title || "—"}</td>
                          <td className="px-5 py-3 text-muted font-mono text-xs">{g.model}</td>
                          <td className="px-5 py-3 text-muted">{g.mode}</td>
                          <td className="px-5 py-3 text-muted">{fmtNum(g.tokens)}</td>
                          <td className="px-5 py-3 text-muted">{fmtDur(g.durationMs)}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs rounded-full px-2 py-0.5 ${g.status === "ready" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}>{g.status}</span>
                          </td>
                        </tr>
                      ))}
                      {gens.length === 0 && <tr><td colSpan={8} className="px-5 py-8 text-center text-muted">No generations yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
