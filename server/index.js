const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Node = require('./models/Node'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret_key';
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ DB Error:", err));
app.get('/api/nodes/:projectId', async (req, res) => {
  try {
    const nodes = await Node.find({ 
      projectId: req.params.projectId, 
      isDeleted: { $ne: true } 
    });
    res.json(nodes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/nodes', async (req, res) => {
  try {
    const newNode = await Node.create({
      ...req.body,
      lastModified: Date.now() 
    });
    res.status(201).json(newNode);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/nodes/:id', async (req, res) => {
  try {
    await Node.updateMany({ nodeId: req.params.id }, { isDeleted: true });
    res.sendStatus(200);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});
app.patch('/api/nodes/:id', async (req, res) => {
  try {
    const updatedNode = await Node.findOneAndUpdate(
      { nodeId: req.params.id }, 
      { name: req.body.name, lastModified: Date.now() },
      { new: true, sort: { timestamp: -1 } } 
    );
    res.json(updatedNode);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      email, 
      password: hashed, 
      username: email.split('@')[0] 
    });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    res.json({ token, user: { email: user.email, color: user.color, username: user.username } });
  } catch (err) { res.status(400).json({ error: "Email already exists" }); }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    res.json({ token, user: { email: user.email, color: user.color, username: user.username } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New Collaborator Connected');
  
  ws.on('message', async (message) => {
    try {
      const payload = JSON.parse(message.toString());
      if (payload.type === 'presence:mouse') {
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(payload));
          }
        });
        return; 
      }
      if (payload.type === 'node:move') {
        await Node.findOneAndUpdate(
          { nodeId: payload.nodeId }, 
          { x: payload.x, y: payload.y, lastModified: Date.now() },
          { sort: { timestamp: -1 } }
        );
      }
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify(payload));
        }
      });

    } catch (err) { console.error("WS Error:", err); }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));