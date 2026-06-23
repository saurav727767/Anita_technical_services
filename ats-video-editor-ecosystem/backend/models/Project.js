const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Untitled Video Project' },
  timeline: {
    tracks: {
      video: { type: Array, default: [] },
      audio: { type: Array, default: [] },
      text: { type: Array, default: [] }
    }
  },
  duration: { type: Number, default: 0 },
  driveFileId: { type: String }, // Backed up file ID on Google Drive
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ProjectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Project', ProjectSchema);
