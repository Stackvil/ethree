const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { auth, admin } = require('../middleware/auth');

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 */
// Initial Seeding Logic (Run on request to ensure serverless execution)
let isSeeded = false;

const seedInitialData = async () => {
    try {
        console.log('☢️ NUCLEAR SYNC START: Purging all database records...');

        try {
            await Product.collection.drop();
            console.log('✅ Collection dropped successfully.');
        } catch (e) {
            console.log('ℹ️ Collection did not exist or drop failed, proceeding to deleteMany');
            await Product.deleteMany({});
        }

        const countAfterPurge = await Product.countDocuments();
        console.log(`🧹 DB Count after purge: ${countAfterPurge}`);

        console.log('🚀 SEEDING v3.4: Injecting fresh ride data...');

        const initialRides = [
            { id: '19', name: 'Combo Adult (6 Rides)', price: 500, description: '6 Rides for Adults.', image: 'combo adult/E4LOGO.jpeg', category: 'play', version: '3.4' },
            { id: '20', name: 'Combo Child (6 Rides)', price: 500, description: '6 Rides for Children.', image: 'combo child/E4LOGO.jpeg', category: 'play', version: '3.4' },
            { id: '1', name: 'Balloon Shooting', price: 100, description: 'Aim and fire to win prizes.', image: 'baloon shooting/IMG_8435.jpg', category: 'play', version: '3.4' },
            { id: '2', name: 'Bouncy', price: 100, description: 'Safe inflatable fun for kids.', image: 'bouncy/WhatsApp_Image_2025-06-14_at_4.02.45_PM.jpeg', category: 'play', version: '3.4' },
            { id: '3', name: 'Bull Ride', price: 100, description: 'Test your strength and balance.', image: 'bull ride/IMG_8384.jpg', category: 'play', version: '3.4' },
            { id: '4', name: 'Bumping Cars Double', price: 200, description: 'Classic favorite for two players.', image: 'bumping cars double/Bumper_Cars_9944_14762891777.jpg', category: 'play', version: '3.4' },
            { id: '5', name: 'Bumping Cars Single', price: 150, description: 'Fun-filled solo driving experience.', image: 'bumping cars single/IMG_8417.jpg', category: 'play', version: '3.4' },
            { id: '6', name: 'Columbus Mini', price: 100, description: 'Mini swinging adventure boat.', image: 'columbus mini/IMG_8407.jpg', category: 'play', version: '3.4' },
            { id: '7', name: 'Free Fall', price: 100, description: 'Thrilling vertical drop experience.', image: 'free fall/IMG_8381.jpg', category: 'play', version: '3.4' },
            { id: '8', name: 'Joker Ride', price: 100, description: 'Fun and laughter on this kid-friendly ride.', image: 'joker ride/IMG_8400.jpg', category: 'play', version: '3.4' },
            { id: '9', name: 'Paddle Boat', price: 100, description: 'Relaxing water adventure.', image: 'paddle boat/paddle-boat.webp', category: 'play', version: '3.4' },
            { id: '10', name: 'Soft Play', price: 100, description: 'Colorful indoor play area for toddlers.', image: 'soft play/WhatsApp_Image_2025-06-14_at_4.04.52_PM_1.jpeg', category: 'play', version: '3.4' },
            { id: '11', name: 'Sun & Moon', price: 100, description: 'Magical rotating sky adventure.', image: 'sun & moon/IMG_8389.jpg', category: 'play', version: '3.4' },
            { id: '12', name: 'Track Train', price: 100, description: 'A delightful journey for the little ones.', image: 'train ticket/IMG_8410.jpg', category: 'play', version: '3.4' },
            { id: '13', name: 'Trampoline', price: 100, description: 'Bounce away all your energy.', image: 'trampoline/trampoline.webp', category: 'play', version: '3.4' },
            { id: '14', name: '360 Cycle', price: 100, description: 'Thrilling 360-degree cycling experience.', image: '360 cycle/360-degree-cycle-500x500.webp', category: 'play', version: '3.4' },
            { id: '15', name: 'Basket Ball', price: 50, description: 'Shoot hoops and win scores.', image: 'basket ball/images.jpg', category: 'play', version: '3.4' },
            { id: '16', name: 'Bungee Jump', price: 150, description: 'Bungee jumping trampoline for kids.', image: 'Bungee jump/bungee-jumping-trampoline.jpeg', category: 'play', version: '3.4' },
            { id: '17', name: 'Free Ride', price: 0, description: 'Complimentary ride experience.', image: 'free ride/images (1).jpg', category: 'play', version: '3.4' },
            { id: '18', name: 'Mini Wheel Ride', price: 100, description: 'Small ferris wheel for younger kids.', image: 'mini wheel ride/1.avif', category: 'play', version: '3.4' }
        ];

        // Use bulk operations or loop with upsert to ensure existing rides are updated
        for (const ride of initialRides) {
            await Product.findOneAndUpdate(
                { id: ride.id },
                { $set: ride },
                { upsert: true, new: true }
            );
        }
        console.log('Successfully synchronized v3.4 individual ride prices.');
        isSeeded = true;
    } catch (e) {
        console.error('Failed to seed rides', e);
    }
};

router.get('/', async (req, res) => {
    try {
        if (!isSeeded) {
            await seedInitialData();
        }
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a product (Admin only - HOTFIX: Open for now)
 *     tags: [Products]
 */
router.post('/', async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/products/force-reset:
 *   get:
 *     summary: Manually force database re-seeding (Nuclear Option)
 *     tags: [Products]
 */
router.get('/force-reset', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        console.log('Force Reset Triggered');
        await seedInitialData();
        const count = await Product.countDocuments();
        res.json({ message: 'Database forcefully reset to defaults.', productCount: count, timestamp: new Date().toISOString() });
    } catch (err) {
        console.error('Reset Failed:', err);
        res.status(500).json({ message: err.message, stack: err.stack });
    }
});

router.get('/debug-db', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
        const count = await Product.countDocuments();
        const products = await Product.find({}, 'name price id').limit(5);
        res.json({
            status: 'Connected',
            dbName: mongoose.connection.name,
            host: mongoose.connection.host,
            productCount: count,
            sample: products,
            time: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/products/:id:
 *   put:
 *     summary: Update a product (Admin only - HOTFIX: Open for now)
 *     tags: [Products]
 */
router.put('/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/products/:id:
 *   delete:
 *     summary: Delete a product (Admin only - HOTFIX: Open for now)
 *     tags: [Products]
 */
router.delete('/:id', async (req, res) => {
    try {
        const success = await Product.findByIdAndDelete(req.params.id);
        if (!success) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
