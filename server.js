import 'dotenv/config';
import express from 'express';
import { MongoClient } from 'mongodb';
import { OpenAI } from 'openai';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Import schemas
import { GameState, Module, NPC, EchoDrift, Timeline, IntelAsset } from './echo_drift_mongo_api/api/schemas.js';

// Game state management
let gameState = {
  // Fixed initial state - always starts with Module 1 (Gunmetal Sky)
  currentModule: "Echo Drift - Module 1",
  currentScene: "M1-SC1",
  currentTurn: null,
  currentArc: 'Echo Drift',
  moduleState: {
    location: "CNS Vindicator - Dorsal Command Pod",
    playerRole: "Lt. Commander Iren Tazk",
    openingCinematic: "Battle was chaos. It always was. But this time, it broke us.",
    prompt: "36 seconds before second wave"
  },
  arcProgress: {
    architect: 0,
    quietBuilders: 0,
    mistake: 0
  },
  factionRelations: {
    algol: 0,
    proxyWorld: 0,
    thirdAlly: 0
  },
  discoveredEchoes: [],
  collectedIntel: [],
  completedTurns: [],
  choices: [],
  timeline: {}
};

// MongoDB connection (using existing API)
import handler from './echo_drift_mongo_api/api/mongodb.js';

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Game state endpoints
app.get('/api/game-state', async (req, res) => {
  try {
    // Use the default handler which queries the Modules collection
    const data = await handler(req, res);
    res.json(data);
  } catch (error) {
    console.error('Game state error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Collection-specific endpoints
app.get('/api/:collection', async (req, res) => {
  const validCollections = ['Echo_Drifts', 'Intel_Assets', 'Modules', 'NPCs', 'Tazk', 'Timeline'];
  const collection = req.params.collection;

  if (!validCollections.includes(collection)) {
    return res.status(400).json({ error: `Invalid collection. Must be one of: ${validCollections.join(', ')}` });
  }

  try {
    req.query.collection = collection;  // Pass collection name to handler
    await handler(req, res);
  } catch (error) {
    console.error(`${collection} query error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.emit('game_state_update', gameState);

  socket.on('query', async (data) => {
    try {
      // Get current game context
      const currentArc = gameState.currentArc;
      const npcRelations = gameState.npcRelationships;
      const progress = gameState.playerProgress;

      // Get current module and context data
      const currentModule = gameState.currentModule;
      const moduleData = currentModule ? await Module.findOne({ module: currentModule }) : null;
      const timelineData = await Timeline.findOne({ arc: currentArc });
      const echoDrifts = await EchoDrift.find({ 'echoEvents.replayReference': { $regex: `^M${moduleData?.moduleNumber || '\d+'}-` } });
      
      // Process query through OpenAI with full game context
      const completion = await openai.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: `You are Echo Drift's game master. You are running a fixed narrative. The player is ALWAYS Lt. Commander Iren Tazk. NEVER ask about character creation, module selection, or startup options.

            For new games, immediately start with:
            "Battle was chaos. It always was. But this time, it broke us."

            Then present ONLY these four options:
            1. Redirect Power to Shields (requires Mechanic or INT/EDU)
            2. Evacuate to Internal Corridor (requires Vacc Suit, DEX, Athletics, or END)
            3. Attempt to Save Bravo Battery Logs (requires Electronics or Computer)
            4. Broadcast Final Orders (requires Leadership or Tactics)

            Current State:
            Module: ${moduleData?.module || gameState.currentModule}
            Scene: ${gameState.currentScene}
            Location: CNS Vindicator, Low Orbit over Kael-9
            Role: Lt. Cmdr Iren Tazk, Bravo Battery
            
            Echo Events: ${echoDrifts.map(e => e.echoEvents.map(event => event.title)).flat().join(', ')}
            
            IMPORTANT: Present the story directly. No character creation. No module selection. No startup options. Only the four scene actions above.`
          },
          { role: "user", content: data.query }
        ],
        model: "gpt-4",
      });

      // Update game state based on AI response
      const response = completion.choices[0].message.content;
      await updateGameState(response, data.query);

      // Emit updated state
      socket.emit('response', {
        aiResponse: response,
        gameState
      });
    } catch (error) {
      console.error('Socket error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Game state update function
async function updateGameState(aiResponse, playerQuery) {
  try {
    // Extract state changes from AI response
    const stateUpdate = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Analyze the game interaction and extract state changes. Format as JSON with these fields:
          - arcProgress: { architect, quietBuilders, mistake } (0-100 progress values)
          - factionRelations: { algol, proxyWorld, thirdAlly } (-100 to 100 relationship values)
          - discoveredEchoes: [array of echo IDs discovered]
          - collectedIntel: [array of intel items found]
          - moduleProgress: { completedTurn, nextTurn } or { completedScene, nextScene }
          Only include fields that have changed.`
        },
        {
          role: "user",
          content: `Player: ${playerQuery}\nAI: ${aiResponse}`
        }
      ],
      model: "gpt-4",
    });

    const changes = JSON.parse(stateUpdate.choices[0].message.content);
    
    // Update arc progress
    if (changes.arcProgress) {
      gameState.arcProgress = {
        ...gameState.arcProgress,
        ...changes.arcProgress
      };
    }

    // Update faction relations
    if (changes.factionRelations) {
      gameState.factionRelations = {
        ...gameState.factionRelations,
        ...changes.factionRelations
      };
    }

    // Add new discoveries
    if (changes.discoveredEchoes) {
      gameState.discoveredEchoes = [
        ...new Set([...gameState.discoveredEchoes, ...changes.discoveredEchoes])
      ];
    }

    if (changes.collectedIntel) {
      gameState.collectedIntel = [
        ...new Set([...gameState.collectedIntel, ...changes.collectedIntel])
      ];
    }

    // Update module progress
    if (changes.moduleProgress) {
      if (changes.moduleProgress.completedTurn) {
        gameState.completedTurns.push(changes.moduleProgress.completedTurn);
        gameState.currentTurn = changes.moduleProgress.nextTurn;
      } else if (changes.moduleProgress.completedScene) {
        gameState.completedTurns.push(changes.moduleProgress.completedScene);
        gameState.currentScene = changes.moduleProgress.nextScene;
      }
    }

    // Check for arc transitions
    if (gameState.currentArc === 'The Architect' && 
        gameState.discoveredEvents.includes('failed_transfer_discovery')) {
      gameState.currentArc = 'The Quiet Builders';
    } else if (gameState.currentArc === 'The Quiet Builders' && 
               gameState.discoveredEvents.includes('settlement_discovery')) {
      gameState.currentArc = 'The Mistake';
    }

    // Update timeline
    gameState.timeline[Date.now()] = {
      query: playerQuery,
      response: aiResponse,
      stateChanges: changes
    };

  } catch (error) {
    console.error('Game state update error:', error);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
