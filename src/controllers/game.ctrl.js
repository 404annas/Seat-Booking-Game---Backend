const GameModel = require('../models/game.model');

const GameController = {
  GetGame: async (req, res) => {
    const gameId = req.params.gameId;
    if (!gameId) {
      return res.status(400).json({ message: "Please provide the gameId" });
    }
    try {
      const game = await GameModel.findById(gameId).populate('seats').populate('Approved_Users').populate(
        {
          path: 'Pending_Requests',
          populate: {
            path: 'userId',
            select: 'username email' // Only select necessary user fields
          }
        }
      );
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
      return res.status(200).json(game);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  ListActiveGames: async (req, res) => {
    try {
      const games = await GameModel.find({ status: 'active' }).populate('seats').populate('Approved_Users').populate('Pending_Requests').sort({ createdAt: -1 });
      if (!games || games.length === 0) {
        return res.status(404).json({ message: "No active games found" });
      }
      return res.status(200).json(games);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  ListNonActiveGames: async (req, res) => {
    try {
      const games = await GameModel.find({ status: 'ended' }).populate('seats').populate('Approved_Users').sort({ createdAt: -1 });
      if (!games || games.length === 0) {
        return res.status(404).json({ message: "No active games found" });
      }
      return res.status(200).json(games);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }, GetLeaderboard: async (req, res) => {
    const gameId = req.params.gameId;
    if (!gameId) {
      return res.status(400).json({ message: "Please provide the gameId" });
    }
    try {
      const game = await GameModel.findById(gameId)
        .populate({
          path: 'seats',
          populate: {
            path: 'userId',
            select: 'username email profileImage'
          }
        });

      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      const seats = game.seats;
      if (!seats || seats.length === 0) {
        return res.status(404).json({ message: "No seats found" });
      }

      // Filter only occupied free seats (price = 0)
      const freeOccupiedSeats = seats.filter(seat =>
        seat.isOccupied &&
        seat.userId &&
        (seat.price === 0 || !seat.price)
      );

      // Prepare response with game details and leaderboard
      const response = {
        gameDetails: {
          id: game._id,
          gameName: game.gameName,
          description: game.description,
          additionalInfo: game.additionalInfo,
          universalGift: game.universalGift,
          universalGiftImage: game.universalGiftImage,
          totalSeats: game.totalSeats,
          freeSeats: game.freeSeats,
          paidSeats: game.paidSeats,
          freeSeatsAwarded: freeOccupiedSeats.length
        }, leaderboard: freeOccupiedSeats.map(seat => ({
          seatId: seat._id,
          seatNumber: seat.seatNumber,
          userName: seat.userId ? seat.userId.username : null,
          gift: seat.gift || game.universalGift || null,
          giftImage: seat.giftImage || game.universalGiftImage || null,
          dateBooked: seat.dateBooked,
          user: seat.userId ? {
            id: seat.userId._id,
            username: seat.userId.username,
            email: seat.userId.email,
            profileImage: seat.userId.profileImage
          } : null
        })).sort((a, b) => a.seatNumber - b.seatNumber)
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

module.exports = GameController;