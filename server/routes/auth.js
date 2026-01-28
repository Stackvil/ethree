const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Fallback secret for development/debugging if env var fails
const JWT_SECRET = process.env.JWT_SECRET || 'ethree_fallback_secret_key_2024';
if (!process.env.JWT_SECRET) {
    console.warn('⚠️ WARNING: Using fallback JWT_SECRET. Please configure process.env.JWT_SECRET in production.');
}

// Middleware to check if user is admin
const verifyAdmin = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin privileges required' });
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        // Password hashing is handled by User model pre-save hook
        user = await User.create({ name, email, password, role: role || 'customer' });

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 */
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt for:', req.body.email);
        console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);

        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`Login failed: User not found for ${email}`);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log(`Login failed: Password mismatch for ${email}`);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
    }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Admin changes user password
 *     tags: [Auth]
 */
router.post('/change-password', verifyAdmin, async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.password = newPassword; // Will be hashed by pre-save
        await user.save();

        res.json({ message: `Password updated for ${email}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/auth/change-email:
 *   post:
 *     summary: Admin changes user email
 *     tags: [Auth]
 */
router.post('/change-email', verifyAdmin, async (req, res) => {
    try {
        const { currentEmail, newEmail } = req.body;

        // Find user by current email
        const user = await User.findOne({ email: currentEmail });
        if (!user) {
            return res.status(404).json({ message: 'User with current email not found' });
        }

        // Check if new email is already taken
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'New email is already in use' });
        }

        user.email = newEmail;
        await user.save();

        res.json({ message: `Email updated successfully for ${user.name}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send dummy OTP
 *     tags: [Auth]
 */
router.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    // In production, integrate SMS/Email provider here
    res.json({ message: 'OTP sent successfully (Dummy: 123456)', email });
});

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify dummy OTP and login
 *     tags: [Auth]
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp, name } = req.body;
        if (otp !== '123456') return res.status(400).json({ message: 'Invalid OTP' });

        let user = await User.findOne({ email });
        if (!user) {
            // For OTP users, we set a default random password or handle as special case. 
            // Setting a strong random password for now.
            const randomPass = Math.random().toString(36).slice(-8);
            user = await User.create({ name: name || 'User', email, password: randomPass, role: 'customer' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Auth]
 */
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
