import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import simulationService from '../services/simulationService';
import { useAuth } from '../context/AuthContext';
import ScenarioViewer from '../components/ScenarioViewer';
import DecisionPanel from '../components/DecisionPanel';
import FeedbackPanel from '../components/FeedbackPanel';
import ProgressBar from '../components/ProgressBar';
import ScoreBoard from '../components/ScoreBoard';
import { toast } from 'react-toastify';
import '../styles/simulation.css';

const Simulation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [scenario, setScenario] = useState(null);
  const [session, setSession] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const scRes = await simulationService.getScenarioById(id);

        if (!scRes || !scRes.scenario) {
          throw new Error('Scenario data missing');
        }

        setScenario(scRes.scenario);

        const sessRes = await simulationService.startSession(id);
        setSession(sessRes.session);
      } catch (e) {
        console.error('Simulation load error:', e.message);
        toast.error(e.message || 'Failed to load scenario');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  const handleChoice = async (choiceIndex) => {
    if (submitting || feedback) return;
    setSubmitting(true);
    setSelectedIndex(choiceIndex);

    try {
      const res = await simulationService.submitDecision(session._id, currentStep, choiceIndex);
      const step = scenario.steps[currentStep];
      const choice = step.choices[choiceIndex];
      const correct = Boolean(choice?.isCorrect);
      const pts = correct ? (choice?.points ?? 20) : 0;

      setFeedback({
        isCorrect: correct,
        explanation: choice?.feedback || choice?.explanation || '',
        pointsEarned: pts,
        correctIndex: step.choices.findIndex(c => c.isCorrect),
      });
      setScore(prev => prev + pts);
      if (correct) setCorrectCount(prev => prev + 1);
    } catch (e) {
      toast.error('Error submitting decision');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    const totalSteps = scenario.steps.length;
    if (currentStep + 1 >= totalSteps) {
      // Complete session
      try {
        const prevLevel = user?.level || 1;
        const res = await simulationService.completeSession(session._id);
        // Sync updated user stats into AuthContext / localStorage
        if (res.user) {
          if (res.user.level > prevLevel) {
            sessionStorage.setItem('cm_levelup', JSON.stringify({ newLevel: res.user.level }));
          }
          updateUser(res.user);
        }
        navigate(`/results/${session._id}`);
      } catch (e) {
        toast.error('Error completing session');
        navigate('/dashboard');
      }
    } else {
      setCurrentStep(prev => prev + 1);
      setSelectedIndex(null);
      setFeedback(null);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--cyan)', fontSize: '0.85rem', letterSpacing: '0.2em' }}>
        LOADING SCENARIO...
      </div>
    </div>
  );

  if (!scenario || !scenario.steps || scenario.steps.length === 0) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-secondary)', padding: 40 }}>Scenario data unavailable.</div>
    </div>
  );

  if (!scenario.steps[currentStep]) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-secondary)', padding: 40 }}>Invalid step index.</div>
    </div>
  );

  const step = scenario.steps[currentStep];

  return (
    <div className="simulation-page">
      {/* Header */}
      <div className="sim-header">
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}
          style={{ fontSize: '0.75rem', padding: '6px 14px' }}>
          ← Exit
        </button>
        <span className="sim-category-badge">{scenario.category}</span>
        {scenario.isAIGenerated && (
          <span className="ai-badge">🤖 AI GENERATED</span>
        )}
        <ScoreBoard
          score={score}
          maxScore={scenario.maxScore || 100}
          correctCount={correctCount}
          totalSteps={scenario.steps.length}
        />
      </div>

      {/* Progress */}
      <ProgressBar current={currentStep} total={scenario.steps.length} />

      {/* Scenario title */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
          {scenario.title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>
          {scenario.description}
        </p>
      </div>

      {/* Scenario viewer */}
      <ScenarioViewer
        step={step}
        stepIndex={currentStep}
        showRedFlags={!!(feedback && !feedback.isCorrect)}
      />

      {/* Step question */}
      {step.question && (
        <div className="step-question">
          {step.question}
        </div>
      )}

      {/* Decision panel */}
      <DecisionPanel
        choices={step.choices}
        onChoice={handleChoice}
        selectedIndex={selectedIndex}
        correctIndex={feedback?.correctIndex}
        showFeedback={!!feedback}
      />

      {/* Feedback */}
      {feedback && (
        <FeedbackPanel
          isCorrect={feedback.isCorrect}
          explanation={feedback.explanation}
          pointsEarned={feedback.pointsEarned}
        />
      )}

      {/* Navigation */}
      <div className="sim-nav-btns">
        {feedback && (
          <button className="btn btn-primary" onClick={handleNext}>
            {currentStep + 1 >= scenario.steps.length ? 'View Results →' : 'Next Step →'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Simulation;
