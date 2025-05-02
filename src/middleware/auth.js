//auth middleware with role based access control
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model'); // Assuming you have a User model

const authMiddleware = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
    req.user = decoded; // Attach user info to request object

    // Check if user exists in the database
    const user = await UserModel.findById(decoded._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authMiddleware;