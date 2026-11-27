const mongoose = require('mongoose');

const kudosSchema = new mongoose.Schema({
  roomCode:  { type: String, required: true },
  itemUrl:   { type: String, required: true },
  fromUid:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
kudosSchema.index({ roomCode: 1, itemUrl: 1, fromUid: 1 }, { unique: true }); // one per user per item

module.exports = mongoose.model('Kudos', kudosSchema);
