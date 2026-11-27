const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    uid:    { type: String, required: true, index: true },
    title:  { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
