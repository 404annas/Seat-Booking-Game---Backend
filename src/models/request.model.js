const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  //take ref from user model
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
        gameId :{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Game',
          required: true
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
})

const Request = mongoose.model('Request', requestSchema);
module.exports = Request;