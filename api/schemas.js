import mongoose from 'mongoose';
const { Schema } = mongoose;

// Echo Event Schema
const EchoEventSchema = new Schema({
  echoID: { type: String, required: true, match: /^ECHO-[A-Z]+-\d{3}$/ },
  title: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  visibility: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
  method: { type: String, required: true },
  type: { type: String, enum: ['Symbolic', 'Strategic', 'Emotional'], required: true },
  consequences: { type: [String], required: true },
  replayReference: { type: String, required: true, match: /^M\d+-T\d+$/ }
});

// Echo Drifts Schema
const EchoDriftSchema = new Schema({
  echoEvents: { type: [EchoEventSchema], required: true }
});

// NPCs Schema (array at root level)
const NPCSchema = new Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  affiliation: { type: String, required: true },
  traits: { type: [String], required: true },
  notes: { type: String, required: true }
}, { _id: false }); // Disable _id for array elements

// NPCs Collection Schema
const NPCsCollectionSchema = new Schema({
  npcs: { type: [NPCSchema], required: true }
});

// Module Scene Schema
const SceneSchema = new Schema({
  id: { type: String, required: true, match: /^M\d+-SC\d+$/ },
  title: { type: String, required: true },
  subtitle: String,
  setting: {
    location: { type: String, required: true },
    player_role: { type: String, required: true }
  },
  opening_cinematic: String,
  prompt: { type: String, required: true },
  options: [{
    action: { type: String, required: true },
    skill: [String],
    effect: { type: String, required: true },
    echo_consequence: String
  }],
  fixed_point: {
    event: { type: String, required: true },
    conditions: [String],
    outcome_variation: {
      if_evacuated: String,
      if_saving_logs: String,
      if_failed_check: String
    }
  },
  echo_tag: String
});

// Module Turn Schema
const TurnSchema = new Schema({
  turn: { type: Schema.Types.Mixed, required: true }, // Can be string ('Turn X') or number
  title: { type: String, required: true },
  description: { type: String, required: true },
  decisions: { type: [String], default: [] },
  rolls: { type: [String], default: [] },
  echo: { type: String, default: null }
});

// Modules Schema
const ModuleSchema = new Schema({
  module: { type: String, required: true },
  focus: { type: String, required: true },
  turns: { type: [TurnSchema], default: undefined },
  scenes: { type: [SceneSchema], default: undefined }
}, {
  validate: {
    validator: function(doc) {
      // Must have either scenes or turns, but not both
      return (doc.scenes && !doc.turns) || (!doc.scenes && doc.turns);
    },
    message: 'A module must have either scenes or turns, but not both'
  }
});

// Character Schema (extends NPC)
const CharacterSchema = new Schema({
  characterName: { type: String, required: true },
  serviceID: { type: String, required: true },
  upp: { type: String, required: true, match: /^[0-9A-F]{6}$/ },
  branch: { type: String, required: true },
  attributes: {
    strength: { type: Number, required: true, min: 2, max: 15 },
    dexterity: { type: Number, required: true, min: 2, max: 15 },
    endurance: { type: Number, required: true, min: 2, max: 15 },
    intelligence: { type: Number, required: true, min: 2, max: 15 },
    education: { type: Number, required: true, min: 2, max: 15 },
    social: { type: Number, required: true, min: 2, max: 15 }
  },
  skills: {
    gunnery: Number,
    tactics: Number,
    leadership: Number,
    mechanics: Number,
    sensors: Number,
    streetwise: Number
  },
  traits: [String],
  psychProfile: {
    mindset: String,
    ethics: String,
    disciplinary: String,
    watchStatus: String
  },
  career: {
    preStasisRole: String,
    education: String,
    serviceRecord: [String]
  },
  stasisIncident: {
    event: String,
    escape: String,
    anomaly: String,
    recovery: String
  },
  currentStatus: {
    alias: String,
    assignment: String,
    echoDriftStatus: { type: String, enum: ['ACTIVE', 'INACTIVE'] },
    temporalAnchor: { type: String, enum: ['STABLE', 'UNSTABLE'] },
    risk: String
  },
  longTermNarrative: {
    role: [String],
    tags: [String]
  }
});

// Timeline Phase Schema
const PhaseSchema = new Schema({
  phase: String,
  keyBeat: String,
  name: String,
  span: String,
  developments: String,
  turn: Schema.Types.Mixed,
  description: String
});

// Timeline Module Schema
const TimelineModuleSchema = new Schema({
  name: { type: String, required: true },
  moduleNumber: { type: Number, required: true },
  altTitle: String,
  type: String,
  duration: { type: String, required: true },
  context: String,
  drifts: String,
  phases: [PhaseSchema],
  echoStatus: String,
  chronosecReaction: String,
  countdownMechanic: {
    start: String,
    revealedTurns: [Number],
    outcomes: {
      condition: String
    }
  }
});

// Timeline Schema
const TimelineSchema = new Schema({
  arc: { type: String, required: true },
  totalDurationMonths: { type: String, required: true },
  modules: [TimelineModuleSchema],
  designNotes: [String]
});

// Intel Assets Schema (array at root level)
const IntelAssetSchema = new Schema({
  Item: { type: String, required: true },
  Origin: { type: String, required: true },
  Relevance: { type: String, required: true },
  CurrentStatus: { type: String, required: true }
}, { _id: false }); // Disable _id for array elements

// Intel Assets Collection Schema
const IntelAssetsCollectionSchema = new Schema({
  assets: { type: [IntelAssetSchema], required: true }
});

// Game State Schema (for tracking player progress and choices)
const GameStateSchema = new Schema({
  playerId: { type: String, required: true },
  currentModule: { type: String, required: true, default: "Echo Drift - Module 1" },
  currentScene: { type: String, required: true, default: "M1-SC1" },
  currentTurn: { type: String, default: null },
  moduleState: {
    location: { type: String, required: true, default: "CNS Vindicator - Dorsal Command Pod" },
    playerRole: { type: String, required: true, default: "Lt. Commander Iren Tazk" },
    openingCinematic: { type: String, required: true, default: "Battle was chaos. It always was. But this time, it broke us." },
    prompt: { type: String, required: true, default: "36 seconds before second wave" }
  },
  arcProgress: {
    architect: { type: Number, default: 0 },
    quietBuilders: { type: Number, default: 0 },
    mistake: { type: Number, default: 0 }
  },
  factionRelations: {
    algol: { type: Number, default: 0 },
    proxyWorld: { type: Number, default: 0 },
    thirdAlly: { type: Number, default: 0 }
  },
  discoveredEchoes: [String],
  collectedIntel: [String],
  completedTurns: [String],
  choices: [{
    turnId: String,
    choice: String,
    consequence: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Export all schemas
export const EchoDrift = mongoose.model('EchoDrift', EchoDriftSchema);
export const NPC = mongoose.model('NPC', NPCSchema);
export const Module = mongoose.model('Module', ModuleSchema);
export const Character = mongoose.model('Character', CharacterSchema);
export const Timeline = mongoose.model('Timeline', TimelineSchema);
export const IntelAsset = mongoose.model('IntelAsset', IntelAssetSchema);
export const GameState = mongoose.model('GameState', GameStateSchema);
