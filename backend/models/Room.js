const mongoose = require('mongoose');

// Members are embedded (max 50) so a room loads in one read. Never store emails here.
const memberSchema = new mongoose.Schema(
  {
    uid:            { type: String, required: true },
    name:           { type: String, default: '' },
    photoURL:       { type: String, default: '' },
    githubUsername: { type: String, default: '' },
    joinedAt:       { type: Date, default: Date.now },
    lastSeen:       { type: Date, default: null },
    status:         { type: String, default: '', maxlength: 80 },
    focusUntil:     { type: Date, default: null },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    code:     { type: String, required: true, unique: true },
    name:     { type: String, required: true, maxlength: 40 },
    emoji:    { type: String, default: '🚀' },
    color:    { type: String, default: 'accent' },
    ownerUid: { type: String, required: true },
    members:  { type: [memberSchema], default: [] },
    timer:    { type: new mongoose.Schema({ startedAt: Date, minutes: Number, startedBy: String, label: String }, { _id: false }), default: null },
    playlist: { type: new mongoose.Schema({ id: String, name: String, image: String, setBy: String }, { _id: false }), default: null },
  },
  { timestamps: true }
);
roomSchema.index({ 'members.uid': 1 });

module.exports = mongoose.model('Room', roomSchema);
