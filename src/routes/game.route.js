const express = require("express");
const GameRoute = express.Router();

const GameController = require("../controllers/game.ctrl");

GameRoute.get("/getGameById/:gameId", GameController.GetGame);
GameRoute.get("/listActiveGames", GameController.ListActiveGames);
GameRoute.get("/listNonActiveGames", GameController.ListNonActiveGames);
GameRoute.get("/listLatestGame", GameController.ListLatestNonActiveGame);
GameRoute.get("/leaderboard/:gameId", GameController.GetLeaderboard);

module.exports = GameRoute;
