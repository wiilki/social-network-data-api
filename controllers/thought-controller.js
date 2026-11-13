const { Thought, User } = require('../models');
const { HttpError, asyncRoute } = require('../utils/errors');
const { objectId, thoughtCreate, thoughtUpdate, reactionCreate, pagination, escapeRegex, pageResult, publicThought } = require('../utils/validation');

const getAllThoughts = asyncRoute(async (req, res) => {
  const options = pagination(req.query);
  const filter = options.q ? { thoughtText: { $regex: escapeRegex(options.q), $options: 'i' } } : {};
  const [thoughts, total] = await Promise.all([
    Thought.find(filter).select('-__v').sort({ createdAt: -1, _id: -1 }).skip(options.skip).limit(options.limit).lean(),
    Thought.countDocuments(filter)
  ]);
  res.json(pageResult(thoughts.map(publicThought), total, options));
});

const getThoughtById = asyncRoute(async (req, res) => {
  objectId(req.params.id);
  const thought = await Thought.findById(req.params.id).select('-__v').lean();
  if (!thought) throw new HttpError(404, 'Thought not found');
  res.json(publicThought(thought));
});

const createThought = asyncRoute(async (req, res) => {
  const payload = thoughtCreate(req.body);
  const user = await User.findOne({ username: payload.username });
  if (!user) throw new HttpError(404, 'Create the author user before posting a thought');
  const thought = await Thought.create(payload);
  try {
    const result = await User.updateOne({ _id: user._id }, { $addToSet: { thoughts: thought._id } });
    if (!result.matchedCount) throw new HttpError(409, 'Author no longer exists');
  } catch (error) {
    await Thought.deleteOne({ _id: thought._id });
    throw error;
  }
  res.status(201).json(publicThought(thought));
});

const updateThought = asyncRoute(async (req, res) => {
  objectId(req.params.id);
  const thought = await Thought.findByIdAndUpdate(req.params.id, { $set: thoughtUpdate(req.body) }, { new: true, runValidators: true });
  if (!thought) throw new HttpError(404, 'Thought not found');
  res.json(publicThought(thought));
});

const deleteThought = asyncRoute(async (req, res) => {
  objectId(req.params.id);
  const thought = await Thought.findByIdAndDelete(req.params.id);
  if (!thought) throw new HttpError(404, 'Thought not found');
  await User.updateMany({ thoughts: thought._id }, { $pull: { thoughts: thought._id } });
  res.json({ message: 'Thought deleted', deletedId: thought.id });
});

const addReaction = asyncRoute(async (req, res) => {
  const thoughtId = objectId(req.params.thoughtId, 'thoughtId');
  const payload = reactionCreate(req.body);
  if (!await User.exists({ username: payload.username })) throw new HttpError(404, 'Reaction author not found');
  const thought = await Thought.findByIdAndUpdate(thoughtId, { $push: { reactions: payload } }, { new: true, runValidators: true });
  if (!thought) throw new HttpError(404, 'Thought not found');
  res.status(201).json(publicThought(thought));
});

const removeReaction = asyncRoute(async (req, res) => {
  const thoughtId = objectId(req.params.thoughtId, 'thoughtId');
  const reactionId = objectId(req.params.reactionId, 'reactionId');
  const thought = await Thought.findOneAndUpdate(
    { _id: thoughtId, 'reactions.reactionId': reactionId },
    { $pull: { reactions: { reactionId } } },
    { new: true }
  );
  if (!thought) {
    if (!await Thought.exists({ _id: thoughtId })) throw new HttpError(404, 'Thought not found');
    throw new HttpError(404, 'Reaction not found');
  }
  res.json(publicThought(thought));
});

module.exports = { getAllThoughts, getThoughtById, createThought, updateThought, deleteThought, addReaction, removeReaction };
