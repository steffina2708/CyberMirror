export const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

export const getDifficultyColor = (difficulty) => {
  const map = { easy: '#00ff88', medium: '#ffcc00', hard: '#ff4444', expert: '#ff0080' };
  return map[difficulty] || '#00f5ff';
};

export const getDifficultyLabel = (difficulty) => {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
};

export const getScoreGrade = (score, maxScore) => {
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return { grade: 'S', label: 'Expert', color: '#ff0080' };
  if (pct >= 75) return { grade: 'A', label: 'Advanced', color: '#00f5ff' };
  if (pct >= 60) return { grade: 'B', label: 'Proficient', color: '#00ff88' };
  if (pct >= 40) return { grade: 'C', label: 'Apprentice', color: '#ffcc00' };
  return { grade: 'D', label: 'Novice', color: '#ff4444' };
};

export const getCategoryIcon = (category) => {
  const icons = {
    phishing: '🎣',
    'social-engineering': '🎭',
    'fake-login': '🔐',
    malware: '🦠',
    ransomware: '💀',
  };
  return icons[category] || '🛡️';
};

export const truncate = (str, max = 80) => {
  return str.length > max ? str.slice(0, max) + '...' : str;
};
