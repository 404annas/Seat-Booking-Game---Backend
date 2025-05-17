const GameModel = require('../models/game.model');
const RequestModel = require('../models/request.model');
const SeatModel = require('../models/seat.model');
const { sendStatusUpdate } = require('../services/Email.service');
const UserModel = require('../models/user.model')
const AdminController = {
  createGame: async (req, res) => {
    const { totalSeats, freeSeats, paidSeats, seats, gameName } = req.body;

    if (!seats || seats.length === 0) {
      return res.status(400).json({ message: "Please provide the seats" });
    }
    if (seats.length !== totalSeats) {
      return res.status(400).json({ message: "Please provide the correct number of seats" });
    }

    if (!totalSeats || !freeSeats || !paidSeats || !gameName) {
      return res.status(400).json({ message: "Please provide all the fields" });
    }

    // New validation for total seats vs free + paid seats
    if (totalSeats < freeSeats + paidSeats) {
      return res.status(400).json({ message: "Total seats should be greater than free and paid seats" });
    }

    // Validate if number of paid seats matches seats with prices
    const paidSeatsInArray = seats.filter(seat => seat.price > 0).length;
    if (paidSeatsInArray !== paidSeats) {
      return res.status(400).json({ message: `Number of paid seats (${paidSeats}) does not match seats with prices (${paidSeatsInArray})` });
    }

    // Validate that paid seats have valid prices
    const invalidPricedSeats = seats.filter(seat => seat.price <= 0 && seat.isPaid);
    if (invalidPricedSeats.length > 0) {
      return res.status(400).json({ message: "All paid seats must have a valid price" });
    }

    try {
      const gameId = await GenerateGameID();
      const isValidSeats = ValidateSeats(seats, res);
      if (!isValidSeats) {
        return res.status(400).json({ message: "Please provide valid seat number and price" });
      }
      const userId = req.user._id;

      // Create seats first
      const createdSeats = await SeatModel.create(seats.map(seat => ({
        seatNumber: seat.seatNumber,
        price: seat.price,
        gift: seat?.gift || null
      })));

      // Create game with seat references
      const game = await GameModel.create({
        gameName,
        gameId,
        userId,
        totalSeats,
        freeSeats,
        paidSeats,
        seats: createdSeats.map(seat => seat._id)
      });

      return res.status(200).json({ message: "Game created successfully", game });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  EndGame: async (req, res) => {
    const gameId = req.params.gameId;
    if (!gameId) {
      return res.status(400).json({ message: "Please provide the gameId" });
    }
    try {
      const game = await GameModel.findById(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      if (game.status === 'ended') {
        return res.status(400).json({ message: "Game already ended" });
      }
      game.status = 'ended';
      await game.save();
      return res.status(200).json({ message: "Game ended successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  ListAllGames: async (req, res) => {
    try {
      const games = await GameModel.find({ status: 'active' })
        .populate('seats')
        .populate('Pending_Requests')
        .populate('Approved_Users')
        .sort({ createdAt: -1 });
      if (!games || games.length === 0) {
        return res.status(404).json({ message: "No games found" });
      }
      return res.status(200).json(games);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  ListAllSeats: async (req, res) => {
    const gameId = req.params.gameId;
    if (!gameId) {
      return res.status(400).json({ message: "Please provide the gameId" });
    }
    try {
      const game = await GameModel.findById(gameId).populate('seats');
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      if (game.status === 'ended') {
        return res.status(400).json({ message: "Game already ended" });
      }
      const seats = game.seats;
      if (!seats || seats.length === 0) {
        return res.status(404).json({ message: "No seats found" });
      }
      return res.status(200).json(seats);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  ListAllPendingRequest: async (req, res) => {
    const gameId = req.params.gameId;
    if (!gameId) {
      return res.status(400).json({ message: "Please provide the gameId" });
    }
    try {
      const game = await GameModel.findOne({ gameId });
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      const request = await RequestModel.find({ gameId });
      if (!request || request.length === 0) {
        return res.status(404).json({ message: "No requests found" });
      }
      return res.status(200).json(request);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  RequestStatusUpdate: async (req, res) => {
    const requestId = req.params.requestId;
    const { status } = req.body;
    if (!requestId || !status) {
      return res.status(400).json({ message: "Please provide the requestId and status" });
    }
    try {
      const request = await RequestModel.findById(requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      if (request.status === 'approved') {
        return res.status(400).json({ message: "Request already approved" });
      }
      if (request.status === 'rejected') {
        return res.status(400).json({ message: "Request already rejected" });
      }

      if (status !== 'approved' && status !== 'rejected') {
        return res.status(400).json({ message: "Please provide a valid status" });
      }

      request.status = status;
      await request.save();

      if (status === 'approved') {
        const game = await GameModel.findById(request.gameId);
        if (!game) {
          return res.status(404).json({ message: "Game not found" });
        }
        game.Approved_Users.push(request.userId);
        await game.save();
        const user = await UserModel.findById(request.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const email = user.email;
        const subject = "Request Approved";
        const text = "Your request has been approved";
        await sendStatusUpdate(email, subject, text);
      }
      return res.status(200).json({ message: "Request status updated successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  UpdateProfile: async (req, res) => {
    const userId = req.user._id;
    const { username, email, currentPassword, newPassword } = req.body;

    try {
      const admin = await UserModel.findById(userId);
      if (!admin || admin.role !== 'admin') {
        return res.status(404).json({ message: "Admin not found" });
      }

      // Verify current password
      const isValidPassword = await admin.comparePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Check if email is already taken by another user
      if (email !== admin.email) {
        const emailExists = await UserModel.findOne({ email, _id: { $ne: userId } });
        if (emailExists) {
          return res.status(400).json({ message: "Email is already in use" });
        }
      }

      // Check if username is already taken by another user
      if (username !== admin.username) {
        const usernameExists = await UserModel.findOne({ username, _id: { $ne: userId } });
        if (usernameExists) {
          return res.status(400).json({ message: "Username is already in use" });
        }
      }

      // Update admin data
      admin.username = username;
      admin.email = email;
      if (newPassword) {
        admin.password = newPassword;
      }

      await admin.save();

      // Generate new token with updated information
      const token = admin.generateAuthToken();

      return res.status(200).json({
        message: "Profile updated successfully",
        user: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        },
        token
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

async function GenerateGameID() {
  const LastGame = await GameModel.findOne({}).sort({ createdAt: -1 });
  if (!LastGame) {
    return "game-AAA-0001"; // If no games exist, return the first game ID
  }
  const lastGameId = LastGame.gameId;
  const lastGameIdParts = lastGameId.split("-");
  const lastGameIdNumber = parseInt(lastGameIdParts[2], 10); // Convert the last number part to an integer
  const newGameIdNumber = lastGameIdNumber + 1; // Increment the number part
  const newGameId = `${lastGameIdParts[0]}-${lastGameIdParts[1]}-${String(newGameIdNumber).padStart(4, '0')}`; // Format the new game ID
  return newGameId; // Return the new game ID
}

async function ValidateSeats(seats) {
  const { seatNumber, price, } = seats[0];
  if (!seatNumber || !price) {
    return false;
  }
  if (seatNumber < 0 || price < 0) {
    return false;
  }

  if (seatNumber.length < 3) {
    return false;
  }
  return true;
}

module.exports = AdminController;

