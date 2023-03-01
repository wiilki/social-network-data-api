const router = require('express').Router();

// Import user controller methods
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    addFriend,
    removeFriend,
} = require('../../controllers/user-controller');

// Get all users. Create new user
router
    .route('/')
    .get(getAllUsers)
    .post(createUser);

// Get one user by id. Update or delete user
router
    .route('/:id')
    .get(getUserById)
    .put(updateUser)
    .delete(deleteUser);

module.exports = router;
