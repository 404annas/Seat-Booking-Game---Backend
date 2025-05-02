const axios = require('axios');
const PaymentModel = require('../models/payment.model');

class PaymentService {
  static async createPaymentIntent(amount, seatId, gameId) {
    try {
      // Create a payment intent with SwipeSimple
      const response = await axios.post('https://api.swipesimple.com/v1/transactions', {
        amount: amount * 100, // Convert to cents
        currency: process.env.SWIPESIMPLE_CURRENCY || 'USD',
        description: `Seat booking for game ${gameId}`,
        metadata: {
          seatId: seatId,
          gameId: gameId
        }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.SWIPESIMPLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        client_secret: response.data.transaction_id,
        amount: amount
      };
    } catch (error) {
      throw new Error(`Payment creation failed: ${error.message}`);
    }
  }

  static async recordPayment(userId, amount, transactionId, seatId, gameId) {
    try {
      // Record the payment in our database
      const payment = new PaymentModel({
        userId,
        amount,
        method: 'credit_card',
        transactionId: transactionId,
        status: 'completed',
        adminAccountId: process.env.SWIPESIMPLE_MERCHANT_ID,
        adminEmail: process.env.ADMIN_PAYMENT_EMAIL,
        seatId,
        gameId
      });
      await payment.save();
      return payment;
    } catch (error) {
      throw new Error(`Payment recording failed: ${error.message}`);
    }
  }

  static async confirmPaymentIntent(transactionId) {
    try {
      const response = await axios.get(`https://api.swipesimple.com/v1/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.SWIPESIMPLE_API_KEY}`
        }
      });

      if (response.data.status !== 'completed') {
        throw new Error('Payment not completed');
      }

      return response.data;
    } catch (error) {
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }
}

module.exports = PaymentService;