const mongoose = require('mongoose');
const Node = require('./models/Node');
require('dotenv').config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Clear existing nodes
  await Node.deleteMany({});

  // 1. Create a Root "Project" Node
  const root = await Node.create({
    name: "Main Project",
    type: "folder",
    x: 100,
    y: 100
  });

  // 2. Create 500 nodes connected to this Root
  const children = [];
  for (let i = 0; i < 500; i++) {
    children.push({
      name: `Task-${i}`,
      type: "node",
      parentId: root._id, // CHALLENGE A: Graph Link
      x: Math.random() * 5000,
      y: Math.random() * 5000
    });
  }
  await Node.insertMany(children);

  console.log("✅ Database Seeded with 501 nodes!");
  process.exit();
};

seed();