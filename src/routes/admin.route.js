const express = require('express');
const AdminRoute = express.Router();
const AdminController = require('../controllers/admin.ctrl');
const RoleValidation = require('../middleware/roleValidator');
const authMiddleware = require('../middleware/auth');
AdminRoute.post('/createGame',authMiddleware,RoleValidation(['admin']), AdminController.createGame);
AdminRoute.post('/endGame/:gameId',authMiddleware,RoleValidation(['admin']), AdminController.EndGame);
AdminRoute.get('/listAllGames',authMiddleware,RoleValidation(['admin']), AdminController.ListAllGames);
AdminRoute.get('/listAllSeats/:gameId',authMiddleware,RoleValidation(['admin','user']), AdminController.ListAllSeats);
AdminRoute.get('/listAllPendingRequest/:gameId',authMiddleware,RoleValidation(['admin']), AdminController.ListAllPendingRequest);
AdminRoute.post('/update/requestStatus/:requestId',authMiddleware,RoleValidation(['admin']), AdminController.RequestStatusUpdate);


module.exports = AdminRoute;
