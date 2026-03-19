import React from 'react';

const medals = ['🥇', '🥈', '🥉'];

const rankClass = i => i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';

const LeaderboardTable = ({ entries, currentUserId, rankChanges = {}, flashScores = new Set() }) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="lb-table">
        <thead className="lb-thead">
          <tr>
            {['Rank', 'Player', 'Level', 'Score', 'Scenarios', 'Win Rate'].map(h => (
              <th key={h} className="lb-th">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const uid       = entry._id;
            const direction = rankChanges[uid];           // 'up' | 'down' | undefined
            const isMe      = uid === currentUserId;

            const rowClass = [
              'lb-row',
              rankClass(i),
              i === 0      ? 'champion-row'             : '',
              isMe        ? 'lb-row--me current-user' : '',
              direction   ? `rank-${direction}`        : '',
            ].filter(Boolean).join(' ');

            return (
              <tr key={uid || i} className={rowClass}>
                {/* ── Rank cell with arrow indicator ── */}
                <td className="lb-td">
                  <div className="lb-rank-cell">
                    <span className={i === 0 ? 'lb-rank trophy-icon' : 'lb-rank'}>
                      {i < 3 ? medals[i] : `#${i + 1}`}
                    </span>
                    {i === 0 && <span className="champion-crown">👑</span>}
                    {direction === 'up'   && <span className="rank-indicator rank-indicator--up">↑</span>}
                    {direction === 'down' && <span className="rank-indicator rank-indicator--down">↓</span>}
                  </div>
                </td>

                {/* ── Player ── */}
                <td className="lb-td">
                  <div className="lb-player">
                    <div className="lb-avatar">{entry.username?.[0]?.toUpperCase()}</div>
                    <span className="lb-username">{entry.username}</span>
                    {i === 0 && <span className="champion-label">Cyber Champion</span>}
                    {isMe && <span className="lb-you-tag">(You)</span>}
                  </div>
                </td>

                {/* ── Level ── */}
                <td className="lb-td">
                  <span className="lb-level">{entry.level}</span>
                </td>

                {/* ── Score with optional flash ── */}
                <td className="lb-td">
                  <span className={`lb-score${flashScores.has(uid) ? ' score-update' : ''}`}>
                    {entry.totalScore?.toLocaleString()}
                  </span>
                </td>

                {/* ── Scenarios ── */}
                <td className="lb-td">
                  <span className="lb-count">{entry.scenariosCompleted}</span>
                </td>

                {/* ── Win rate ── */}
                <td className="lb-td">
                  <span className={`lb-winrate-${
                    entry.winRate >= 70 ? 'good' : entry.winRate >= 50 ? 'ok' : 'low'
                  }`}>
                    {entry.winRate}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardTable;
