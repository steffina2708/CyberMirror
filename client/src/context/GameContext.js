import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import xpService from '../services/xpService';

const GameContext = createContext(null);

/* ── Rank ladder (mirrors Profile.jsx rankLabel) ───────────────────── */
const RANK_THRESHOLDS = [
  { min: 10, label: 'LEGEND' },
  { min: 7,  label: 'ELITE OPERATOR' },
  { min: 5,  label: 'SENIOR ANALYST' },
  { min: 3,  label: 'CYBER DEFENDER' },
  { min: 2,  label: 'JUNIOR ANALYST' },
];
const getRankLabel = (level) => {
  const r = RANK_THRESHOLDS.find(t => level >= t.min);
  return r ? r.label : 'SECURITY RECRUIT';
};

export const GameProvider = ({ children }) => {
  const { updateUser, user } = useAuth();

  const [activeGame,    setActiveGame]    = useState(null);
  const [gameScore,     setGameScore]     = useState(0);
  const [gameStreak,    setGameStreak]    = useState(0);
  const [gameHistory,   setGameHistory]   = useState([]);

  /* Gamification modal state */
  const [pendingBadges, setPendingBadges] = useState([]);
  const [leveledUp,     setLeveledUp]     = useState(false);
  const [newLevel,      setNewLevel]      = useState(1);
  const [xpGained,      setXpGained]      = useState(0);
  const [rankPromoted,  setRankPromoted]  = useState(false);
  const [newRankName,   setNewRankName]   = useState('');
  const [prevRankName,  setPrevRankName]  = useState('');

  const startGame = useCallback((gameId) => {
    setActiveGame(gameId);
    setGameScore(0);
    setGameStreak(0);
  }, []);

  const addPoints = useCallback((pts) => {
    setGameScore(prev => prev + pts);
    setGameStreak(prev => prev + 1);
  }, []);

  const endGame = useCallback(async (result) => {
    setGameHistory(prev => [
      { gameId: activeGame, score: gameScore, ...result, ts: Date.now() },
      ...prev.slice(0, 19),
    ]);
    setActiveGame(null);

    /* Award XP when a game/lab provides an xp value */
    if (result?.xp > 0) {
      try {
        const data = await xpService.award(
          result.xp,
          result.gameType || 'game',
          result.badgeIds || [],
        );
        setXpGained(data.xpGained ?? result.xp);
        if (data.newBadges?.length > 0) setPendingBadges(data.newBadges);
        if (data.leveledUp || (data.level && data.level > (user?.level || 1))) {
          const prevLvl = user?.level || 1;
          const currLvl = data.level;
          setLeveledUp(true);
          setNewLevel(currLvl);
          /* Rank promotion check */
          const prevRnk = getRankLabel(prevLvl);
          const currRnk = getRankLabel(currLvl);
          if (currRnk !== prevRnk) {
            setRankPromoted(true);
            setNewRankName(currRnk);
            setPrevRankName(prevRnk);
          }
        }
        /* Refresh AuthContext user so XP/level stay in sync */
        if (updateUser && data) {
          updateUser({
            totalXP:        data.totalXP,
            level:          data.level,
            gamesCompleted: data.gamesCompleted,
            labsCompleted:  data.labsCompleted,
            earnedBadges:   data.earnedBadges,
          });
        }
      } catch (e) {
        console.error('XP award failed:', e);
      }
    }
  }, [activeGame, gameScore, updateUser]);

  const clearGamification = useCallback(() => {
    setPendingBadges([]);
    setLeveledUp(false);
    setNewLevel(1);
    setXpGained(0);
    setRankPromoted(false);
    setNewRankName('');
    setPrevRankName('');
  }, []);

  return (
    <GameContext.Provider value={{
      activeGame, gameScore, gameStreak, gameHistory,
      startGame, addPoints, endGame,
      pendingBadges, leveledUp, newLevel, xpGained, clearGamification,
      rankPromoted, newRankName, prevRankName,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
};
