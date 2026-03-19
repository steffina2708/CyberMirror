const express   = require('express');
const http      = require('http');
const cors      = require('cors');
const dotenv    = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { initBattleServer }      = require('./socket/battleServer');
const { initTournamentServer }  = require('./socket/tournamentSocket');

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app);

/* ── Socket.io ────────────────────────────────────────────────── */
const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});
initBattleServer(io);
initTournamentServer(io);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/users',       require('./routes/userRoutes'));
app.use('/api/scenarios',   require('./routes/scenarioRoutes'));
app.use('/api/simulations', require('./routes/simulationRoutes'));
app.use('/api/scores',      require('./routes/scoreRoutes'));
app.use('/api/leaderboard', require('./routes/leaderboardRoutes'));
app.use('/api/xp',          require('./routes/xpRoutes'));
app.use('/api/cybermentor', require('./routes/cybermentorRoutes'));
app.use('/api/digital-twin',require('./routes/digitalTwinRoutes'));
app.use('/api/difficulty',  require('./routes/difficultyRoutes'));
app.use('/api/skill',       require('./routes/skillRoutes'));
app.use('/api/ai',          require('./routes/aiRoutes'));
app.use('/api/battle',       require('./routes/battleRoutes'));
app.use('/api/tournaments',  require('./routes/tournamentRoutes'));

app.get('/api/status', (req, res) => res.json({ status: 'CyberMirror API online', time: new Date() }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🛡️  CyberMirror server running on port ${PORT}`));
