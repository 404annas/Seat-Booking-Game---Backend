const mongoose = require('mongoose');
const SeatModel = require('./seat.model');
const gameSchema = new mongoose.Schema({
  gameName: {
    type: String,
    required: true,
  },
  gameId: {
    type: String,
    required: true,
  },
  gameImage: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  additionalInfo: {
    type: String,
    default: '',
  },
  universalGift: {
    type: String,
    default: '',
  },
  universalGiftImage: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active',
  },
  totalSeats: {
    type: Number,
    required: true,
  },
  freeSeats: {
    type: Number,
    required: true,
  },
  paidSeats: {
    type: Number,
    required: true,
  },
  Approved_Users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  //take the reference from the seats model
  seats: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
    }
  ],
  Pending_Requests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const Game = mongoose.model('Game', gameSchema);
module.exports = Game;