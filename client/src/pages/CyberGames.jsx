import React from 'react';
import Sidebar from '../components/Sidebar';
import GameCard from '../components/GameCard';
import '../styles/dashboard.css';
import '../styles/games.css';

const GAMES = [
  {
    icon: '🎣',
    title: 'Phishing Detective',
    difficulty: 'Easy',
    description: 'Analyze suspicious emails and links to identify real phishing attacks before they fool you.',
    route: '/cyber-games/phishing-detective',
    players: '1.2K',
  },
  {
    icon: '🔐',
    title: 'Password Battle',
    difficulty: 'Medium',
    description: 'Race to create the strongest passwords while breaking weak ones. Master the art of credential security.',
    route: '/cyber-games/password-battle',
    players: '843',
  },
  {
    icon: '🕵️',
    title: 'Fake Website Hunter',
    difficulty: 'Medium',
    description: 'Spot fraudulent websites designed to steal credentials. Train your eye to detect spoofed domains and UI clues.',
    route: '/cyber-games/fake-website-hunter',
    players: '671',
  },
  {
    icon: '🛡️',
    title: 'Cyber Defense Strategy',
    difficulty: 'Hard',
    description: 'Build and defend your network infrastructure against waves of simulated cyber attacks in real time.',
    route: '/cyber-games/cyber-defense-strategy',
    players: '429',
  },
  {    icon: '🌐',
    title: 'Network Defender',
    difficulty: 'Expert',
    description: 'Monitor live network traffic, identify intrusions, and patch vulnerabilities before systems are compromised.',
    route: '/cyber-games/network-defender',
    players: '215',
  },
  {    icon: '🖥️',
    title: 'Digital Twin Simulator',
    difficulty: 'Expert',
    description: 'Defend a simulated corporate network in real time. Respond to live cyber attacks — DDoS, ransomware, phishing and more — before systems are compromised.',
    route: '/cyber-games/digital-twin',
    players: '94',
  },
  {
    icon: '⚔️',
    title: 'Cyber Battle Arena',
    difficulty: 'All Levels',
    description: 'Real-time PvP cybersecurity competition. Race against another operator to answer phishing and defense challenges faster and more accurately.',
    route: '/cyber-games/battle-arena',
    players: '0',
    tag: 'MULTIPLAYER',
  },
];

const CyberGames = () => (
  <div className="dashboard-layout">
    <Sidebar />
    <main className="dashboard-main cyber-games-page">
      <div className="dashboard-header">
        <div>
          <p className="games-page-label">Training Arena · Interactive</p>
          <h1 className="games-page-title">Cyber Games</h1>
          <p className="games-page-subtitle">
            Sharpen your cybersecurity skills through gamified challenges
          </p>
        </div>
      </div>

      <div className="section-title">All Games</div>
      <div className="games-grid">
        {GAMES.map(g => <GameCard key={g.route} {...g} />)}
      </div>
    </main>
  </div>
);

export default CyberGames;
