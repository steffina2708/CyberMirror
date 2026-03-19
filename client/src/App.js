import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRoutes from './routes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CyberNetworkBackground from './components/CyberNetworkBackground';
import { GameProvider, useGame } from './context/GameContext';
import CyberMentor from './components/CyberMentor';
import LevelUpModal from './components/LevelUpModal';
import BadgeToast from './components/BadgeToast';
import RankUpModal from './components/RankUpModal';
import { fireConfetti, playSound } from './utils/gameEffects';

/* Inner layer renders gamification overlays + floating chatbot.
   Must live inside <GameProvider> to access useGame(). */
function GamificationLayer() {
  const {
    pendingBadges, leveledUp, newLevel, xpGained, clearGamification,
    rankPromoted, newRankName, prevRankName,
  } = useGame();

  /* ── Badge toast queue ───────────────────────────────────────────── */
  const [activeToasts,  setActiveToasts]  = useState([]);
  const processedBadgesRef = useRef(null);

  useEffect(() => {
    if (!pendingBadges?.length) return;
    // Guard against re-firing for the same batch
    const batchKey = pendingBadges.map(b => b.id).join(',');
    if (processedBadgesRef.current === batchKey) return;
    processedBadgesRef.current = batchKey;

    // Fire effects immediately
    fireConfetti();
    playSound('badge');

    // Add all badges as separate toasts (with unique keys)
    const ts = Date.now();
    setActiveToasts(prev => [
      ...prev,
      ...pendingBadges.map((b, i) => ({ ...b, _toastId: `${b.id}-${ts}-${i}` })),
    ]);
  }, [pendingBadges]);

  const dismissToast = useCallback((_toastId) => {
    setActiveToasts(prev => prev.filter(t => t._toastId !== _toastId));
  }, []);

  return (
    <>
      <CyberMentor />

      {/* Badge toasts — top-right, stack up to 3 visible at once */}
      {activeToasts.slice(0, 3).map((badge, i) => (
        <BadgeToast
          key={badge._toastId}
          badge={badge}
          index={i}
          onDismiss={() => dismissToast(badge._toastId)}
        />
      ))}

      {/* Level-up modal — only if NOT also a rank promotion */}
      {leveledUp && !rankPromoted && (
        <LevelUpModal newLevel={newLevel} xpGained={xpGained} onClose={clearGamification} />
      )}

      {/* Rank promotion modal — supersedes level-up modal */}
      {rankPromoted && (
        <RankUpModal
          newRank={newRankName}
          prevRank={prevRankName}
          onClose={clearGamification}
        />
      )}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <CyberNetworkBackground />
          <GameProvider>
            <AppRoutes />
            <GamificationLayer />
          </GameProvider>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            theme="colored"
            toastStyle={{ fontFamily: 'Exo 2, sans-serif' }}
          />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
