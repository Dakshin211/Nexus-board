const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
  nodeId: { type: String, required: true }, 
  type: { type: String, enum: ['folder', 'node'], default: 'node' },
  name: { type: String, required: true },
  
  parentId: { type: String, default: null }, 
  
  projectId: { type: String, default: "default-project" },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  status: { type: String, default: 'idle' },
  timestamp: { type: Number, default: () => Date.now() },
  lastModified: { type: Number, default: () => Date.now() },
  isDeleted: { type: Boolean, default: false }
});

NodeSchema.index({ projectId: 1, lastModified: -1 });
NodeSchema.index({ nodeId: 1, lastModified: -1 });

module.exports = mongoose.model('Node', NodeSchema);