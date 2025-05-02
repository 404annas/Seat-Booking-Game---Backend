require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();


const origin = process.env.ORIGIN || 'http://localhost:5173';

//middle wares 
app.use(cors({
    origin: origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

//mongoose setup
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));


    //routes
    const UserRoute = require('./routes/user.route');
    const AdminRoute = require('./routes/admin.route');
    const GameRoute = require('./routes/game.route');

    app.use('/api/user', UserRoute);
    app.use('/api/admin', AdminRoute);
    app.use('/api/game', GameRoute);


    //server startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
