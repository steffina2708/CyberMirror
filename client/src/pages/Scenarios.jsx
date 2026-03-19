import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import SimulationCard from '../components/SimulationCard';
import { CyberParticles } from '../components/CyberEffects';
import simulationService from '../services/simulationService';
import '../styles/dashboard.css';

const Scenarios = () => {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await simulationService.getAllScenarios();
        setScenarios(data.scenarios || []);
      } catch (e) {
        console.error('Failed to load scenarios:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = filter === 'all' ? scenarios : scenarios.filter(s => s.difficulty === filter);
  const available = new Set(scenarios.map(s => s.difficulty));

  return (
    <>
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main home-screen" style={{ marginTop: 0, paddingTop: 32 }}>
          <CyberParticles />
          <div className="scan-line" />

          {/* Header */}
          <div className="dashboard-header" style={{ marginBottom: 32 }}>
            <div>
              <p className="dashboard-command-label">Security Training</p>
              <h1 className="dashboard-title">Attack Scenarios</h1>
              <p className="dashboard-subtitle">
                Master cybersecurity through realistic attack simulations
              </p>
            </div>
          </div>

          {/* Filter pills */}
          <div className="filter-pills">
            {['all', 'easy', 'medium', 'hard', 'expert'].map(d => {
              const hasScenarios = d === 'all' || available.has(d);
              const active = filter === d;
              return (
                <button
                  key={d}
                  onClick={() => hasScenarios && setFilter(d)}
                  disabled={!hasScenarios}
                  className={`filter-pill${active ? ' active' : ''}${!hasScenarios ? ' disabled' : ''}`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
              Loading scenarios...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
              No scenarios found. Check back later.
            </div>
          ) : (
            <div className="scenarios-grid" style={{ marginBottom: 40 }}>
              {filtered.map(s => <SimulationCard key={s._id} scenario={s} />)}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Scenarios;
