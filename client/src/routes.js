import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Scenarios from './pages/Scenarios';
import Simulation from './pages/Simulation';
import Results from './pages/Results';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import CyberGames from './pages/CyberGames';
import CyberLabs from './pages/CyberLabs';
import PhishingDetective from './pages/games/PhishingDetective';
import PasswordBattle from './pages/games/PasswordBattle';
import FakeWebsiteHunter from './pages/games/FakeWebsiteHunter';
import CyberDefenseStrategy from './pages/games/CyberDefenseStrategy';
import NetworkDefender from './pages/games/NetworkDefender';
import DigitalTwinSimulator from './pages/games/DigitalTwinSimulator';
import HackerSimulator from './pages/labs/HackerSimulator';
import DigitalForensicsLab from './pages/labs/DigitalForensicsLab';
import NetworkDefensePuzzle from './pages/labs/NetworkDefensePuzzle';
import BattleArena from './pages/games/BattleArena';

const PrivateRoute = ({ children }) => {
	const { user } = useAuth();
	return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
	const { user } = useAuth();
	return !user ? children : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
	return (
		<Routes>
			<Route path="/" element={<Home />} />
			<Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
			<Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
			<Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
			<Route path="/scenarios" element={<PrivateRoute><Scenarios /></PrivateRoute>} />
			<Route path="/simulation/:id" element={<PrivateRoute><Simulation /></PrivateRoute>} />
			<Route path="/results/:sessionId" element={<PrivateRoute><Results /></PrivateRoute>} />
			<Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
			<Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
			<Route path="/cyber-games" element={<PrivateRoute><CyberGames /></PrivateRoute>} />
			<Route path="/cyber-games/phishing-detective" element={<PrivateRoute><PhishingDetective /></PrivateRoute>} />
			<Route path="/cyber-games/password-battle" element={<PrivateRoute><PasswordBattle /></PrivateRoute>} />
			<Route path="/cyber-games/fake-website-hunter" element={<PrivateRoute><FakeWebsiteHunter /></PrivateRoute>} />
			<Route path="/cyber-games/cyber-defense-strategy" element={<PrivateRoute><CyberDefenseStrategy /></PrivateRoute>} />
			<Route path="/cyber-games/network-defender" element={<PrivateRoute><NetworkDefender /></PrivateRoute>} />
			<Route path="/cyber-games/digital-twin" element={<PrivateRoute><DigitalTwinSimulator /></PrivateRoute>} />
			<Route path="/cyber-labs" element={<PrivateRoute><CyberLabs /></PrivateRoute>} />
			<Route path="/cyber-labs/hacker-simulator" element={<PrivateRoute><HackerSimulator /></PrivateRoute>} />
			<Route path="/cyber-labs/digital-forensics" element={<PrivateRoute><DigitalForensicsLab /></PrivateRoute>} />
			<Route path="/cyber-labs/network-defense-puzzle" element={<PrivateRoute><NetworkDefensePuzzle /></PrivateRoute>} />
			<Route path="/cyber-games/battle-arena" element={<PrivateRoute><BattleArena /></PrivateRoute>} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
};

export default AppRoutes;
