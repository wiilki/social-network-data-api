const { Schema, model } = require('mongoose');
const reactionSchema = require('./Reaction');
const thoughtSchema = new Schema({
  thoughtText: { type: String, required: true, trim: true, minlength: 1, maxlength: 280 },
  username: { type: String, required: true, trim: true, index: true },
  reactions: { type: [reactionSchema], default: [] }
}, { timestamps: true, toJSON: { virtuals: true } });
thoughtSchema.virtual('reactionCount').get(function () { return this.reactions.length; });
thoughtSchema.index({ createdAt: -1 });
module.exports = model('Thought', thoughtSchema);
