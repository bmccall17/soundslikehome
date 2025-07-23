// Simple session storage for serverless functions
const sessions = new Map();

// Admin authentication middleware
function requireAuth(req, res, next) {
    // Check for session in different ways depending on the request type
    let authenticated = false;
    
    if (req.session && req.session.authenticated) {
        authenticated = true;
    }
    
    if (authenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
}

// Check admin password
function checkAdminPassword(password) {
    return password === (process.env.ADMIN_PASSWORD || 'welcomeadmin');
}

module.exports = {
    requireAuth,
    checkAdminPassword,
    sessions
};