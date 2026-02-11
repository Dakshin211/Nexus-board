const mongoose = require('mongoose');
const Node = require('./models/Node');
require('dotenv').config();

async function repair() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // 1. Create a fresh Root for testing
  const root = await Node.create({
    name: "Engineering Project Alpha",
    type: "folder",
    projectId: "alpha-1",
    x: 500,
    y: 500
  });

  // 2. Update all orphans to point to this new Root and fix their timestamps
  const result = await Node.updateMany(
    { _id: { $ne: root._id } }, 
    { 
      $set: { 
        parentId: root._id, 
        projectId: "alpha-1",
        lastModified: Date.now() 
      } 
    }
  );

  console.log(`✅ Fixed ${result.modifiedCount} nodes! They are now on the grid.`);
  process.exit();
}
repair();