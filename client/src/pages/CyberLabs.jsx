import React from 'react';
import Sidebar from '../components/Sidebar';
import LabCard from '../components/LabCard';
import '../styles/dashboard.css';
import '../styles/games.css';

const LABS = [
  {
    icon: '💻',
    title: 'Hacker Simulator',
    complexity: 'Intermediate',
    description: 'Experience a sandboxed hacker terminal environment. Run simulated exploits, explore vulnerabilities, and understand attacker methodology safely.',
    route: '/cyber-labs/hacker-simulator',
    tags: ['Terminal', 'Exploits', 'Recon'],
  },
  {
    icon: '🔍',
    title: 'Digital Forensics Lab',
    complexity: 'Advanced',
    description: 'Investigate simulated cybercrime scenes. Examine log files, recover deleted data, trace network activity, and build a forensic report.',
    route: '/cyber-labs/digital-forensics',
    tags: ['Logs', 'Forensics', 'OSINT'],
  },
  {
    icon: '🧩',
    title: 'Network Defense Puzzle',
    complexity: 'Beginner',
    description: 'Configure firewalls, segment networks, and deploy intrusion detection systems to protect a virtualized corporate network from attack patterns.',
    route: '/cyber-labs/network-defense-puzzle',
    tags: ['Firewall', 'IDS', 'Routing'],
  },
];

const CyberLabs = () => (
  <div className="dashboard-layout">
    <Sidebar />
    <main className="dashboard-main cyber-labs-page">
      <div className="dashboard-header">
        <div>
          <p className="games-page-label">Practice Environment · Advanced</p>
          <h1 className="games-page-title">Cyber Labs</h1>
          <p className="games-page-subtitle">
            Hands-on practice environments for deep technical skill-building
          </p>
        </div>
      </div>

      <div className="section-title">Available Labs</div>
      <div className="labs-grid">
        {LABS.map(l => <LabCard key={l.route} {...l} />)}
      </div>
    </main>
  </div>
);

export default CyberLabs;
