const jwt = require('jsonwebtoken');
// const logger = require('../helper/logger');
 
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
 
  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }
 
  try {
    const decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // logger.error(`Error while verifying token. Error: ${err.message}. File: authenticateToken-authenticateToken`);
    console.error('JWT verification error:', err.message);
    
    // More specific error messages
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 'error',
        message: 'Token has expired' 
      });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        status: 'error',
        message: 'Invalid token format' 
      });
    } else {
      return res.status(403).json({ 
        status: 'error',
        message: 'Token verification failed' 
      });
    }
  }

}
 
module.exports = authenticateToken;