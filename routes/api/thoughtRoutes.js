const router = require('express').Router();

// Import thought controller methods
const {
    getAllThoughts,
    getThoughtById,
    createThought,
    updateThought,
    deleteThought,
    addReaction,
    deleteReaction,
} = require('../../controllers/thought-controller');

// Get all thoughts. Create new thought
router.route('/')
    .get(getAllThoughts)
    .post(createThought);

// Get one thought by id. Update or delete thought
router.route('/:id')
    .get(getThoughtById)
    .put(updateThought)
    .delete(deleteThought);

// Create or delete reaction
router.route('/:thoughtId/reactions')
    .post(addReaction)
    .delete(deleteReaction);

module.exports = router;
