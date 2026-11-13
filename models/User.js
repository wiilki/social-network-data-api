const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 24, match: /^[a-zA-Z0-9_]+$/ },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, select: false, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  thoughts: [{ type: Schema.Types.ObjectId, ref: 'Thought' }],
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform(doc, ret) { delete ret.email; delete ret.__v; return ret; } }
});
userSchema.virtual('friendCount').get(function () { return this.friends.length; });
userSchema.virtual('thoughtCount').get(function () { return this.thoughts.length; });
module.exports = model('User', userSchema);
