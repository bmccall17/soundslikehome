const session = require('express-session');
const { checkAdminPassword } = require('../../lib/auth');

// Configure session for serverless
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'sounds-like-home-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
};

// POST /api/admin/login - Admin authentication
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { password } = req.body;
        
        if (checkAdminPassword(password)) {
            // Set up session
            if (!req.session) {
                req.session = {};
            }
            req.session.authenticated = true;
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Invalid password' });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
}