const { Schema, model } = require('mongoose');
const Thought = require('./Thought');
const dateFormat = require('../utils/dateFormat');

const userSchema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/.+@.+\..+/, 'Please enter a valid email address']
    },
    thoughts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Thought'
      }
    ],
    friends: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    toJSON: {
      virtuals: true,
      getters: true
    },
    id: false
  }
);

userSchema.virtual('friendCount').get(function () {
  return this.friends.length;
});

userSchema.pre('findOneAndUpdate', async function (next) {
  const updatedUser = await this.model.findOne(this.getFilter());
  updatedUser.friendCount = updatedUser.friends.length;
  await updatedUser.save();
  next();
});

userSchema.pre('remove', async function (next) {
  await Thought.deleteMany({ _id: { $in: this.thoughts } });
  next();
});


const User = model('User', userSchema);

module.exports = User;
