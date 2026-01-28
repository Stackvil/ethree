const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock DB Initializer log
const mongoose = require('mongoose');

// Database Connection (Cached for Serverless)
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        cached.promise = mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, opts).then((mongoose) => {
            console.log(' New MongoDB Connection Established');
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
};

// Ensure DB is connected for every request in serverless environment
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database Connection Failed:', error);
        res.status(500).json({ error: 'Database Connection Failed' });
    }
});

// Import Routes from the server directory
const authRoutes = require('../server/routes/auth');
const productRoutes = require('../server/routes/products');
const orderRoutes = require('../server/routes/orders');
const bookingRoutes = require('../server/routes/bookings');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bookings', bookingRoutes);

// Root Route
app.get('/api', (req, res) => {
    res.send('Ethree Express API is running on Vercel.');
});

// Export the app for Vercel
module.exports = app;
