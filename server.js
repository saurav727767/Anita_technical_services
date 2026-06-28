const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Enable CORS for all origins (to support double-clicking index.html directly via file://)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

// API Endpoint to evaluate math expressions using the C++ backend
app.post('/api/calculate', (req, res) => {
  const { expression, mode } = req.body;

  if (expression === undefined || expression === null || expression.trim() === '') {
    return res.status(400).json({ status: 'error', message: 'Expression is required' });
  }

  // Ensure trig mode is normalized to deg or rad
  const trigMode = mode === 'rad' ? 'rad' : 'deg';

  // Path to the compiled C++ executable
  const exePath = path.join(__dirname, 'calculator.exe');

  // Verify that the C++ binary exists
  if (!fs.existsSync(exePath)) {
    return res.status(500).json({
      status: 'error',
      message: 'C++ calculation backend is not compiled. Please run "npm run compile" first.'
    });
  }

  // Spawn calculator.exe directly.
  // execFile is used here instead of exec to avoid shell command injections.
  // It handles argument lists safely.
  execFile(exePath, [`--expr=${expression}`, `--mode=${trigMode}`], (error, stdout, stderr) => {
    if (error && !stdout) {
      console.error(`Execution error: ${error}`);
      console.error(`Stderr: ${stderr}`);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error while executing calculation'
      });
    }

    try {
      // The C++ application prints JSON output in stdout
      const resultData = JSON.parse(stdout.trim());
      return res.json(resultData);
    } catch (parseError) {
      console.error('Failed to parse C++ stdout as JSON:', stdout);
      return res.status(500).json({
        status: 'error',
        message: 'Calculator engine output format error'
      });
    }
  });
});

// Helper to emulate MongoDB-like JSON collection fallback
const crypto = require('crypto');
class JSONCollectionFallback {
  constructor(filename, defaultKeyField = 'email') {
    this.filename = path.join(__dirname, filename);
    this.defaultKeyField = defaultKeyField;
    this.data = {};
    this._load();
  }

  _load() {
    if (fs.existsSync(this.filename)) {
      try {
        const content = fs.readFileSync(this.filename, 'utf-8');
        this.data = JSON.parse(content || '{}');
      } catch (e) {
        console.error(`Error loading ${this.filename}:`, e);
        this.data = {};
      }
    } else {
      this.data = {};
    }
  }

  _save() {
    try {
      fs.writeFileSync(this.filename, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`Error saving ${this.filename}:`, e);
    }
  }

  findOne(query) {
    this._load();
    for (const key in this.data) {
      const item = this.data[key];
      let match = true;
      for (const qk in query) {
        if (qk === '_id') {
          if (String(item._id) !== String(query._id)) {
            match = false;
            break;
          }
        } else if (item[qk] !== query[qk]) {
          match = false;
          break;
        }
      }
      if (match) {
        return { ...item };
      }
    }
    return null;
  }

  insertOne(doc) {
    this._load();
    if (!doc._id) {
      doc._id = crypto.randomBytes(12).toString('hex');
    }
    const key = doc[this.defaultKeyField] || doc._id;
    this.data[String(key)] = doc;
    this._save();
    return { insertedId: doc._id };
  }

  updateOne(query, update, options = {}) {
    this._load();
    let foundKey = null;
    let foundItem = null;

    for (const key in this.data) {
      const item = this.data[key];
      let match = true;
      for (const qk in query) {
        if (qk === 'calendar.date') {
          const dates = (item.calendar || []).map(t => t.date);
          if (!dates.includes(query[qk])) {
            match = false;
            break;
          }
        } else if (qk === '_id') {
          if (String(item._id) !== String(query._id)) {
            match = false;
            break;
          }
        } else if (item[qk] !== query[qk]) {
          match = false;
          break;
        }
      }
      if (match) {
        foundKey = key;
        foundItem = item;
        break;
      }
    }

    if (!foundItem) {
      if (options.upsert) {
        const newDoc = { ...query };
        if (update.$set) {
          Object.assign(newDoc, update.$set);
        }
        this.insertOne(newDoc);
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    }

    if (update.$set) {
      for (const uk in update.$set) {
        if (uk.startsWith('calendar.$.')) {
          const field = uk.split('calendar.$.')[1];
          const dateVal = query['calendar.date'];
          for (const task of (foundItem.calendar || [])) {
            if (task.date === dateVal) {
              task[field] = update.$set[uk];
            }
          }
        } else {
          foundItem[uk] = update.$set[uk];
        }
      }
    }

    this.data[foundKey] = foundItem;
    this._save();
    return { modifiedCount: 1 };
  }

  deleteOne(query) {
    this._load();
    let foundKey = null;
    for (const key in this.data) {
      const item = this.data[key];
      let match = true;
      for (const qk in query) {
        if (qk === '_id') {
          if (String(item._id) !== String(query._id)) {
            match = false;
            break;
          }
        } else if (item[qk] !== query[qk]) {
          match = false;
          break;
        }
      }
      if (match) {
        foundKey = key;
        break;
      }
    }
    if (foundKey) {
      delete this.data[foundKey];
      this._save();
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  find(query = null) {
    this._load();
    const items = Object.values(this.data);
    if (!query) {
      return items.map(v => ({ ...v }));
    }
    const results = [];
    for (const item of items) {
      let match = true;
      for (const qk in query) {
        if (item[qk] !== query[qk]) {
          match = false;
          break;
        }
      }
      if (match) {
        results.push({ ...item });
      }
    }
    return results;
  }
}

// Databases setup
const usersCollection = new JSONCollectionFallback('users.json', 'email');
const cropsCollection = new JSONCollectionFallback('user_crops.json', '_id');
const otpsCollection = new JSONCollectionFallback('otps.json', 'email');
const gsData = require('./gs_data');

// JWT and Password helpers
const JWT_SECRET = 'gramin-saathi-secret-key-2025-bihar-farmers';
const ADMIN_EMAIL = 'sauravkumar727767@gmail.com';
const ADMIN_PASSWORD = '72Sa77ur67av@';
const ADMIN_NAME = 'Saurav Kumar';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === testHash;
}

function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64url(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

function createToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerStr = base64url(Buffer.from(JSON.stringify(header)));
  const payloadStr = base64url(Buffer.from(JSON.stringify(payload)));
  const signatureInput = `${headerStr}.${payloadStr}`;
  const signature = base64url(crypto.createHmac('sha256', JWT_SECRET).update(signatureInput).digest());
  return `${signatureInput}.${signature}`;
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerStr, payloadStr, signature] = parts;
    const signatureInput = `${headerStr}.${payloadStr}`;
    const expectedSignature = base64url(crypto.createHmac('sha256', JWT_SECRET).update(signatureInput).digest());
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(fromBase64url(payloadStr).toString('utf-8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// Weather fallback coordinates
const districtCoordinates = {
  "araria": { lat: 26.1509, lon: 87.4081, fullName: "Araria, Bihar, India" },
  "arwal": { lat: 25.2427, lon: 84.6732, fullName: "Arwal, Bihar, India" },
  "aurangabad": { lat: 24.7533, lon: 84.3741, fullName: "Aurangabad, Bihar, India" },
  "banka": { lat: 24.8856, lon: 86.9242, fullName: "Banka, Bihar, India" },
  "begusarai": { lat: 25.4182, lon: 86.1273, fullName: "Begusarai, Bihar, India" },
  "bhagalpur": { lat: 25.2508, lon: 87.0169, fullName: "Bhagalpur, Bihar, India" },
  "bhojpur": { lat: 25.5647, lon: 84.6640, fullName: "Bhojpur, Bihar, India" },
  "buxar": { lat: 25.5604, lon: 83.9805, fullName: "Buxar, Bihar, India" },
  "darbhanga": { lat: 26.1542, lon: 85.8918, fullName: "Darbhanga, Bihar, India" },
  "east champaran": { lat: 26.6688, lon: 84.9202, fullName: "East Champaran, Bihar, India" },
  "gaya": { lat: 24.7914, lon: 85.0002, fullName: "Gaya, Bihar, India" },
  "gopalganj": { lat: 26.4684, lon: 84.4422, fullName: "Gopalganj, Bihar, India" },
  "jamui": { lat: 24.9281, lon: 86.2278, fullName: "Jamui, Bihar, India" },
  "jehanabad": { lat: 25.2149, lon: 84.9915, fullName: "Jehanabad, Bihar, India" },
  "kaimur": { lat: 25.0449, lon: 83.6276, fullName: "Kaimur, Bihar, India" },
  "katihar": { lat: 25.5520, lon: 87.5724, fullName: "Katihar, Bihar, India" },
  "khagaria": { lat: 25.5126, lon: 86.4811, fullName: "Khagaria, Bihar, India" },
  "kishanganj": { lat: 26.2739, lon: 87.9397, fullName: "Kishanganj, Bihar, India" },
  "lakhisarai": { lat: 25.1783, lon: 86.0917, fullName: "Lakhisarai, Bihar, India" },
  "madhepura": { lat: 25.9254, lon: 86.7904, fullName: "Madhepura, Bihar, India" },
  "madhubani": { lat: 26.3490, lon: 86.0837, fullName: "Madhubani, Bihar, India" },
  "munger": { lat: 25.3748, lon: 86.4735, fullName: "Munger, Bihar, India" },
  "muzaffarpur": { lat: 26.1209, lon: 85.3647, fullName: "Muzaffarpur, Bihar, India" },
  "nalanda": { lat: 25.1325, lon: 85.4526, fullName: "Nalanda, Bihar, India" },
  "nawada": { lat: 24.8894, lon: 85.5411, fullName: "Nawada, Bihar, India" },
  "patna": { lat: 25.5941, lon: 85.1376, fullName: "Patna, Bihar, India" },
  "purnia": { lat: 25.7771, lon: 87.4753, fullName: "Purnia, Bihar, India" },
  "rohtas": { lat: 24.9567, lon: 84.0152, fullName: "Rohtas, Bihar, India" },
  "saharsa": { lat: 25.8835, lon: 86.6006, fullName: "Saharsa, Bihar, India" },
  "samastipur": { lat: 25.8633, lon: 85.7865, fullName: "Samastipur, Bihar, India" },
  "saran": { lat: 25.8560, lon: 84.7297, fullName: "Saran, Bihar, India" },
  "sheikhpura": { lat: 25.1378, lon: 85.8569, fullName: "Sheikhpura, Bihar, India" },
  "sheohar": { lat: 26.5165, lon: 85.2917, fullName: "Sheohar, Bihar, India" },
  "sitamarhi": { lat: 26.5988, lon: 85.4847, fullName: "Sitamarhi, Bihar, India" },
  "siwan": { lat: 26.2196, lon: 84.3567, fullName: "Siwan, Bihar, India" },
  "supaul": { lat: 26.1158, lon: 86.6053, fullName: "Supaul, Bihar, India" },
  "vaishali": { lat: 25.6835, lon: 85.2237, fullName: "Vaishali, Bihar, India" },
  "west champaran": { lat: 27.1601, lon: 84.4578, fullName: "West Champaran, Bihar, India" }
};

async function getCoordinates(city) {
  const cleaned = city.toLowerCase().trim();
  if (districtCoordinates[cleaned]) {
    return districtCoordinates[cleaned];
  }
  
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ", Bihar, India")}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'GraminSaathi/2.0' } });
    const data = await res.json();
    if (data && data.length > 0) {
      const parts = data[0].display_name.split(',');
      const shortName = parts.length > 1 ? `${parts[0].trim()}, ${parts[1].trim()}` : parts[0];
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        fullName: shortName
      };
    }
  } catch (e) {
    console.error('Nominatim search failed:', e.message);
  }
  return null;
}

// Weather descriptions converter
function getWeatherDesc(code) {
  if (code === 0) return "Saaf mausam ☀️";
  if ([1, 2, 3].includes(code)) return "Aasmaani badal 🌤️";
  if ([45, 48].includes(code)) return "Kohra 🌫️";
  if ([51, 53, 55].includes(code)) return "Hafki baarish 🌦️";
  if ([61, 63, 65].includes(code)) return "Baarish 🌧️";
  if ([71, 73, 75].includes(code)) return "Barf ❄️";
  if ([80, 81, 82].includes(code)) return "Tez baarish 🌧️";
  if ([95, 96, 99].includes(code)) return "Aandhi toofan ⛈️";
  return "Mausam badal raha hai 🌡️";
}

function getAqiLevel(aqi) {
  if (aqi === null || aqi === undefined) return ["N/A", "⬜"];
  const val = parseFloat(aqi);
  if (val <= 50) return ["Good", "🟢"];
  if (val <= 100) return ["Moderate", "🟡"];
  if (val <= 150) return ["Unhealthy*", "🟠"];
  if (val <= 200) return ["Unhealthy", "🔴"];
  if (val <= 300) return ["Very Unhealthy", "🟣"];
  return ["Hazardous", "⚫"];
}

// ==========================================
// GRAMIN SAATHI API ROUTES
// ==========================================

// Auth Routes
// ==========================================
// UNIFIED PORTAL OTP AUTHENTICATION
// ==========================================
app.post('/api/auth/request-otp', (req, res) => {
  const { contact } = req.body;
  if (!contact) {
    return res.status(400).json({ error: "Email or phone number is required" });
  }

  // Generate 6-digit OTP code
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 1000 * 60 * 2).toISOString(); // 2 minutes

  otpsCollection.updateOne(
    { email: contact },
    {
      $set: {
        otp,
        expires,
        used: false
      }
    },
    { upsert: true }
  );

  console.log(`\n===================================================`);
  console.log(` [OTP GENERATED] For: ${contact} => CODE: ${otp}`);
  console.log(`===================================================\n`);

  res.json({
    message: "OTP successfully generated! Check console logs.",
    otp_for_testing: otp
  });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { contact, code } = req.body;
  if (!contact || !code) {
    return res.status(400).json({ error: "Contact and code are required" });
  }

  const otpDoc = otpsCollection.findOne({ email: contact });
  if (!otpDoc) {
    return res.status(400).json({ error: "OTP request not found!" });
  }
  if (otpDoc.used) {
    return res.status(400).json({ error: "OTP has already been used!" });
  }
  if (new Date() > new Date(otpDoc.expires)) {
    return res.status(400).json({ error: "OTP has expired!" });
  }
  if (otpDoc.otp !== code) {
    return res.status(400).json({ error: "Wrong OTP code!" });
  }

  // Mark OTP as used
  otpsCollection.updateOne({ email: contact }, { $set: { used: true } });

  // Find or register user
  let user = usersCollection.findOne({ email: contact });
  if (!user) {
    // Determine user name from email/phone
    const name = contact.includes('@') ? contact.split('@')[0] : `User_${contact.substring(contact.length - 4)}`;
    const userDoc = {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email: contact,
      password: hashPassword("otp_generated_default_password"), // default pass
      phone: contact.includes('@') ? "" : contact,
      district: "Patna",
      state: "Bihar",
      role: "user",
      created_at: new Date().toISOString(),
      is_active: true
    };
    usersCollection.insertOne(userDoc);
    user = userDoc;
  }

  const token = createToken({ sub: user.email, role: user.role || "user", exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 });

  res.json({
    success: true,
    token,
    user: {
      name: user.name,
      email: user.email,
      role: user.role || "user",
      district: user.district || "Patna"
    }
  });
});
// Route all /api/gs requests to the Python backend on port 8000
// app.use('/api/gs', (req, res, next) => {
//   proxyRequest(8000, req.url, req, res, next);
// });

// New Node.js Native implementation for Notifications & Admin stats
app.get('/api/gs/notifications/my', async (req, res) => {
  const current = getAuthUser(req);
  if (!current) return res.status(401).json({ detail: "Auth required!" });

  const email = current.sub;
  const user = usersCollection.findOne({ email });
  const userDistrict = (user && user.district) ? user.district.toLowerCase() : "patna";

  const notifications = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const userCrops = cropsCollection.find({ user_email: email });
  
  for (const crop of userCrops) {
    if (crop.is_active === false) continue;
    
    for (const task of (crop.calendar || [])) {
      if (task.done) continue;
      
      const taskDate = new Date(task.date);
      taskDate.setHours(0, 0, 0, 0);
      
      const diffTime = taskDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysLeft === 0) {
        notifications.push({
          type: "crop_today",
          priority: "high",
          icon: task.icon,
          title: `Aaj ka kaam — ${crop.fasal_naam}`,
          message: task.task,
          crop_id: String(crop._id),
          task_date: task.date,
          days_left: 0
        });
      } else if (daysLeft === 1) {
        notifications.push({
          type: "crop_tomorrow",
          priority: "medium",
          icon: task.icon,
          title: `Kal ka kaam — ${crop.fasal_naam}`,
          message: task.task,
          crop_id: String(crop._id),
          task_date: task.date,
          days_left: 1
        });
      } else if (daysLeft >= 2 && daysLeft <= 5) {
        notifications.push({
          type: "crop_upcoming",
          priority: "low",
          icon: task.icon,
          title: `${daysLeft} din mein — ${crop.fasal_naam}`,
          message: task.task,
          crop_id: String(crop._id),
          task_date: task.date,
          days_left: daysLeft
        });
      }
    }
  }

  // Fetch weather alerts
  try {
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(userDistrict + ", Bihar, India")}&format=json&limit=1`;
    const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'GraminSaathi/2.0' } });
    const geoData = await geoRes.json();
    
    if (geoData && geoData.length > 0) {
      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);
      
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=Asia%2FKolkata`;
      const wRes = await fetch(weatherUrl);
      const wData = await wRes.json();
      
      if (wData && wData.daily) {
        for (let i = 0; i < 5; i++) {
          const rain = wData.daily.precipitation_sum[i] || 0;
          const prob = wData.daily.precipitation_probability_max[i] || 0;
          const dateStr = wData.daily.time[i];
          const tmax = wData.daily.temperature_2m_max[i] || 0;
          
          if (rain > 50) {
            notifications.unshift({
              type: "weather_alert",
              priority: "urgent",
              icon: "⛈️",
              title: `TEZ BARISH ALERT — Din ${i+1}`,
              message: `${dateStr} ko ${Math.round(rain)}mm barish! Fasal dhak lo, sinchai band karo!`,
              days_left: i
            });
          } else if (rain > 25 && i <= 2) {
            notifications.push({
              type: "weather_info",
              priority: "medium",
              icon: "🌧️",
              title: `Barish hogi — ${dateStr}`,
              message: `${Math.round(rain)}mm barish (${prob}% chance) — sinchai skip karo!`,
              days_left: i
            });
          }
          
          if (tmax > 42 && i <= 2) {
            notifications.push({
              type: "heat_alert",
              priority: "medium",
              icon: "🌡️",
              title: `Bahut tez garmi — ${dateStr}`,
              message: `Temp ${tmax}°C — Subah ya shaam mein sinchai karo!`,
              days_left: i
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch weather alerts in notifications:", err.message);
  }

  // Sort: urgent first, then high, medium, low
  const priorityOrder = { "urgent": 0, "high": 1, "medium": 2, "low": 3 };
  notifications.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));

  res.json({
    notifications,
    total: notifications.length,
    urgent: notifications.filter(n => n.priority === "urgent").length,
    today: notifications.filter(n => n.days_left === 0).length
  });
});

app.get('/api/gs/admin/users', (req, res) => {
  const current = getAuthUser(req);
  if (!current || current.role !== 'admin') {
    return res.status(403).json({ detail: "Admin access required!" });
  }

  const users = usersCollection.find();
  const crops = cropsCollection.find();

  const cropCounts = {};
  for (const c of crops) {
    const email = c.user_email;
    cropCounts[email] = (cropCounts[email] || 0) + 1;
  }

  const result = [];
  for (const user of users) {
    const email = user.email;
    const lastLogin = user.last_login;
    let isOnline = false;

    if (lastLogin) {
      try {
        const lastDt = new Date(lastLogin);
        isOnline = (new Date() - lastDt) < 1800 * 1000;
      } catch (e) {}
    }

    result.push({
      name: user.name,
      email: email,
      phone: user.phone || "",
      district: user.district || "",
      state: user.state || "Bihar",
      role: user.role || "user",
      created_at: user.created_at || "",
      last_login: lastLogin || "",
      is_active: user.is_active !== false,
      is_online: isOnline,
      crops_count: cropCounts[email] || 0
    });
  }

  const onlineCount = result.filter(u => u.is_online).length;

  res.json({
    total_users: result.length,
    active_users: result.filter(u => u.is_active).length,
    online_now: onlineCount,
    users: result
  });
});

app.post('/api/gs/admin/create-admin', (req, res) => {
  const current = getAuthUser(req);
  if (!current || current.role !== 'admin') {
    return res.status(403).json({ detail: "Admin access required!" });
  }

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ detail: "All fields are required!" });
  }

  if (usersCollection.findOne({ email })) {
    return res.status(400).json({ detail: "Email already exists!" });
  }

  usersCollection.insertOne({
    name,
    email,
    password: hashPassword(password),
    role: "admin",
    created_at: new Date().toISOString(),
    is_active: true,
    is_online: false,
    district: "Bihar",
    state: "Bihar"
  });

  res.json({ message: `Admin '${name}' created!` });
});

app.put('/api/gs/admin/toggle-user/:email', (req, res) => {
  const current = getAuthUser(req);
  if (!current || current.role !== 'admin') {
    return res.status(403).json({ detail: "Admin access required!" });
  }

  const email = req.params.email;
  const user = usersCollection.findOne({ email });
  if (!user) {
    return res.status(404).json({ detail: "User not found!" });
  }

  const newStatus = user.is_active === false;
  usersCollection.updateOne(
    { email },
    { $set: { is_active: newStatus } }
  );

  const status = newStatus ? "activated" : "deactivated";
  res.json({ message: `User ${status}!` });
});

app.get('/api/gs/admin/stats', (req, res) => {
  const current = getAuthUser(req);
  if (!current || current.role !== 'admin') {
    return res.status(403).json({ detail: "Admin access required!" });
  }

  const users = usersCollection.find();
  const crops = cropsCollection.find();

  const districtCount = {};
  for (const user of users) {
    const dist = user.district || "unknown";
    districtCount[dist] = (districtCount[dist] || 0) + 1;
  }

  const onlineUsers = [];
  for (const user of users) {
    const lastLogin = user.last_login;
    if (lastLogin) {
      try {
        const lastDt = new Date(lastLogin);
        if ((new Date() - lastDt) < 1800 * 1000) {
          onlineUsers.push({
            name: user.name,
            email: user.email,
            district: user.district || ""
          });
        }
      } catch (e) {}
    }
  }

  const sortedUsers = [...users].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const recent = sortedUsers.slice(0, 10);

  res.json({
    total_users: users.length,
    active_users: users.filter(u => u.is_active !== false).length,
    online_now: onlineUsers.length,
    online_users: onlineUsers,
    total_crops_tracked: crops.length,
    districts: districtCount,
    recent_registrations: recent.map(u => ({
      name: u.name,
      email: u.email,
      date: u.created_at || ""
    }))
  });
});


app.post('/api/gs/auth/register', (req, res) => {
  const { name, email, password, confirm_password, phone, district } = req.body;
  
  if (!name || !email || !password || !confirm_password) {
    return res.status(400).json({ detail: "Sabhi details zaroori hain!" });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ detail: "Passwords match nahi ho rahe!" });
  }
  if (password.length < 6) {
    return res.status(400).json({ detail: "Password kam se kam 6 characters ka hona chahiye!" });
  }
  if (email === ADMIN_EMAIL) {
    return res.status(400).json({ detail: "This email is reserved!" });
  }
  if (usersCollection.findOne({ email })) {
    return res.status(400).json({ detail: "Email pehle se registered hai!" });
  }

  const userDoc = {
    name,
    email,
    password: hashPassword(password),
    phone: phone || "",
    district: district || "Patna",
    state: "Bihar",
    role: "user",
    created_at: new Date().toISOString(),
    is_active: true
  };

  usersCollection.insertOne(userDoc);
  const token = createToken({ sub: email, role: "user", exp: Date.now() + 1000 * 60 * 60 * 24 * 7 });
  
  res.json({
    message: "Registration successful!",
    token,
    user: { name, email, role: "user", district: userDoc.district }
  });
});

app.post('/api/gs/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: "Email aur Password likhein!" });
  }

  if (email === ADMIN_EMAIL) {
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ detail: "Galat password!" });
    }
    const token = createToken({ sub: email, role: "admin", exp: Date.now() + 1000 * 60 * 60 * 24 * 7 });
    return res.json({
      token,
      user: { name: ADMIN_NAME, email: ADMIN_EMAIL, role: "admin", district: "Bihar" }
    });
  }

  const user = usersCollection.findOne({ email });
  if (!user) {
    return res.status(404).json({ detail: "User nahi mila! Register karein." });
  }

  if (!verifyPassword(password, user.password)) {
    return res.status(401).json({ detail: "Galat password!" });
  }

  const token = createToken({ sub: email, role: user.role || "user", exp: Date.now() + 1000 * 60 * 60 * 24 * 7 });
  res.json({
    token,
    user: {
      name: user.name,
      email: user.email,
      role: user.role || "user",
      district: user.district || "Patna"
    }
  });
});

app.get('/api/gs/auth/me', (req, res) => {
  const current = getAuthUser(req);
  if (!current) {
    return res.status(401).json({ detail: "Not logged in!" });
  }

  if (current.role === 'admin') {
    return res.json({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: "admin",
      district: "Bihar"
    });
  }

  const user = usersCollection.findOne({ email: current.sub });
  if (!user) {
    return res.status(404).json({ detail: "User nahi mila!" });
  }

  res.json({
    name: user.name,
    email: user.email,
    role: user.role || "user",
    district: user.district || "Patna",
    phone: user.phone || ""
  });
});

app.post('/api/gs/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = usersCollection.findOne({ email });
  if (!user && email !== ADMIN_EMAIL) {
    return res.status(404).json({ detail: "Email nahi mila!" });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otpsCollection.updateOne(
    { email },
    {
      $set: {
        otp,
        expires: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
        used: false
      }
    },
    { upsert: true }
  );

  console.log(`[Gramin Saathi OTP] OTP for ${email}: ${otp}`);
  res.json({
    message: "OTP successfully generated! Check server logs.",
    otp_for_testing: otp
  });
});

app.post('/api/gs/auth/reset-password', (req, res) => {
  const { email, otp, new_password } = req.body;
  const otpDoc = otpsCollection.findOne({ email });
  
  if (!otpDoc) {
    return res.status(400).json({ detail: "OTP request nahi mili!" });
  }
  if (otpDoc.used) {
    return res.status(400).json({ detail: "OTP pehle se use ho chuka hai!" });
  }
  if (new Date() > new Date(otpDoc.expires)) {
    return res.status(400).json({ detail: "OTP expire ho chuka hai!" });
  }
  if (otpDoc.otp !== otp) {
    return res.status(400).json({ detail: "Galat OTP!" });
  }

  usersCollection.updateOne(
    { email },
    { $set: { password: hashPassword(new_password) } }
  );
  otpsCollection.updateOne({ email }, { $set: { used: true } });

  res.json({ message: "Password reset successful! Sign in again." });
});

// Weather API
app.get('/api/gs/weather/search/:city', async (req, res) => {
  const coords = await getCoordinates(req.params.city);
  if (!coords) {
    return res.json({ error: "Location coordinates nahi mile. Try another district." });
  }

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,weather_code,sunrise,sunset,uv_index_max&forecast_days=5&timezone=Asia%2FKolkata`;
    const wRes = await fetch(weatherUrl);
    const wData = await wRes.json();
    
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lon}&hourly=pm10,pm2_5,us_aqi&forecast_days=5&timezone=Asia%2FKolkata`;
    const aRes = await fetch(aqiUrl);
    const aData = await aRes.json();

    const forecast = [];
    const alerts = [];

    if (wData.daily) {
      const daily = wData.daily;
      const aqiHourly = aData.hourly || {};
      const usAqi = aqiHourly.us_aqi || [];
      const pm25 = aqiHourly.pm2_5 || [];
      
      for (let i = 0; i < 5; i++) {
        const rain = daily.precipitation_sum[i] || 0;
        const code = daily.weather_code[i] || 0;
        const idx = i * 24 + 12; // noon of each day
        const aqiVal = usAqi[idx] || 50;
        const pm25Val = pm25[idx] || 12;
        const [aqiLevel, aqiColor] = getAqiLevel(aqiVal);

        forecast.push({
          din: `Din ${i+1}`,
          date: daily.time[i],
          max_temp: `${daily.temperature_2m_max[i]}°C`,
          min_temp: `${daily.temperature_2m_min[i]}°C`,
          barish: `${Math.round(rain)}mm`,
          hawa: `${daily.wind_speed_10m_max[i]} km/h`,
          mausam: getWeatherDesc(code),
          sunrise: daily.sunrise[i] ? daily.sunrise[i].substring(11, 16) : "N/A",
          sunset: daily.sunset[i] ? daily.sunset[i].substring(11, 16) : "N/A",
          uv_index: daily.uv_index_max[i] || 0,
          aqi: aqiLevel,
          aqi_color: aqiColor,
          aqi_val: aqiVal,
          pm25: pm25Val
        });

        if (rain > 50) {
          alerts.push(`⚠️ Din ${i+1} (${daily.time[i]}): TEZ BARISH — ${Math.round(rain)}mm — Fasal dhak lo!`);
        }
      }
    }

    res.json({
      poora_naam: coords.fullName,
      forecast,
      alerts: alerts.length > 0 ? alerts : ["✅ Mausam normal hai — sab theek hai!"]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gs/weather/gps', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon" });

  try {
    const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const rRes = await fetch(revUrl, { headers: { 'User-Agent': 'GraminSaathi/2.0' } });
    const loc = await rRes.json();
    const addr = loc.address || {};
    const city = addr.village || addr.town || addr.city || addr.state_district || "Aapki Location";

    res.redirect(`/api/gs/weather/search/${encodeURIComponent(city)}`);
  } catch (e) {
    res.redirect(`/api/gs/weather/search/Patna`);
  }
});

// Fasal database
app.get('/api/gs/fasal/suggest', (req, res) => {
  const district = (req.query.district || "patna").toLowerCase();
  const dInfo = gsData.districtInfo[district] || { flood_risk: "medium", mitti: "domat" };
  
  const dateObj = new Date();
  const monthName = dateObj.toLocaleString('en-US', { month: 'long' }).toLowerCase();
  const mData = gsData.fasalDb[monthName] || gsData.fasalDb["april"];

  res.json({
    district: district.toUpperCase(),
    mitti: dInfo.mitti,
    flood_risk: dInfo.flood_risk,
    season: mData.season,
    current_month: monthName,
    abhi_ugayen: mData.fasalen,
    flood_safe_fasalen: gsData.floodSafe[dInfo.flood_risk] || []
  });
});

app.get('/api/gs/fasal/calendar/:crop', (req, res) => {
  const crop = req.params.crop.toLowerCase().trim();
  const calendar = [];
  
  for (const month in gsData.fasalDb) {
    const data = gsData.fasalDb[month];
    for (const f of data.fasalen) {
      if (f.naam.toLowerCase().includes(crop)) {
        calendar.push({
          mahina: month.toUpperCase(),
          status: f.status,
          paani: f.paani,
          khaad: f.khaad,
          tips: f.tips
        });
      }
    }
  }

  res.json(calendar);
});

// Flood Alerts API
app.get('/api/gs/flood/alert/:district', async (req, res) => {
  const dist = req.params.district.toLowerCase().trim();
  const dData = gsData.floodDb[dist] || { nadiyaan: ["Ganga"], flood_risk: "low", worst_flood: "N/A", evacuation_center: "N/A" };
  
  res.json({
    district: dist.toUpperCase(),
    nadiyaan: dData.nadiyaan,
    historical_risk: dData.flood_risk,
    worst_flood: dData.worst_flood,
    evacuation_center: dData.evacuation_center,
    helpline: "0612-2294204"
  });
});

app.get('/api/gs/flood/bihar-status', (req, res) => {
  const activeMonth = new Date().toLocaleString('en-US', { month: 'long' }).toLowerCase();
  const red = [], orange = [], green = [];

  for (const dist in gsData.floodDb) {
    const data = gsData.floodDb[dist];
    const inSeason = data.avg_flood_months.includes(activeMonth);
    if ((data.flood_risk === 'very_high' && inSeason) || (data.flood_risk === 'high' && inSeason)) {
      red.push(dist.toUpperCase());
    } else if (data.flood_risk === 'very_high' || data.flood_risk === 'high') {
      orange.push(dist.toUpperCase());
    } else {
      green.push(dist.toUpperCase());
    }
  }

  res.json({
    month: activeMonth,
    red_zone: red,
    orange_zone: orange,
    green_zone: green
  });
});

// Mandi rates (direct integration with fallback)
const AGMARKNET_API = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24";
const AGMARKNET_API_KEY = "579b464db66ec23bdd0000019fd095ef41fe4e92495ba3a3baeec6b4";

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function getSimilarity(s1, s2) {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function fuzzyMatch(query, text, threshold = 0.6) {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase().trim();
  if (!q || !t) return false;
  if (q === t || q.includes(t) || t.includes(q)) return true;

  const similarity = getSimilarity(q, t);
  if (similarity >= threshold) return true;

  const vars = gsData.variations || {};
  for (const [key, vals] of Object.entries(vars)) {
    const allVals = [key, ...vals];
    const qInGroup = allVals.some(v => q === v || q.includes(v));
    const tInGroup = allVals.some(v => t === v || t.includes(v));
    if (qInGroup && tInGroup) return true;
  }
  return false;
}

async function fetchAgmarknet(filters = {}, limit = 100) {
  try {
    const urlObj = new URL(AGMARKNET_API);
    urlObj.searchParams.append('api-key', AGMARKNET_API_KEY);
    urlObj.searchParams.append('format', 'json');
    urlObj.searchParams.append('limit', limit);
    urlObj.searchParams.append('offset', 0);

    if (filters.state) urlObj.searchParams.append('filters[State]', filters.state);
    if (filters.commodity) urlObj.searchParams.append('filters[Commodity]', filters.commodity);
    if (filters.district) urlObj.searchParams.append('filters[District]', filters.district);
    if (filters.arrival_date) urlObj.searchParams.append('filters[Arrival_Date]', filters.arrival_date);

    console.log(`Fetching from Agmarknet API: ${urlObj.toString()}`);
    const response = await fetch(urlObj.toString());
    const data = await response.json();
    return data.records || data.data || [];
  } catch (error) {
    console.error("Agmarknet Fetch API Error:", error);
    return [];
  }
}

function processMandiRecord(r) {
  const commodity = (r.commodity || "").trim();
  const hindi = gsData.fasalHindi[commodity] || commodity;
  const min_p = parseFloat(String(r.min_price || 0).replace(/,/g, "")) || 0;
  const max_p = parseFloat(String(r.max_price || 0).replace(/,/g, "")) || 0;
  const modal_p = parseFloat(String(r.modal_price || 0).replace(/,/g, "")) || 0;

  const msp = gsData.msp2025[commodity] || 0;
  let salah = "Bhav data nahi";
  let salah_type = "unknown";

  if (msp > 0 && modal_p > 0) {
    if (modal_p < msp) {
      salah = `⚠️ MSP (₹${msp}) se NEECHE — Sarkar se MSP maango!`;
      salah_type = "danger";
    } else if (modal_p > msp + 300) {
      salah = `✅ Bahut achha bhav — ABHI BECHO!`;
      salah_type = "great";
    } else {
      salah = "Theek bhav hai";
      salah_type = "ok";
    }
  }

  return {
    fasal: hindi,
    fasal_english: commodity,
    mandi: (r.market || "").trim(),
    district: (r.district || "").trim(),
    state: (r.state || "").trim(),
    variety: (r.variety || "FAQ").trim(),
    min_bhav: min_p ? `₹${Math.round(min_p)}` : "N/A",
    max_bhav: max_p ? `₹${Math.round(max_p)}` : "N/A",
    modal_bhav: modal_p ? `₹${Math.round(modal_p)}` : "N/A",
    modal_bhav_int: Math.round(modal_p),
    unit: "per quintal",
    date: (r.arrival_date || "").trim(),
    msp: msp ? `₹${msp}` : "MSP nahi",
    salah: salah,
    salah_type: salah_type
  };
}

app.get('/api/gs/mandi/live', async (req, res) => {
  const mandi = (req.query.mandi || "patna").toLowerCase();
  const fallbackMandiRates = {
    patna: [
      { crop: "Gehun (Wheat)", variety: "FAQ", min: 2275, max: 2450, trend: "up" },
      { crop: "Dhan (Common Paddy)", variety: "Common", min: 2300, max: 2350, trend: "stable" },
      { crop: "Makka (Maize)", variety: "FAQ", min: 2090, max: 2150, trend: "up" },
      { crop: "Aloo (Potato)", variety: "Local", min: 1200, max: 1400, trend: "down" },
      { crop: "Pyaaz (Onion)", variety: "Nasik", min: 2200, max: 2500, trend: "up" }
    ],
    gaya: [
      { crop: "Gehun (Wheat)", variety: "Desi", min: 2275, max: 2400, trend: "stable" },
      { crop: "Dhan (Common Paddy)", variety: "FAQ", min: 2300, max: 2340, trend: "stable" },
      { crop: "Sarson (Mustard)", variety: "Yellow", min: 5650, max: 5900, trend: "up" },
      { crop: "Aloo (Potato)", variety: "Local", min: 1100, max: 1300, trend: "down" }
    ],
    muzaffarpur: [
      { crop: "Gehun (Wheat)", variety: "Kalyan", min: 2275, max: 2480, trend: "up" },
      { crop: "Makka (Maize)", variety: "FAQ", min: 2090, max: 2200, trend: "up" },
      { crop: "Aloo (Potato)", variety: "FAQ", min: 1300, max: 1500, trend: "stable" },
      { crop: "Tamatar (Tomato)", variety: "Hybrid", min: 1500, max: 1800, trend: "down" }
    ]
  };

  try {
    let records = await fetchAgmarknet({ state: "Bihar", district: mandi.charAt(0).toUpperCase() + mandi.slice(1) }, 50);
    if (!records || records.length === 0) {
      records = await fetchAgmarknet({ state: "Bihar" }, 50);
    }
    if (!records || records.length === 0) {
      records = await fetchAgmarknet({}, 50);
    }

    if (!records || records.length === 0) {
      console.log("No Agmarknet records returned. Using fallback mock rates.");
      return res.json({
        mandi,
        records: fallbackMandiRates[mandi] || fallbackMandiRates.patna
      });
    }

    const processed = records.map(processMandiRecord);
    const formattedRecords = processed.map(p => {
      let trend = "stable";
      if (p.salah_type === "great") trend = "up";
      if (p.salah_type === "danger") trend = "down";
      return {
        crop: `${p.fasal} (${p.fasal_english})`,
        variety: p.variety,
        min: p.modal_bhav_int ? Math.round(p.modal_bhav_int * 0.9) : 2000,
        max: p.modal_bhav_int || 2200,
        trend: trend
      };
    });

    res.json({
      mandi,
      records: formattedRecords
    });
  } catch (err) {
    console.error("Error in mandi live endpoint:", err);
    res.json({
      mandi,
      records: fallbackMandiRates[mandi] || fallbackMandiRates.patna
    });
  }
});

app.get('/api/gs/mandi/search', async (req, res) => {
  const fasal = req.query.fasal;
  if (!fasal) {
    return res.status(400).json({ message: "Fasal parameter is required" });
  }

  try {
    const filters = {};
    let matchedAs = fasal;
    const fasal_lower = fasal.toLowerCase().trim();
    let eng = gsData.hindiToEnglish[fasal_lower];

    if (eng) {
      matchedAs = gsData.fasalHindi[eng] || eng;
    }

    if (!eng) {
      for (const [english_key, hindi_val] of Object.entries(gsData.fasalHindi)) {
        if (fuzzyMatch(fasal_lower, hindi_val.toLowerCase())) {
          eng = english_key;
          matchedAs = hindi_val;
          break;
        }
      }
    }

    if (!eng) {
      for (const english_key of Object.keys(gsData.fasalHindi)) {
        if (fuzzyMatch(fasal_lower, english_key.toLowerCase())) {
          eng = english_key;
          matchedAs = english_key;
          break;
        }
      }
    }

    if (eng) {
      filters.commodity = eng;
    }

    let records = await fetchAgmarknet(filters, 50);
    if (!records || records.length === 0) {
      records = await fetchAgmarknet({}, 150);
      records = records.filter(r => fuzzyMatch(fasal, r.commodity || ""));
    }

    const processed = records.map(processMandiRecord);
    res.json({
      searched: fasal,
      matched_as: matchedAs,
      total: processed.length,
      records: processed
    });
  } catch (err) {
    console.error("Error in mandi search endpoint:", err);
    res.status(500).json({ message: "Error performing search", records: [] });
  }
});

app.get('/api/gs/mandi/sabzi', async (req, res) => {
  const fallbackSabzi = [
    { naam: "Potato (आलू)", min_bhav: "₹1,200/qtl", max_bhav: "₹1,400/qtl", modal_bhav: "₹1,300/qtl", trend: "down", mandi: "Patna" },
    { naam: "Onion (प्याज़)", min_bhav: "₹2,200/qtl", max_bhav: "₹2,600/qtl", modal_bhav: "₹2,400/qtl", trend: "up", mandi: "Patna" },
    { naam: "Tomato (टमाटर)", min_bhav: "₹1,500/qtl", max_bhav: "₹1,800/qtl", modal_bhav: "₹1,650/qtl", trend: "down", mandi: "Muzaffarpur" },
    { naam: "Brinjal (बैंगन)", min_bhav: "₹1,800/qtl", max_bhav: "₹2,200/qtl", modal_bhav: "₹2,000/qtl", trend: "stable", mandi: "Gaya" }
  ];

  try {
    let records = await fetchAgmarknet({ state: "Bihar" }, 150);
    if (!records || records.length === 0) {
      records = await fetchAgmarknet({}, 150);
    }

    const allSabziRecords = [];
    for (const r of records) {
      const commodity = r.commodity || "";
      const isSabzi = gsData.sabziCommodities.some(sabzi => 
        fuzzyMatch(commodity.toLowerCase(), sabzi.toLowerCase()) ||
        fuzzyMatch(sabzi.toLowerCase(), commodity.toLowerCase())
      );
      if (isSabzi) {
        allSabziRecords.push(r);
      }
    }

    if (allSabziRecords.length === 0) {
      for (const sabzi_eng of gsData.sabziCommodities.slice(0, 4)) {
        const sabzi_records = await fetchAgmarknet({ commodity: sabzi_eng }, 10);
        allSabziRecords.push(...sabzi_records);
      }
    }

    if (allSabziRecords.length === 0) {
      return res.json(fallbackSabzi);
    }

    const processed = allSabziRecords.map(processMandiRecord);
    const sabziMap = {};
    for (const p of processed) {
      const naam = p.fasal;
      if (!sabziMap[naam] || p.modal_bhav_int > sabziMap[naam].modal_bhav_int) {
        sabziMap[naam] = p;
      }
    }

    const result = Object.entries(sabziMap).map(([naam, data]) => {
      let trend = "stable";
      const msp_val = gsData.msp2025[data.fasal_english] || 0;
      const modal = data.modal_bhav_int;
      if (msp_val > 0 && modal > 0) {
        if (modal < msp_val) trend = "down";
        else if (modal > msp_val + 300) trend = "up";
      }
      return {
        naam: `${naam} (${data.fasal_english})`,
        min_bhav: data.min_bhav,
        max_bhav: data.max_bhav,
        modal_bhav: data.modal_bhav,
        modal_bhav_int: modal,
        unit: data.unit,
        trend: trend,
        date: data.date,
        mandi: data.mandi,
        state: data.state
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Error in mandi sabzi endpoint:", err);
    res.json(fallbackSabzi);
  }
});

// User Crops tracking
app.get('/api/gs/crops/my', (req, res) => {
  const current = getAuthUser(req);
  if (!current) return res.status(401).json({ detail: "Auth required!" });

  const list = cropsCollection.find({ user_email: current.sub });
  res.json({ crops: list });
});

app.post('/api/gs/crops/add', (req, res) => {
  const current = getAuthUser(req);
  if (!current) return res.status(401).json({ detail: "Auth required!" });

  const { fasal_naam, district, area_acres, sowing_date, notes } = req.body;
  if (!fasal_naam || !sowing_date) {
    return res.status(400).json({ detail: "Fasal aur Sowing date zaroori hai!" });
  }

  // Create crop calendar
  const schedules = {
    "dhan": [
      { day: 7, task: "Pehli sinchai karo", icon: "💧", category: "sinchai" },
      { day: 15, task: "Nursery se transplant karo", icon: "🌱", category: "kaam" },
      { day: 30, task: "Pehli khaad (Urea) do", icon: "🌿", category: "khaad" },
      { day: 120, task: "KATAI KA TIME! Fasal kato", icon: "🌾", category: "katai" }
    ],
    "gehun": [
      { day: 3, task: "Pehli sinchai karo", icon: "💧", category: "sinchai" },
      { day: 20, task: "Khaad (DAP + Urea) do", icon: "🌿", category: "khaad" },
      { day: 115, task: "KATAI KA TIME! Gehun kato", icon: "🌾", category: "katai" }
    ]
  };

  const cropKey = fasal_naam.toLowerCase().trim();
  const tasks = schedules[cropKey] || [
    { day: 7, task: "Pehli sinchai", icon: "💧", category: "sinchai" },
    { day: 21, task: "Khaad do", icon: "🌿", category: "khaad" },
    { day: 90, task: "Katai ki taiyari", icon: "🌾", category: "katai" }
  ];

  const sowing = new Date(sowing_date);
  const calendar = tasks.map(t => {
    const taskDate = new Date(sowing.getTime() + t.day * 24 * 60 * 60 * 1000);
    return {
      date: taskDate.toISOString().substring(0, 10),
      day_from_sowing: t.day,
      task: t.task,
      icon: t.icon,
      category: t.category,
      done: false
    };
  });

  const cropDoc = {
    user_email: current.sub,
    fasal_naam,
    district: district || "Patna",
    area_acres: parseFloat(area_acres) || 1.0,
    sowing_date,
    notes: notes || "",
    added_at: new Date().toISOString(),
    calendar
  };

  cropsCollection.insertOne(cropDoc);
  res.json({ message: "Crop successfully registered!", crop: cropDoc });
});

app.delete('/api/gs/crops/delete/:id', (req, res) => {
  const current = getAuthUser(req);
  if (!current) return res.status(401).json({ detail: "Auth required!" });

  const result = cropsCollection.deleteOne({ _id: req.params.id, user_email: current.sub });
  if (result.deletedCount === 0) {
    return res.status(404).json({ detail: "Crop not found!" });
  }
  res.json({ message: "Crop deleted successfully!" });
});

app.post('/api/gs/crops/task-done', (req, res) => {
  const current = getAuthUser(req);
  if (!current) return res.status(401).json({ detail: "Auth required!" });

  const { crop_id, task_date } = req.body;
  const result = cropsCollection.updateOne(
    { _id: crop_id, user_email: current.sub, 'calendar.date': task_date },
    { $set: { 'calendar.$.done': true } }
  );

  res.json({ message: "Task marked done!" });
});

// Crop Companion Gemini Chatbot API
app.post('/api/gs/ai/chat', async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ answer: "Kuch poochhein! 😊" });

  const cleaned = question.toLowerCase().trim();
  
  // Custom simple responses for general questions to make it instantaneous
  if (cleaned.includes("namaste") || cleaned.includes("hello") || cleaned.includes("hi")) {
    return res.json({
      answer: "Namaskar! 🌿 Main aapka Gramin Saathi AI assistant hun. Main mausam, fasal, mandi rates, ya pashupalan par aapke sawalon ke jawab de sakta hun. Aaj main aapki kya madad karun?"
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY || 'AIzaSyAH995tMZRubTzPzQMyVh5Bc_6iXzItCLQ';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

  try {
    const payload = {
      contents: [{
        parts: [{
          text: `You are Gramin Saathi AI, an agricultural assistant helping farmers in Bihar. Provide answers in friendly Hinglish (Hindi written in English alphabets) with emoji. Keep it very clear and practical for a farmer. Answer this question: ${question}`
        }]
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    let answer = "Maaf kijiyega, main abhi response nahi kar pa raha hun. Thodi der baad koshish karein! 🌾";
    
    if (data.candidates && data.candidates.length > 0) {
      answer = data.candidates[0].content.parts[0].text;
    }
    
    res.json({ answer });
  } catch (err) {
    res.json({ answer: `Error: ${err.message}. Offline fallback: Mandi aur Mausam tabs check karein!` });
  }
});

// Serve local Gramin Saathi static page
app.use('/gramin_saathi', express.static(path.join(__dirname, 'gramin_saathi')));
app.get('/gramin_saathi/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'gramin_saathi', 'index.html'));
});

// Serve downloads directory statically
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Serve local Creative Editors Suite
app.use('/editor', express.static(path.join(__dirname, 'editor')));
app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, 'editor', 'hub.html'));
});
app.get('/editor/hub', (req, res) => {
  res.sendFile(path.join(__dirname, 'editor', 'hub.html'));
});
app.get('/editor/office', (req, res) => {
  res.sendFile(path.join(__dirname, 'editor', 'office.html'));
});
app.get('/editor/video', (req, res) => {
  res.sendFile(path.join(__dirname, 'editor', 'video.html'));
});

// Proxy Request helper
const http = require('http');

function proxyRequest(port, targetPath, req, res, next) {
  const headers = { ...req.headers };
  let bodyData = null;
  
  if (req.body && Object.keys(req.body).length > 0) {
    bodyData = JSON.stringify(req.body);
    headers['content-length'] = Buffer.byteLength(bodyData);
    headers['content-type'] = 'application/json';
  }

  const options = {
    hostname: 'localhost',
    port: port,
    path: targetPath,
    method: req.method,
    headers: headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`Proxy Request Error for path ${targetPath}:`, err.message);
    if (port === 3001) {
      const gsBuildPath = path.join(__dirname, '..', 'GraminSaathi', 'frontend', 'build');
      if (fs.existsSync(gsBuildPath)) {
        return express.static(gsBuildPath)(req, res, next);
      }
    }
    res.status(502).send('Bad Gateway (Dev server not running)');
  });

  if (bodyData !== null) {
    proxyReq.write(bodyData);
    proxyReq.end();
  } else {
    req.pipe(proxyReq, { end: true });
  }
}

// Serve static built files of Gramin Saathi React App OR proxy to React dev server on port 3001
app.use('/graminsaathi', (req, res, next) => {
  proxyRequest(3001, `/graminsaathi${req.url}`, req, res, next);
});

const gsBuildPath = path.join(__dirname, '..', 'GraminSaathi', 'frontend', 'build');

// Serve static frontend assets from the root workspace folder
app.use(express.static(__dirname));

// Serve the Downloads folder (ZIP files) as static assets
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Explicit routes for editor pages
app.get('/editor', (req, res) => res.sendFile(path.join(__dirname, 'editor', 'hub.html')));
app.get('/editor/', (req, res) => res.sendFile(path.join(__dirname, 'editor', 'hub.html')));
app.get('/editor/hub.html', (req, res) => res.sendFile(path.join(__dirname, 'editor', 'hub.html')));
app.get('/editor/office.html', (req, res) => res.sendFile(path.join(__dirname, 'editor', 'office.html')));
app.get('/editor/video.html', (req, res) => res.sendFile(path.join(__dirname, 'editor', 'video.html')));
app.get('/editor/style.css', (req, res) => res.sendFile(path.join(__dirname, 'editor', 'style.css')));
app.get('/editor/script.js', (req, res) => res.sendFile(path.join(__dirname, 'editor', 'script.js')));

// Explicit route for downloads page
app.get('/downloads.html', (req, res) => res.sendFile(path.join(__dirname, 'downloads.html')));

// ==========================================
// UNIFIED VIDEO EDITOR BACKEND API
// ==========================================
const multer = require('multer');

// Ensure uploads & exports directories exist
const uploadDir = path.join(__dirname, 'uploads');
const exportDir = path.join(__dirname, 'exports');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB file limit
});

// Serve uploads and exports statically
app.use('/uploads', express.static(uploadDir));
app.use('/exports', express.static(exportDir));

// Route for video file uploads
app.post('/api/video/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a file' });
  }
  res.status(200).json({
    success: true,
    file: {
      name: req.file.originalname,
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      size: req.file.size
    }
  });
});

// Route for server-side FFmpeg editing execution
app.post('/api/video/process', (req, res) => {
  const { clips, filter } = req.body;
  if (!clips || clips.length === 0) {
    return res.status(400).json({ success: false, message: 'No clips provided to process' });
  }

  const videoClip = clips.find(c => c.track === 'video');
  if (!videoClip) {
    return res.status(400).json({ success: false, message: 'No video track clip found to edit' });
  }

  const inputFilename = videoClip.path.split('/').pop();
  const inputPath = path.join(uploadDir, inputFilename);
  const outputFilename = `render_${Date.now()}_${inputFilename}`;
  const outputPath = path.join(exportDir, outputFilename);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ success: false, message: `Input file not found on server: ${inputFilename}` });
  }

  // Build FFmpeg command parameters
  let filterString = '';
  if (filter === 'grayscale') {
    filterString = '-vf "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3"';
  } else if (filter === 'sepia') {
    filterString = '-vf "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131"';
  }

  const speed = videoClip.speed || 1.0;
  let speedFilter = '';
  if (speed !== 1.0) {
    const vpts = 1.0 / speed;
    const atempo = speed;
    speedFilter = `-filter_complex "[0:v]setpts=${vpts}*PTS[v];[0:a]atempo=${atempo}[a]" -map "[v]" -map "[a]"`;
  }

  const duration = videoClip.duration || 10;
  const start = videoClip.start || 0;
  
  let ffmpegCommand = `ffmpeg -y -ss ${start} -t ${duration} -i "${inputPath}"`;
  if (speedFilter) {
    ffmpegCommand += ` ${speedFilter}`;
  } else {
    ffmpegCommand += ` ${filterString} -c:v libx264 -c:a aac -strict experimental`;
  }
  ffmpegCommand += ` "${outputPath}"`;

  console.log(`Executing main server FFmpeg: ${ffmpegCommand}`);

  const { exec } = require('child_process');
  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.warn(`FFmpeg failed: ${error.message}. Simulating fallback...`);
      return res.status(200).json({
        success: true,
        message: 'Video rendering simulated (FFmpeg not available on server)',
        downloadUrl: `/uploads/${inputFilename}`,
        filename: inputFilename
      });
    }

    res.status(200).json({
      success: true,
      message: 'Video processed successfully',
      downloadUrl: `/exports/${outputFilename}`,
      filename: outputFilename
    });
  });
});

// Default route redirects to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` Anita Technical Services - Web App Server Running`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` C++ backend evaluation path: /api/calculate`);
  console.log(`===================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} is already in use!`);
    console.error(`Please close any application running on port ${PORT} and restart, or run using another port:`);
    console.error(`  $env:PORT=3001; npm run dev\n`);
  } else {
    console.error('Server error:', err);
  }
});
