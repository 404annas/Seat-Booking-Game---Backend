const UserModel = require('../models/user.model');
const RequestModel = require('../models/request.model');
const GameModel = require('../models/game.model');
const SeatModel = require('../models/seat.model');
const PaymentService = require('../services/payment.service');
const axios = require('axios');

const UserController = {
  register : async (req,res) =>{
    const {username, password, email , role } = req.body;
    if( !username || !password || !email || !role ){
      return res.status(400).json({message: "Please fill all the fields"});
    }
    try {
      const User = await UserModel.findOne({username});
      if(User){
        return res.status(400).json({message: "User already exists"});
      }

      const newUser = new UserModel({
        username,
        password,
        email,
        role
      });
      await newUser.save();
      return res.status(201).json({message: "User created successfully"});
    } catch (error) {
      return res.status(500).json({message: "Internal server error"});
    }
  },
  login : async (req,res) =>{
     const {username, password ,role} = req.body;
     if(!username || !password || !role ){
      return res.status(400).json({message: "Please fill all the fields"});
     }
    try {

      if(role !== 'user' && role !== 'admin'){
        return res.status(400).json({message: "Invalid role"});
      }

    if(role === 'admin'){
      const admin = await UserModel.findOne({username, role});
      if(!admin){
        return res.status(400).json({message: "Admin not found"});
      }
      const isMatch = await admin.comparePassword(password);
      if(!isMatch){
        return res.status(400).json({message: "Invalid credentials"});
      }
      const token = admin.generateAuthToken();
      return res.status(200).json({token, user:{id: admin._id, username: admin.username, email: admin.email, role: admin.role}});
    }

    const user = await UserModel.findOne({username});
    if(!user){
      return res.status(400).json({message: "User not found"});
    }
    const isMatch = await user.comparePassword(password);
    if(!isMatch){
      return res.status(400).json({message: "Invalid credentials"});
    }
    const token = user.generateAuthToken();
    return res.status(200).json({token, user:{id: user._id, username: user.username, email: user.email, role: user.role}});
      
    } catch (error) {
      console.error(error);
      return res.status(500).json({message: "Internal server error"});
    }
  },
  MakeRequest : async (req,res) =>{
   const {gameId} = req.body;
    const userId = req.user._id;
    if(!gameId){
      return res.status(400).json({message: "Please fill all the fields"});
    }
    try {
      const request = await RequestModel.findOne({userId, gameId});
      if(request){
        return res.status(400).json({message: "Request already exists"});
      }

      const newRequest = new RequestModel({
        userId,
        gameId
      });

      if(!newRequest){
        return res.status(400).json({message: "Request not created"});
      }

      await newRequest.save();

      const game = await GameModel.findById(gameId);
      if(!game){
        return res.status(400).json({message: "Game not found"});
      }
      game.Pending_Requests.push(newRequest._id);
      await game.save();
      return res.status(201).json({message: "Request created successfully"});
      
    } catch (error) {
      return res.status(500).json({message: "Internal server error"});
    }
  },
  CreatePaymentIntent: async (req, res) => {
    const { gameId, seatNumber } = req.body;
    console.log('Received gameId:', gameId);
    console.log('Received seatNumber:', seatNumber, 'Type:', typeof seatNumber);
    try {
      const game = await GameModel.findById(gameId).populate('seats');
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      if (game.status === 'ended') {
        return res.status(400).json({ message: "Game has already ended" });
      }

      console.log('Found game:', game);
      console.log('Game seats:', JSON.stringify(game.seats, null, 2));
      
      // Log each seat's number and type for debugging
      game.seats.forEach(seat => {
        console.log(`Seat ${seat._id}:`, {
          seatNumber: seat.seatNumber,
          type: typeof seat.seatNumber
        });
      });

      const seat = game.seats.find(seat => {
        console.log(`Comparing: ${seat.seatNumber} (${typeof seat.seatNumber}) === ${seatNumber} (${typeof seat.seatNumber})`);
        return seat.seatNumber === Number(seatNumber);
      });

      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }

      if (seat.isOccupied) {
        return res.status(400).json({ message: "Seat is already occupied" });
      }

      const paymentIntent = await PaymentService.createPaymentIntent(seat.price, seat._id, gameId);
      
      return res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        amount: seat.price
      });
    } catch (error) {
      console.error('Error in CreatePaymentIntent:', error);
      return res.status(500).json({ message: "Failed to create payment intent" });
    }
  },

  SelectSeat: async (req, res) => {
    const { gameId, seatNumber, paymentIntentId } = req.body;
    const userId = req.user._id;

    if (!gameId || !seatNumber || !paymentIntentId) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    try {
      const game = await GameModel.findOne({ gameId }).populate('seats');
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      if (game.status === 'ended') {
        return res.status(400).json({ message: "Game has already ended" });
      }

      // Find the selected seat
      const seat = game.seats.find(seat => seat.seatNumber === seatNumber);
      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }

      if (seat.isOccupied) {
        return res.status(400).json({ message: "Seat is already occupied" });
      }

      // Confirm payment intent first
      try {
        await PaymentService.confirmPaymentIntent(paymentIntentId);
        await PaymentService.recordPayment(userId, seat.price, paymentIntentId, seat._id, gameId);
      } catch (error) {
        return res.status(400).json({ message: "Payment failed: " + error.message });
      }

      // Update seat status
      await SeatModel.findByIdAndUpdate(seat._id, {
        isOccupied: true,
        userId: userId,
        BookedAt: new Date()
      });

      // Check if all seats are occupied
      const updatedGame = await GameModel.findOne({ gameId }).populate('seats');
      const allSeatsOccupied = updatedGame.seats.every(seat => seat.isOccupied);
      if (allSeatsOccupied) {
        updatedGame.status = 'ended';
        await updatedGame.save();
      }

      return res.status(200).json({
        message: "Seat booked successfully",
        seat: await SeatModel.findById(seat._id),
        gameStatus: updatedGame.status
      });

    } catch (error) {
      console.error('Error in SelectSeat:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  ProcessPayment: async (req, res) => {
    const { transactionId, cardDetails } = req.body;
    const userId = req.user._id;

    if (!transactionId || !cardDetails) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Validate card details
    if (!cardDetails.number || !/^\d{16}$/.test(cardDetails.number.replace(/\s/g, ''))) {
      return res.status(400).json({ message: "Invalid card number" });
    }
    if (!cardDetails.expiry || !/^\d{4}$/.test(cardDetails.expiry)) {
      return res.status(400).json({ message: "Invalid expiry date" });
    }
    if (!cardDetails.cvc || !/^\d{3}$/.test(cardDetails.cvc)) {
      return res.status(400).json({ message: "Invalid CVC" });
    }

    try {
      // Process payment with SwipeSimple
      const response = await axios.post('https://api.swipesimple.com/v1/transactions/process', {
        transaction_id: transactionId,
        card: {
          number: cardDetails.number,
          expiry: cardDetails.expiry,
          cvc: cardDetails.cvc
        }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.SWIPESIMPLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status === 'completed') {
        return res.status(200).json({
          status: 'success',
          message: 'Payment processed successfully'
        });
      } else {
        return res.status(400).json({
          status: 'failed',
          message: 'Payment processing failed'
        });
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      return res.status(500).json({
        status: 'failed',
        message: error.response?.data?.message || 'Failed to process payment'
      });
    }
  }
}

module.exports = UserController;