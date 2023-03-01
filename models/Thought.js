const { Schema, model } = require('mongoose');

const thoughtSchema = new Schema({
  thoughtText: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 280,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    get: (createdAtVal) => {
      return new Date(createdAtVal).toISOString();
    },
  },
  username: {
    type: String,
    required: true,
  },
  reactions: [{
    type: Schema.Types.ObjectId,
    ref: 'Reaction',
  }],
}, {
  toJSON: {
    virtuals: true,
    getters: true,
  },
  id: false,
});

thoughtSchema.virtual('reactionCount').get(function () {
  return this.reactions.length;
});

const Thought = model('Thought', thoughtSchema);

module.exports = Thought;
