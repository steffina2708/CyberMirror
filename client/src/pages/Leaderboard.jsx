import React, { useEffect, useState, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import LeaderboardTable from '../components/LeaderboardTable';
import scoreService from '../services/scoreService';
import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';
import '../styles/leaderboard.css';

const POLL_INTERVAL = 15000;  // re-fetch real data every 15 s
const SIM_INTERVAL  = 12000;  // local score simulation every 12 s

const Leaderboard = () => {
  const { user } = useAuth();
  const [entries,     setEntries]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [rankChanges, setRankChanges] = useState({});     // { userId: 'up'|'down' }
  const [flashScores, setFlashScores] = useState(new Set());

  // Stable refs so interval callbacks always see current data
  const prevRanksRef  = useRef({});  // { userId: index }
  const prevScoresRef = useRef({});  // { userId: totalScore }
  const entriesRef    = useRef([]);
  useEffect(() => { entriesRef.current = entries; }, [entries]);

  // ── Core helper: diff new list against previous, apply state ──
  const applyEntries = useCallback((newList) => {
    const prevRanks  = prevRanksRef.current;
    const prevScores = prevScoresRef.current;
    const changes    = {};
    const flashes    = new Set();

    newList.forEach((e, i) => {
      const uid = e._id;
      if (uid in prevRanks) {
        if      (prevRanks[uid] > i) changes[uid] = 'up';
        else if (prevRanks[uid] < i) changes[uid] = 'down';
      }
      if (uid in prevScores && prevScores[uid] !== e.totalScore) {
        flashes.add(uid);
      }
    });

    // Persist refs for next comparison
    prevRanksRef.current  = Object.fromEntries(newList.map((e, i) => [e._id, i]));
    prevScoresRef.current = Object.fromEntries(newList.map(e => [e._id, e.totalScore]));

    setEntries(newList);

    if (Object.keys(changes).length > 0) {
      setRankChanges(changes);
      setTimeout(() => setRankChanges({}), 950);
    }
    if (flashes.size > 0) {
      setFlashScores(flashes);
      setTimeout(() => setFlashScores(new Set()), 1050);
    }
  }, []);

  // ── Step 9 local simulation helper ────────────────────────────
  const runSimulation = useCallback(() => {
    const prev = entriesRef.current;
    if (prev.length < 2) return;
    const copy  = prev.map(e => ({ ...e }));
    const count = 2 + Math.floor(Math.random() * 2);
    const idxs  = new Set();
    while (idxs.size < Math.min(count, copy.length)) {
      idxs.add(Math.floor(Math.random() * copy.length));
    }
    idxs.forEach(i => {
      copy[i].totalScore = (copy[i].totalScore || 0) + 5 + Math.floor(Math.random() * 26);
    });
    copy.sort((a, b) => b.totalScore - a.totalScore);
    applyEntries(copy);
  }, [applyEntries]);

  // ── Initial load ───────────────────────────────────────────────
  useEffect(() => {
    scoreService.getLeaderboard()
      .then(data => {
        const list = data.leaderboard || [];
        prevRanksRef.current  = Object.fromEntries(list.map((e, i) => [e._id, i]));
        prevScoresRef.current = Object.fromEntries(list.map(e => [e._id, e.totalScore]));
        setEntries(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Live polling — re-fetch every 15 s ───────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      scoreService.getLeaderboard()
        .then(data => applyEntries(data.leaderboard || []))
        .catch(() => {});
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [applyEntries]);

  // ── Local simulation — subtle fluctuations every 12 s ─────────
  useEffect(() => {
    const id = setInterval(runSimulation, SIM_INTERVAL);
    return () => clearInterval(id);
  }, [runSimulation]);

  const userRank = entries.findIndex(e => e._id === user?._id) + 1;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main leaderboard-page">
        <div className="dashboard-header">
          <div>
            <p className="lb-arena-label">Cyber Arena · Global Rankings</p>
            <h1 className="leaderboard-title">Leaderboard</h1>
            <p className="lb-subtitle">
              Top CyberMirror agents worldwide
              {userRank > 0 && ` · Your rank: #${userRank}`}
            </p>
            <div className="lb-arena-status">
              <span className="lb-arena-dot" />
              <span className="lb-arena-status-text">
                Arena Status: <strong>LIVE</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
              Loading leaderboard...
            </div>
          ) : (
            <LeaderboardTable
              entries={entries}
              currentUserId={user?._id}
              rankChanges={rankChanges}
              flashScores={flashScores}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
