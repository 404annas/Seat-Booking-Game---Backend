const express = require("express");
const GameRoute = express.Router();
const authMiddleware = require('../middleware/auth');
const GameController = require("../controllers/game.ctrl");
const RoleValidation = require("../middleware/roleValidator");



GameRoute.get("/getGameById/:gameId", GameController.GetGame);
GameRoute.get("/listActiveGames", GameController.ListActiveGames);
GameRoute.get("/listNonActiveGames", GameController.ListNonActiveGames);
GameRoute.get("/listLatestGame", GameController.ListLatestNonActiveGame);
GameRoute.get("/leaderboard/:gameId", GameController.GetLeaderboard);
GameRoute.delete("/deleteGame/:gameId", authMiddleware, RoleValidation(["admin"]), GameController.DeleteGame);

module.exports = GameRoute;
