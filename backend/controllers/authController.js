const bcrypt = require('bcryptjs');
const { User } = require('../models');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const registerUser = async (req, res) => {
    try {
        const { name, email, password, role: explicitRole } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Auto-detect role: @smartbus.com emails → conductor, others → passenger
        const isStaffEmail = email.toLowerCase().endsWith('@smartbus.com');
        let role = explicitRole;
        if (!role) {
            role = isStaffEmail ? 'conductor' : 'passenger';
        }

        const user = await User.create({ name, email, password, role });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ where: { email } });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
const getConductors = async (req, res) => {
    try {
        const conductors = await User.findAll({ 
            where: { role: 'conductor' },
            attributes: { exclude: ['password'] }
        });
        // Add _id mapping to make it compatible with existing frontend code
        const formattedConductors = conductors.map(c => ({
            ...c.toJSON(),
            _id: c.id
        }));
        res.json(formattedConductors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, getConductors };
