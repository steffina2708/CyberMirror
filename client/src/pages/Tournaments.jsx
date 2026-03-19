import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/tournaments.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

/* ── Countdown helper ─────────────────────────────────────────── */
const useCountdown = (targetDate) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = new Date(targetDate) - Date.now();
      if (diff <= 0) { setTimeLeft('Now'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else setTimeLeft(`${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
};

/* ── Status display helper ────────────────────────────────────── */
const statusLabel = {
  upcoming:           'Upcoming',
  registration:       'Registration Open',
  bracket_generated:  'Bracket Set',
  live:               'LIVE',
  completed:          'Completed',
  cancelled:          'Cancelled',
};

/* ── Rank medal ───────────────────────────────────────────────── */
const rankMedal = (rank) => {
  if (rank === 1) return '👑';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
};

const rankClass = (rank) => {
  if (rank === 1) return 'tn-rank-1';
  if (rank === 2) return 'tn-rank-2';
  if (rank === 3) return 'tn-rank-3';
  return 'tn-rank-n';
};

/* ═══════════════════════════════════════════════════════════════
   TOURNAMENT CARD
   ═══════════════════════════════════════════════════════════════ */
const TournamentCard = ({ tournament, onJoin, onLeave, onViewBracket }) => {
  const countdown = useCountdown(
    tournament.status === 'upcoming' || tournament.status === 'registration'
      ? tournament.startDate
      : null
  );

  const fillPct = Math.round((tournament.participantCount / tournament.maxParticipants) * 100);

  return (
    <div className="tn-tournament-card" style={{ animationDelay: `${Math.random() * 0.2}s` }}>
      <div
        className="tn-card-banner"
        style={{ background: tournament.bannerColor || 'linear-gradient(135deg,#1a0a3e,#0d2240)' }}
      >
        <span className="tn-card-banner-icon">{tournament.icon || '🏆'}</span>
      </div>

      <div className="tn-card-body">
        <div className="tn-card-name">{tournament.name}</div>
        <div className="tn-card-season">{tournament.season}</div>

        <div className="tn-card-meta">
          <span className={`tn-status-pill ${tournament.status}`}>
            {statusLabel[tournament.status] || tournament.status}
          </span>
          <span className="tn-card-stat">
            <span>{tournament.participantCount}</span>/{tournament.maxParticipants} players
          </span>
          {tournament.status === 'live' && (
            <span className="tn-card-stat">
              Round <span>{tournament.currentRound}</span>
            </span>
          )}
        </div>

        <div className="tn-capacity-bar">
          <div className="tn-capacity-fill" style={{ width: `${fillPct}%` }} />
        </div>

        {countdown && (
          <div className="tn-countdown">
            ⏱ {tournament.status === 'upcoming' ? 'Starts in' : 'Tournament starts'}: {countdown}
          </div>
        )}

        {tournament.registrationClosesAt && tournament.status === 'registration' && (
          <div className="tn-countdown">
            🔔 Registration closes: {new Date(tournament.registrationClosesAt).toLocaleDateString()}
          </div>
        )}

        <div className="tn-card-footer">
          {tournament.isRegistered ? (
            <>
              <span className="tn-registered-badge">✅ Registered</span>
              {['bracket_generated', 'live'].includes(tournament.status) && (
                <button className="tn-btn tn-btn-primary tn-btn-sm" onClick={() => onViewBracket(tournament._id)}>
                  📊 View Bracket
                </button>
              )}
              {tournament.status === 'registration' && (
                <button className="tn-btn tn-btn-danger tn-btn-sm" onClick={() => onLeave(tournament._id)}>
                  Leave
                </button>
              )}
            </>
          ) : (
            <>
              {tournament.status === 'registration' && tournament.spotsLeft > 0 && (
                <button className="tn-btn tn-btn-primary" onClick={() => onJoin(tournament._id)}>
                  ⚔️ Join Tournament
                </button>
              )}
              {tournament.status === 'registration' && tournament.spotsLeft <= 0 && (
                <button className="tn-btn tn-btn-ghost" disabled>Full</button>
              )}
              {tournament.status === 'upcoming' && (
                <button className="tn-btn tn-btn-ghost" disabled>Registration not open</button>
              )}
              {['bracket_generated', 'live'].includes(tournament.status) && (
                <button className="tn-btn tn-btn-ghost tn-btn-sm" onClick={() => onViewBracket(tournament._id)}>
                  📊 Watch Bracket
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   BRACKET MATCH COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const BracketMatch = ({ match }) => {
  const p1Won = match.winnerId && match.player1?.userId === match.winnerId;
  const p2Won = match.winnerId && match.player2?.userId === match.winnerId;

  const Slot = ({ player, won, slotLabel }) => {
    if (!player?.username && !player?.userId) {
      return (
        <div className="tn-bracket-slot tbd">
          <span className="tn-slot-seed">—</span>
          <span className="tn-slot-name">TBD</span>
        </div>
      );
    }
    if (player.isBye) {
      return (
        <div className="tn-bracket-slot bye">
          <span className="tn-slot-seed">—</span>
          <span className="tn-slot-name">BYE</span>
        </div>
      );
    }
    return (
      <div className={`tn-bracket-slot ${won ? 'winner' : ''}`}>
        <span className="tn-slot-seed">{slotLabel}</span>
        <span className="tn-slot-name">{player.username}</span>
        {match.status === 'completed' && (
          <span className="tn-slot-score">{player.score ?? 0}</span>
        )}
        {won && <span style={{ fontSize: '0.8rem' }}>✓</span>}
      </div>
    );
  };

  return (
    <div className={`tn-bracket-match ${match.status === 'live' ? 'live-match' : ''}`}>
      {match.status === 'live' && <div className="tn-match-label">LIVE</div>}
      {match.status === 'bye' && <div className="tn-match-label">BYE</div>}
      <Slot player={match.player1} won={p1Won} slotLabel="1" />
      <Slot player={match.player2} won={p2Won} slotLabel="2" />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   BRACKET VIEW TAB
   ═══════════════════════════════════════════════════════════════ */
const BracketView = ({ selectedTournamentId, onSelectTournament }) => {
  const [loading, setLoading]     = useState(false);
  const [bracketData, setBracket] = useState(null);
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    axios.get(`${API}/api/tournaments/active`, authHeaders())
      .then(r => setTournaments(r.data.tournaments || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTournamentId) return;
    setLoading(true);
    axios.get(`${API}/api/tournaments/brackets/${selectedTournamentId}`, authHeaders())
      .then(r => { setBracket(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedTournamentId]);

  const tournId = selectedTournamentId || '';

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <select
          value={tournId}
          onChange={e => onSelectTournament(e.target.value)}
          style={{
            background: 'var(--tn-card)', border: '1px solid var(--tn-border)',
            color: 'var(--tn-text)', borderRadius: 8, padding: '8px 14px',
            fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          <option value="">— Select a tournament —</option>
          {tournaments.map(t => (
            <option key={t._id} value={t._id}>{t.name}</option>
          ))}
        </select>
      </div>

      {loading && <div className="tn-loading">Loading bracket</div>}

      {!loading && !bracketData && !tournId && (
        <div className="tn-empty">
          <div className="tn-empty-icon">📊</div>
          <p>Select a tournament to view its bracket.</p>
        </div>
      )}

      {!loading && bracketData && bracketData.rounds?.length > 0 && (
        <>
          <div className="tn-section-title">
            {bracketData.tournament?.name} — {bracketData.tournament?.season}
          </div>
          <div className="tn-bracket-wrapper">
            <div className="tn-bracket">
              {bracketData.rounds.map((round, ri) => (
                <React.Fragment key={round.roundNumber}>
                  <div className="tn-round-col">
                    <div className="tn-round-header">{round.label}</div>
                    <div className="tn-round-matches">
                      {round.matches.map(match => (
                        <BracketMatch key={match._id} match={match} />
                      ))}
                    </div>
                  </div>
                  {ri < bracketData.rounds.length - 1 && (
                    <div className="tn-round-connector">
                      {round.matches.map((_, i) => (
                        <div key={i} className="tn-connector-line" />
                      ))}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && bracketData && bracketData.rounds?.length === 0 && (
        <div className="tn-empty">
          <div className="tn-empty-icon">⏳</div>
          <p>Bracket not yet generated for this tournament.</p>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MY STATUS TAB
   ═══════════════════════════════════════════════════════════════ */
const MyStatusTab = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/tournaments/my-history`, authHeaders())
      .then(r => { setHistory(r.data.history || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="tn-loading">Loading tournament history</div>;

  const active   = history.filter(t => !['completed', 'cancelled'].includes(t.status));
  const finished = history.filter(t => ['completed', 'cancelled'].includes(t.status));

  return (
    <div className="tn-my-status">
      {active.length > 0 && (
        <>
          <div className="tn-section-title">Active</div>
          {active.map(t => (
            <div key={t._id} className="tn-status-card">
              <div className="tn-status-header">
                <span className="tn-status-icon">{t.icon || '🏆'}</span>
                <div>
                  <div className="tn-status-title">{t.name}</div>
                  <div className="tn-status-sub">{t.season} · Round {t.finalRound}</div>
                </div>
                <span
                  className={`tn-status-pill ${t.status}`}
                  style={{ marginLeft: 'auto' }}
                >
                  {statusLabel[t.status]}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--tn-green)' }}>🏅 Wins: <strong>{t.wins}</strong></span>
                <span style={{ color: 'var(--tn-red)' }}>❌ Losses: <strong>{t.losses}</strong></span>
                <span style={{ color: 'var(--tn-muted)' }}>
                  {t.eliminated ? '🚫 Eliminated' : '✅ Active'}
                </span>
              </div>
            </div>
          ))}
        </>
      )}

      {finished.length > 0 && (
        <>
          <div className="tn-section-title" style={{ marginTop: active.length > 0 ? 12 : 0 }}>History</div>
          <div className="tn-history-grid">
            {finished.map(t => (
              <div key={t._id} className={`tn-history-card ${t.isWinner ? 'winner-card' : ''}`}>
                <span className="tn-history-icon">{t.isWinner ? '👑' : (t.icon || '🏆')}</span>
                <div className="tn-history-info">
                  <div className="tn-history-name">{t.name}</div>
                  <div className="tn-history-meta">
                    {t.season} · {new Date(t.startDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="tn-history-result">
                  <div className={`outcome ${t.isWinner ? 'win' : 'loss'}`}>
                    {t.isWinner ? '🏆 Champion' : `Fell in R${t.finalRound}`}
                  </div>
                  <div className="rounds">W{t.wins} / L{t.losses}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {history.length === 0 && (
        <div className="tn-empty">
          <div className="tn-empty-icon">🎯</div>
          <p>You haven't entered any tournaments yet.<br />Join one from the Active Tournaments tab!</p>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   GLOBAL RANKINGS TAB
   ═══════════════════════════════════════════════════════════════ */
const GlobalRankingsTab = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const me = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    axios.get(`${API}/api/tournaments/global-rankings`, authHeaders())
      .then(r => { setRankings(r.data.rankings || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const initials = (name = 'U') => name.slice(0, 2).toUpperCase();

  if (loading) return <div className="tn-loading">Loading global rankings</div>;

  return (
    <div>
      <div className="tn-section-title">🌍 Global Cyber Tournament Rankings</div>
      <div className="tn-rankings-wrapper">
        <div className="tn-rankings-header">
          <div>#</div>
          <div>Player</div>
          <div style={{ textAlign: 'center' }}>Tourn. Wins</div>
          <div style={{ textAlign: 'center' }}>Match Wins</div>
          <div style={{ textAlign: 'center' }}>Total XP</div>
          <div style={{ textAlign: 'center' }}>Level</div>
        </div>
        {rankings.map((player, i) => {
          const isMe = player.username === me.username;
          return (
            <div
              key={player._id}
              className="tn-rankings-row"
              style={isMe ? { background: 'rgba(0,229,255,0.06)', borderLeft: '3px solid var(--tn-cyan)' } : {}}
            >
              <div className={`tn-rank-num ${rankClass(player.rank)}`}>
                {typeof rankMedal(player.rank) === 'string' ? (
                  <span className="tn-crown">{rankMedal(player.rank)}</span>
                ) : player.rank}
              </div>

              <div className="tn-rank-player">
                <div className="tn-avatar">
                  {player.avatar
                    ? <img src={player.avatar} alt={player.username} />
                    : initials(player.username)}
                </div>
                <div>
                  <div className="tn-player-name">
                    {player.username}{isMe ? ' (you)' : ''}
                  </div>
                  {player.tournamentWins > 0 && (
                    <div className="tn-player-title">
                      {player.tournamentWins > 1
                        ? `${player.tournamentWins}× Champion`
                        : 'Champion'}
                    </div>
                  )}
                </div>
              </div>

              <div className={`tn-rank-val ${player.tournamentWins > 0 ? 'gold' : 'muted'}`}>
                {player.tournamentWins > 0 ? `🏆 ${player.tournamentWins}` : '—'}
              </div>
              <div className={`tn-rank-val ${player.matchWins > 0 ? 'cyan' : 'muted'}`}>
                {player.matchWins}
              </div>
              <div className="tn-rank-val green">
                {(player.totalXP || 0).toLocaleString()}
              </div>
              <div className="tn-rank-val">
                Lv {player.level || 1}
              </div>
            </div>
          );
        })}
        {rankings.length === 0 && (
          <div className="tn-empty"><p>No ranking data yet.</p></div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ACTIVE TOURNAMENTS TAB
   ═══════════════════════════════════════════════════════════════ */
const ActiveTournamentsTab = ({ onViewBracket }) => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [alert, setAlert]             = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/tournaments/active`, authHeaders())
      .then(r => { setTournaments(r.data.tournaments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleJoin = async (id) => {
    try {
      const r = await axios.post(`${API}/api/tournaments/join`, { tournamentId: id }, authHeaders());
      showAlert('success', r.data.message || 'Joined tournament!');
      load();
    } catch (e) {
      showAlert('error', e.response?.data?.message || 'Failed to join.');
    }
  };

  const handleLeave = async (id) => {
    try {
      await axios.post(`${API}/api/tournaments/leave`, { tournamentId: id }, authHeaders());
      showAlert('info', 'Withdrawn from tournament.');
      load();
    } catch (e) {
      showAlert('error', e.response?.data?.message || 'Failed to leave.');
    }
  };

  if (loading) return <div className="tn-loading">Loading tournaments</div>;

  return (
    <div>
      {alert && (
        <div className={`tn-alert tn-alert-${alert.type}`}>
          {alert.type === 'success' ? '✅' : alert.type === 'error' ? '❌' : 'ℹ️'}
          {alert.msg}
        </div>
      )}

      <div className="tn-section-title">Active & Upcoming Tournaments</div>

      {tournaments.length === 0 ? (
        <div className="tn-empty">
          <div className="tn-empty-icon">🏆</div>
          <p>No active tournaments right now. Check back soon!</p>
        </div>
      ) : (
        <div className="tn-tournament-grid">
          {tournaments.map(t => (
            <TournamentCard
              key={t._id}
              tournament={t}
              onJoin={handleJoin}
              onLeave={handleLeave}
              onViewBracket={onViewBracket}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const Tournaments = () => {
  const [activeTab, setActiveTab]       = useState('active');
  const [selectedTournId, setSelectedTournId] = useState(null);
  const navigate = useNavigate();

  const goToBracket = (id) => {
    setSelectedTournId(id);
    setActiveTab('bracket');
  };

  const TABS = [
    { id: 'active',    label: '🏆 Active Tournaments' },
    { id: 'status',    label: '👤 My Status' },
    { id: 'bracket',   label: '📊 Bracket View' },
    { id: 'rankings',  label: '🌍 Global Rankings' },
  ];

  return (
    <div className="tn-page">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="tn-header">
        <div className="tn-header-icon">🏆</div>
        <div className="tn-header-text">
          <h1>Cyber Tournaments</h1>
          <p>Compete globally · Climb the bracket · Claim the crown</p>
        </div>
        <div className="tn-season-badge">⚡ Global Tournament System</div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="tn-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tn-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────── */}
      <div className="tn-body">
        {activeTab === 'active' && (
          <ActiveTournamentsTab onViewBracket={goToBracket} />
        )}
        {activeTab === 'status' && <MyStatusTab />}
        {activeTab === 'bracket' && (
          <BracketView
            selectedTournamentId={selectedTournId}
            onSelectTournament={setSelectedTournId}
          />
        )}
        {activeTab === 'rankings' && <GlobalRankingsTab />}
      </div>
    </div>
  );
};

export default Tournaments;
