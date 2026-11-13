const { User, Thought } = require('../models');
const { HttpError, asyncRoute } = require('../utils/errors');
const { objectId, userCreate, userUpdate, pagination, escapeRegex, pageResult, publicUser } = require('../utils/validation');

const withDetails = (query) => query
  .populate({ path: 'friends', select: 'username createdAt' })
  .populate({ path: 'thoughts', select: 'username thoughtText createdAt' });

const getAllUsers = asyncRoute(async (req, res) => {
  const options = pagination(req.query);
  const filter = options.q ? { username: { $regex: escapeRegex(options.q), $options: 'i' } } : {};
  const [users, total] = await Promise.all([
    withDetails(User.find(filter).select('-__v').sort({ createdAt: -1, _id: -1 })
      .skip(options.skip).limit(options.limit)).lean(),
    User.countDocuments(filter)
  ]);
  res.json(pageResult(users.map(publicUser), total, options));
});

const getUserById = asyncRoute(async (req, res) => {
  objectId(req.params.id);
  const user = await withDetails(User.findById(req.params.id).select('-__v')).lean();
  if (!user) throw new HttpError(404, 'User not found');
  res.json(publicUser(user));
});

const createUser = asyncRoute(async (req, res) => {
  const user = await User.create(userCreate(req.body));
  res.status(201).json(publicUser(user));
});

const updateUser = asyncRoute(async (req, res) => {
  objectId(req.params.id);
  const user = await User.findByIdAndUpdate(req.params.id, { $set: userUpdate(req.body) }, { new: true, runValidators: true });
  if (!user) throw new HttpError(404, 'User not found');
  res.json(publicUser(user));
});

const deleteUser = asyncRoute(async (req, res) => {
  objectId(req.params.id);
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  // Username remains immutable so authored posts are unambiguous.
  const thoughtIds = (await Thought.find({ username: user.username }).select('_id').lean()).map((thought) => thought._id);
  await Thought.deleteMany({ username: user.username });
  await User.updateMany({}, { $pull: { friends: user._id, thoughts: { $in: thoughtIds } } });
  await User.deleteOne({ _id: user._id });
  res.json({ message: 'User and authored thoughts deleted', deletedId: user.id });
});

const addFriend = asyncRoute(async (req, res) => {
  const userId = objectId(req.params.userId, 'userId');
  const friendId = objectId(req.params.friendId, 'friendId');
  if (userId === friendId) throw new HttpError(422, 'Users cannot add themselves');
  if (!await User.exists({ _id: friendId })) throw new HttpError(404, 'Friend not found');
  const user = await User.findByIdAndUpdate(userId, { $addToSet: { friends: friendId } }, { new: true, runValidators: true });
  if (!user) throw new HttpError(404, 'User not found');
  res.json(publicUser(user));
});

const removeFriend = asyncRoute(async (req, res) => {
  const userId = objectId(req.params.userId, 'userId');
  const friendId = objectId(req.params.friendId, 'friendId');
  const user = await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } }, { new: true });
  if (!user) throw new HttpError(404, 'User not found');
  res.json(publicUser(user));
});

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser, addFriend, removeFriend };
