const { Schema, Types } = require('mongoose');
module.exports = new Schema({
  reactionId: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
  reactionBody: { type: String, required: true, trim: true, minlength: 1, maxlength: 280 },
  username: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });
