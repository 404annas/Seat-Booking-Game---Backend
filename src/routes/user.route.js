const express = require('express');
const UserRoute = express.Router();
const authMiddleware = require('../middleware/auth');
const UserController = require('../controllers/user.ctrl');

UserRoute.post('/register', UserController.register);
UserRoute.post('/login', UserController.login);
UserRoute.post('/request', authMiddleware, UserController.MakeRequest);
UserRoute.post('/create-payment-intent', authMiddleware, UserController.CreatePaymentIntent);
UserRoute.post('/process-payment', authMiddleware, UserController.ProcessPayment);
UserRoute.post('/select-seat', authMiddleware, UserController.SelectSeat);

module.exports = UserRoute;