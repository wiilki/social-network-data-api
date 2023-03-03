const { Thought, User } = require('../models');

const getAllThoughts = async (req, res) => {
    try {
        const thoughts = await Thought.find().populate({
            path: 'reactions',
            select: '-__v'
        }).select('-__v');
        res.json(thoughts);
    } catch (err) {
        console.log(err);
        res.status(400).json(err);
    }
};

const getThoughtById = async (req, res) => {
    try {
        const thought = await Thought.findById(req.params.id).populate({
            path: 'reactions',
            select: '-__v'
        }).select('-__v');
        if (!thought) {
            res.status(404).json({ message: 'No thought found with this id!' });
            return;
        }
        res.json(thought);
    } catch (err) {
        console.log(err);
        res.status(400).json(err);
    }
};

const createThought = async (req, res) => {
    try {
        const thought = await Thought.create(req.body);
        const user = await User.findByIdAndUpdate(
            req.body.userId,
            { $push: { thoughts: thought._id } },
            { new: true }
        );
        if (!user) {
            res.status(404).json({ message: 'No user found with this id!' });
            return;
        }
        res.json(thought);
    } catch (err) {
        console.log(err);
        res.status(400).json(err);
    }
};

const updateThought = async (req, res) => {
    try {
        const thought = await Thought.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!thought) {
            res.status(404).json({ message: 'No thought found with this id!' });
            return;
        }
        res.json(thought);
    } catch (err) {
        console.log(err);
        res.status(400).json(err);
    }
};

const deleteThought = async (req, res) => {
    try {
        const thought = await Thought.findByIdAndDelete(req.params.id);
        if (!thought) {
            res.status(404).json({ message: 'No thought found with this id!' });
            return;
        }
        await User.findByIdAndUpdate(
            thought.userId,
            { $pull: { thoughts: thought._id } }
        );
        res.json(thought);
    } catch (err) {
        console.log(err);
        res.status(400).json(err);
    }
};

const addReaction = async (req, res) => {
    try {
        const updatedThought = await Thought.findOneAndUpdate(
            { _id: req.params.thoughtId },
            { $push: { reactions: req.body } },
            { new: true, runValidators: true }
        );
        if (!updatedThought) {
            res.status(404).json({ message: 'No thought found with this id!' });
            return;
        }
        res.json(updatedThought);
    } catch (err) {
        console.log(err);
        res.status(400).json(err);
    }
};

const removeReaction = async (req, res) => {
    try {
        const updatedThought = await Thought.findOneAndUpdate(
            { _id: req.params.thoughtId },
            { $pull: { reactions: { reactionId: req.params.reactionId } } },
            { new: true }
        );
        if (!updatedThought) {
            res.status(404).json({ message: 'No thought found with this id!' });
            return;
        }
        res.json(updatedThought);
    } catch (err) {
        console.log(err);
        res.status(400).json(err);
    }
};

module.exports = {
    getAllThoughts,
    getThoughtById,
    createThought,
    updateThought,
    deleteThought,
    addReaction,
    removeReaction
};

