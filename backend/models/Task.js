const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Task = mongoose.model('Task', taskSchema);

// Self-Healing Index Protocol: Drop all bad legacy unique indexes (user_1, title_1, etc.)
setTimeout(async () => {
  try {
    const indexes = await Task.collection.indexes();
    for (const idx of indexes) {
      if (idx.unique && idx.name !== '_id_') {
        await Task.collection.dropIndex(idx.name);
        console.log(`[DB] Dropped legacy unique index on tasks: ${idx.name}`);
      }
    }
  } catch { /* silent */ }
}, 3000);

module.exports = Task;
