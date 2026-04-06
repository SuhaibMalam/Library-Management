const { User } = require('../models');

exports.addUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const user = await User.create({ name, email, role });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
