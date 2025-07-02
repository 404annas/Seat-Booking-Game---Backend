const GameModel = require("../models/game.model");
const RequestModel = require("../models/request.model");
const SeatModel = require("../models/seat.model");
const { sendStatusUpdate } = require("../services/Email.service");
const UserModel = require("../models/user.model");
const { uploadToCloudinary } = require("../config/cloudinary");

const AdminController = {
  declareWinners: async (req, res) => {
    const { gameId, seatIds } = req.body;

    if (
      !gameId ||
      !seatIds ||
      !Array.isArray(seatIds) ||
      seatIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Please provide gameId and an array of seat IDs" });
    }

    try {
      const game = await GameModel.findById(gameId).populate("seats");

      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      } // Ensure game is ended before declaring winners
      if (game.status !== "ended") {
        return res
          .status(400)
          .json({ message: "Game must be ended before declaring winners" });
      }

      // Get currently selected seats to validate
      const selectedSeats = await SeatModel.find({
        _id: { $in: seatIds },
      }).populate("userId");

      // Check if all seats are valid
      for (const seat of selectedSeats) {
        if (!seat.isOccupied || !seat.userId) {
          return res.status(400).json({
            message: `Seat ${seat.seatNumber} is not eligible to be declared as a winner. Only occupied seats can be winners.`,
          });
        }
        if (seat.isWinner) {
          return res.status(400).json({
            message: `Seat ${seat.seatNumber} has already been declared as a winner.`,
          });
        }
      }

      // Update all selected seats as winners
      await SeatModel.updateMany(
        { _id: { $in: seatIds } },
        {
          isWinner: true,
          declaredWinnerAt: new Date(),
        }
      );

      // Notify winners via email
      const winners = await SeatModel.find({ _id: { $in: seatIds } }).populate(
        "userId"
      );
      for (const seat of winners) {
        if (seat.userId && seat.userId.email) {
          const subject = `🏆 Congrulations! You're Winner in ${seat.gameName}`;

          const emailBody = `
          <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Congratulations, Winner!</title>
          <style>
              @media screen and (max-width: 600px) {
                  .container { width: 100% !important; }
                  .content { padding: 20px !important; }
                  .hero-heading { font-size: 28px !important; }
                  .seat-number { font-size: 48px !important; }
              }
          </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f0f4f8;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                  <td align="center" style="padding: 20px 0;">
                      <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #0D1CA2; border-radius: 16px; color: #ffffff; font-family: Arial, sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
                          <tr>
                              <td align="center" style="padding: 30px 20px 20px 20px;">
                                  <img src="https://your-server.com/logo.png" alt="Your Game Logo" width="150" style="display: block;">
                              </td>
                          </tr>
                          <tr>
                              <td class="content" align="center" style="padding: 20px 40px;">
                                  <h1 class="hero-heading" style="margin: 0; font-size: 36px; font-weight: bold; color: #E2C27B; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                                      🏆 Congratulations, ${
                                        seat.userId.username
                                      }!
                                  </h1>
                                  <p style="margin: 10px 0 30px 0; font-size: 16px; color: #ffffff; opacity: 0.8;">
                                      You've been declared a winner in the game: <strong>${
                                        seat.gameName
                                      }</strong>.
                                  </p>
                                  <div style="background-color: rgba(226, 194, 123, 0.1); border: 2px solid #E2C27B; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                                      <p style="margin: 0; font-size: 14px; color: #E2C27B; text-transform: uppercase; letter-spacing: 1px;">Your Winning Seat</p>
                                      <p class="seat-number" style="margin: 10px 0 0 0; font-size: 64px; font-weight: bold; color: #E2C27B; line-height: 1;">
                                          ${seat.seatNumber}
                                      </p>
                                  </div>
                                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #ffffff; opacity: 0.9;">
                                      Your prize: <strong>${
                                        seat.gift || "A fantastic surprise!"
                                      }</strong> will be sent to you shortly. Keep an eye on your email for more details!
                                  </p>
                                  <a href="https://your-app.com/leaderboard/${
                                    seat.gameId
                                  }" target="_blank" style="display: inline-block; background-color: #29B79B; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; transition: all 0.3s;">
                                      View Game Leaderboard
                                  </a>
                              </td>
                          </tr>
                         
                      </table>
                  </td>
              </tr>
          </table>
      </body>
      </html>`;
          await sendStatusUpdate(seat.userId.email, subject, emailBody);
        }
      }

      return res.status(200).json({
        message: "Winners declared successfully",
        winners: winners.map((seat) => ({
          seatNumber: seat.seatNumber,
          userName: seat.userId ? seat.userId.username : "Unknown",
        })),
      });
    } catch (error) {
      console.error("Error declaring winners:", error);
      return res.status(500).json({ message: "Failed to declare winners" });
    }
  },

  createGame: async (req, res) => {
    const {
      totalSeats,
      freeSeats,
      paidSeats,
      seats,
      gameName,
      description,
      additionalInfo,
      universalGift,
      universalGiftImage,
      gameImage,
    } = req.body;

    console.log("Creating game with data:", {
      gameName,
      gameImage,
      totalSeats,
      freeSeats,
      paidSeats,
    });

    if (!seats || seats.length === 0) {
      return res.status(400).json({ message: "Please provide the seats" });
    }
    if (seats.length !== totalSeats) {
      return res
        .status(400)
        .json({ message: "Please provide the correct number of seats" });
    }

    if (!totalSeats || !freeSeats || !paidSeats || !gameName) {
      return res.status(400).json({ message: "Please provide all the fields" });
    }

    // New validation for total seats vs free + paid seats
    if (totalSeats < freeSeats + paidSeats) {
      return res.status(400).json({
        message: "Total seats should be greater than free and paid seats",
      });
    }

    // Validate if number of paid seats matches seats with prices
    const paidSeatsInArray = seats.filter((seat) => seat.price > 0).length;
    if (paidSeatsInArray !== paidSeats) {
      return res.status(400).json({
        message: `Number of paid seats (${paidSeats}) does not match seats with prices (${paidSeatsInArray})`,
      });
    }

    // Validate that paid seats have valid prices
    const invalidPricedSeats = seats.filter(
      (seat) => seat.price <= 0 && seat.isPaid
    );
    if (invalidPricedSeats.length > 0) {
      return res
        .status(400)
        .json({ message: "All paid seats must have a valid price" });
    }

    try {
      const gameId = await GenerateGameID();
      const isValidSeats = ValidateSeats(seats, res);
      if (!isValidSeats) {
        return res
          .status(400)
          .json({ message: "Please provide valid seat number and price" });
      }
      const userId = req.user._id;

      // Create seats first
      const createdSeats = await SeatModel.create(
        seats.map((seat) => ({
          seatNumber: seat.seatNumber,
          price: seat.price,
          gift: seat?.gift || universalGift || null,
          giftImage: seat?.giftImage || universalGiftImage || null,
        }))
      ); // Create game with seat references
      const game = await GameModel.create({
        gameName,
        gameId,
        userId,
        gameImage,
        description,
        additionalInfo,
        universalGift,
        universalGiftImage,
        totalSeats,
        freeSeats,
        paidSeats,
        seats: createdSeats.map((seat) => seat._id),
      });

      return res
        .status(200)
        .json({ message: "Game created successfully", game });
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
      if (game.status === "ended") {
        return res.status(400).json({ message: "Game already ended" });
      }
      game.status = "ended";
      await game.save();
      return res.status(200).json({ message: "Game ended successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  ListAllGames: async (req, res) => {
    try {
      const games = await GameModel.find({ status: "active" })
        .populate("seats")
        .populate("Pending_Requests")
        .populate("Approved_Users")
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
      const game = await GameModel.findById(gameId).populate({
        path: "seats",
        populate: {
          path: "userId",
          select: "username email", // Only select the fields we need
        },
      });

      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      const seats = game.seats;
      const GameStatus = game.status;
      if (!seats || seats.length === 0) {
        return res.status(404).json({ message: "No seats found" });
      }
      return res.status(200).json({ seats, GameStatus });
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
      return res
        .status(400)
        .json({ message: "Please provide the requestId and status" });
    }
    try {
      const request = await RequestModel.findById(requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      if (request.status === "approved") {
        return res.status(400).json({ message: "Request already approved" });
      }
      if (request.status === "rejected") {
        return res.status(400).json({ message: "Request already rejected" });
      }

      if (status !== "approved" && status !== "rejected") {
        return res
          .status(400)
          .json({ message: "Please provide a valid status" });
      }

      request.status = status;
      await request.save();

      if (status === "approved") {
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
      return res
        .status(200)
        .json({ message: "Request status updated successfully" });
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
      if (!admin || admin.role !== "admin") {
        return res.status(404).json({ message: "Admin not found" });
      }

      // Verify current password
      const isValidPassword = await admin.comparePassword(currentPassword);
      if (!isValidPassword) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      // Check if email is already taken by another user
      if (email !== admin.email) {
        const emailExists = await UserModel.findOne({
          email,
          _id: { $ne: userId },
        });
        if (emailExists) {
          return res.status(400).json({ message: "Email is already in use" });
        }
      }

      // Check if username is already taken by another user
      if (username !== admin.username) {
        const usernameExists = await UserModel.findOne({
          username,
          _id: { $ne: userId },
        });
        if (usernameExists) {
          return res
            .status(400)
            .json({ message: "Username is already in use" });
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
          role: admin.role,
        },
        token,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  uploadImage: async (req, res) => {
    try {
      // The image URL will be added to req.body.imageUrl by the handleImageUpload middleware
      if (!req.files || (!req.files.giftImage && !req.files.gameImage)) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      if (!req.body.imageUrl) {
        return res.status(400).json({ message: "No image URL available" });
      }

      return res.status(200).json({
        message: "Image uploaded successfully",
        imageUrl: req.body.imageUrl,
      });
    } catch (error) {
      console.error("Error in uploadImage controller:", error);
      return res
        .status(500)
        .json({ message: "Failed to process image upload" });
    }
  },
};

async function GenerateGameID() {
  const LastGame = await GameModel.findOne({}).sort({ createdAt: -1 });
  if (!LastGame) {
    return "game-AAA-0001"; // If no games exist, return the first game ID
  }
  const lastGameId = LastGame.gameId;
  const lastGameIdParts = lastGameId.split("-");
  const lastGameIdNumber = parseInt(lastGameIdParts[2], 10); // Convert the last number part to an integer
  const newGameIdNumber = lastGameIdNumber + 1; // Increment the number part
  const newGameId = `${lastGameIdParts[0]}-${lastGameIdParts[1]}-${String(
    newGameIdNumber
  ).padStart(4, "0")}`; // Format the new game ID
  return newGameId; // Return the new game ID
}

async function ValidateSeats(seats) {
  const { seatNumber, price } = seats[0];
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
