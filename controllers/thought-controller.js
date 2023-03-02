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


