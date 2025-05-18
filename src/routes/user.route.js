const express = require('express');
const UserRoute = express.Router();
const authMiddleware = require('../middleware/auth');
const UserController = require('../controllers/user.ctrl');

UserRoute.post('/register', UserController.register);
UserRoute.post('/login', UserController.login);
UserRoute.post('/forgot-password', UserController.forgotPassword);
UserRoute.post('/verify-otp', UserController.verifyOTP);
UserRoute.post('/reset-password', UserController.resetPassword);
UserRoute.post('/request', authMiddleware, UserController.MakeRequest);
UserRoute.post('/create-payment-intent', authMiddleware, UserController.CreatePaymentIntent);
UserRoute.post('/process-payment', authMiddleware, UserController.ProcessPayment);
UserRoute.post('/test-book-seat', authMiddleware, UserController.TestBookSeat); // Test route for direct booking
UserRoute.post('/select-seat', authMiddleware, UserController.SelectSeat);
UserRoute.put('/update-profile', authMiddleware, UserController.UpdateProfile);

module.exports = UserRoute;