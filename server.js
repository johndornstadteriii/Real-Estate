const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const MICROCONTROLLER_URL = process.env.MICRO_URL || 'http://microcontroller.local';
const CAMERA_URL = process.env.CAMERA_URL || 'http://camera.local/stream';
const VIDEO_DIR = path.join(__dirname, 'videos');

const app = express();
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));

// In-memory user store (demo only)
const USERS = [{ username: 'admin', password: 'password' }];

app.use(express.static(path.join(__dirname, 'public')));

function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).send('Unauthorized');
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username && u.password === password);
  if (user) {
    req.session.user = { username };
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.post('/api/lights', requireLogin, async (req, res) => {
  const { state, color } = req.body; // color {r,g,b}
  try {
    await axios.post(`${MICROCONTROLLER_URL}/lights`, { state, color });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/temperature', requireLogin, async (req, res) => {
  try {
    const response = await axios.get(`${MICROCONTROLLER_URL}/temperature`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/camera', requireLogin, (req, res) => {
  axios({ method: 'get', url: CAMERA_URL, responseType: 'stream' })
    .then(response => {
      const file = fs.createWriteStream(path.join(VIDEO_DIR, `${Date.now()}.mjpeg`));
      response.data.pipe(file);
      response.data.pipe(res);
    })
    .catch(err => {
      res.status(500).end(err.message);
    });
});

// cleanup old video files every hour
cron.schedule('0 * * * *', () => {
  fs.readdir(VIDEO_DIR, (err, files) => {
    if (err) return;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    files.forEach(f => {
      const fp = path.join(VIDEO_DIR, f);
      fs.stat(fp, (err, stats) => {
        if (!err && stats.mtimeMs < cutoff) fs.unlink(fp, () => {});
      });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
