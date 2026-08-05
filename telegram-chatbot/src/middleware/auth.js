const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // Check for session-based auth (dashboard)
  if (req.session && req.session.isAuthenticated) {
    return next();
  }

  // Check for JWT token (API)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  // Redirect to login for dashboard routes
  if (req.path.startsWith('/dashboard')) {
    return res.redirect('/login');
  }

  return res.status(401).json({ error: 'Authentication required' });
}

module.exports = { authMiddleware };