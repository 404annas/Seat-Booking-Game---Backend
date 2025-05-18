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
      const games = await GameModel.find({ status: 'ended' }).populate('seats').populate('Approved_Users');
      if (!games || games.length === 0) {
        return res.status(404).json({ message: "No active games found" });
      }
      return res.status(200).json(games);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  GetLeaderboard: async (req, res) => {
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
            select: 'username email' // Only select necessary user fields
          }
        });

      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      if (game.status === 'active') {
        return res.status(400).json({ message: "Game is still active" });
      }

      const seats = game.seats;
      if (!seats || seats.length === 0) {
        return res.status(404).json({ message: "No seats found" });
      }      // Filter only free seats (price = 0) that are occupied and include all required info
      const leaderboard = seats
        .filter(seat => seat.isOccupied && seat.price === 0)
        .map(seat => ({
          seatId: seat._id,
          seatNumber: seat.seatNumber,
          price: seat.price,
          gift: seat.gift || null,
          userId: seat.userId
        }))
        .sort((a, b) => a.seatNumber - b.seatNumber); // Sort by seat number for consistent display

      // if(!leaderboard || leaderboard.length === 0){
      //   return res.status(404).json({message:"No leaderboard found"});
      // }
      return res.status(200).json(leaderboard);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

module.exports = GameController;