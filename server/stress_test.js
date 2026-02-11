const mongoose = require('mongoose');
const Node = require('./models/Node');
require('dotenv').config();

const SEED_PROJECT = "nexus-global-core";

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🚀 Initializing 10,000 Node Global Mesh...");
    
    // Clear old data for this project specifically
    await Node.deleteMany({ projectId: SEED_PROJECT });

    const batch = [];
    const now = Date.now();
    
    // Adjusted spread to fit within Dashboard.jsx visibility limits
    const WORLD_WIDTH = 8000; 
    const WORLD_HEIGHT = 6000;
    const SECTOR_SIZE = 1000; 

    // 1. Create Grid Hubs
    const hubs = [];
    for (let x = 0; x < WORLD_WIDTH; x += SECTOR_SIZE) {
      for (let y = 0; y < WORLD_HEIGHT; y += SECTOR_SIZE) {
        const hubId = `hub-${x}-${y}-${now}`;
        batch.push({
          nodeId: hubId,
          name: `HUB [${x}:${y}]`,
          type: "folder",
          projectId: SEED_PROJECT,
          x: x + 500,
          y: y + 500,
          status: "active",
          isDeleted: false, // EXPLICIT FIELD
          timestamp: now
        });
        hubs.push(hubId);
      }
    }

    // 2. Create 10,000 Scattered Nodes
    const TOTAL_NODES = 10000;
    for (let i = 0; i < TOTAL_NODES; i++) {
      const randomHub = hubs[Math.floor(Math.random() * hubs.length)];
      batch.push({
        nodeId: `node-${i}-${now}`,
        name: `DP_${i.toString(16).toUpperCase()}`,
        parentId: randomHub, 
        type: "node",
        projectId: SEED_PROJECT,
        x: Math.floor(Math.random() * WORLD_WIDTH),
        y: Math.floor(Math.random() * WORLD_HEIGHT),
        status: "idle",
        isDeleted: false, // EXPLICIT FIELD
        timestamp: now
      });
    }

    console.log(`Inserting ${batch.length} nodes...`);
    await Node.insertMany(batch); 
    console.log("✅ DEPLOYED: Switch project to 'nexus-global-core' in your UI.");
    process.exit();
  } catch (err) {
    console.error("❌ SEED FAILED:", err);
    process.exit(1);
  }
}

seed();