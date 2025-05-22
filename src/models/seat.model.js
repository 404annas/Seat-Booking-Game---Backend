const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seatNumber: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  gift: {
    type: String,
  },
  giftImage: {
    type: String,
  },
  isOccupied: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  BookedAt: {
    type: Date,
    default: null
  },
  isWinner: {
    type: Boolean,
    default: false
  },
  declaredWinnerAt: {
    type: Date,
    default: null
  }
})

const Seat = mongoose.model('Seat', seatSchema);
module.exports = Seat;