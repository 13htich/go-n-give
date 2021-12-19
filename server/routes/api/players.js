const axios = require('axios');
const dotenv = require('dotenv');
const cron = require('node-cron');
dotenv.config();

const express = require('express');
const mongodb = require('mongodb');

const router = express.Router();

cron.schedule('*/15 * * * *', () => {
    console.log("Updating players");
    updatePlayers();
});

cron.schedule('0 8 * * *', async () => {
    console.log("Updating goalies and fights");
    await updateGoaliePoints();
    await updateFights();
});

// Get Players
router.get('/', async (req, res) => {
    const client = await mongodb.MongoClient.connect(process.env.DATABASE_CONNECTION_STRING, {useUnifiedTopology: true, useNewUrlParser: true });
    const players = client.db('players').collection('players');
    res.send(await players.find({}).toArray());
    client.close();
});

// Add Players
router.post('/', async (req, res) => {
    const client = await mongodb.MongoClient.connect(process.env.DATABASE_CONNECTION_STRING, {useUnifiedTopology: true, useNewUrlParser: true });
    const players = client.db('players').collection('players');
    await players.insertOne({
        name: req.body.name,
        p_id: req.body.p_id,
        pos: req.body.pos,
        team: req.body.team,
        points: 0,
        goals: 0,
        assists: 0,
        pv: 1
    });
    client.close();
    res.status(201).send();
});

async function updatePlayers() {
    try {
        const client = await mongodb.MongoClient.connect(process.env.DATABASE_CONNECTION_STRING, {useUnifiedTopology: true, useNewUrlParser: true });
        const playersdb = client.db('players').collection('players');
        const players = await playersdb.find({}).toArray();

        await Promise.all(players.map(async (player) => {
            const query = {p_id : player.p_id};

            if(player.p_id == 1){
                return;
            }

            const url = `https://statsapi.web.nhl.com/api/v1/people/${player.p_id}/stats?stats=statsSingleSeasonPlayoffs&season=20192020`;
            const res = await axios.get(url).catch((err) => console.error(err));
            
            if (res && !res.err && res.data.stats[0].splits && res.data.stats[0].splits[0] && res.data.stats[0].splits[0].stat){ 
                const data = res.data.stats[0].splits[0].stat;
                let points = 0;
                let goals = 0;
                let assists = 0;
                let games = data.games;

                if (player.pos == "G"){
                    // Goalie
                    points = 2*data.wins;

                    if(data.shutouts){
                        points += data.shutouts;
                    }

                    //Use the values we already have for goalies because we have to 
                    // track goalie goals and assists seperately
                    goals = player.goals;
                    assists = player.assists;
                    points = points + goals + assists;
                } else {
                    // Skater
                    goals = data.goals;
                    assists = data.assists;
                    points = goals + assists;
                }
                
                points -= player.preseason;
                goals -= player.preseason_goals;
                assists -= player.preseason_assists;
                
                if(isNaN(points)){
                    points = 0;
                }
                
                if(points != player.points){
                    const newValues = { $set: {points: points, goals: goals, assists: assists, games: games} };
                    
                    await playersdb.updateOne(query, newValues);
                }
            } else {
                console.log(`Error getting stats for ${player.name}`);
            }
        }));

        client.close();
    }catch(e){
        console.error(e);
    }
}

async function updateGoaliePoints(){
    try {
        const client = await mongodb.MongoClient.connect(process.env.DATABASE_CONNECTION_STRING, {useUnifiedTopology: true, useNewUrlParser: true });
        const playersdb = client.db('players').collection('players');
        let players = await playersdb.find({}).toArray();

        players = players.filter(player => player.pos == "G");

        let d = new Date();
        
        d.setDate(d.getDate() - 1); //Yesterday
        
        const url = `https://statsapi.web.nhl.com/api/v1/schedule?date=${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        const res = await axios.get(url).catch((error) => {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.log(error.response.data);
                console.log(error.response.status);
                console.log(error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                console.log(error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.log('Error', error.message);
            }

            return;
        });

        const games = res.data.dates[0].games;

        //Get all the game links for the current day
        await Promise.all(games.map(async game => {
            //Use each games scoring plays to check for goalie points 
            const gameURL = `https://statsapi.web.nhl.com${game.link}`;
            const gameres = await axios.get(gameURL).catch((error) => {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.log(error.response.data);
                    console.log(error.response.status);
                    console.log(error.response.headers);
                } else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.log(error.request);
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.log('Error', error.message);
                }
                return;
            });

            const gameData = gameres.data;
            const scoringPlays = gameData.liveData.plays.scoringPlays;

            await Promise.all(scoringPlays.map(async play => {
                const data = gameData.liveData.plays.allPlays[play];
                
                await Promise.all(data.players.map( async skater => {
                    //Look at all the skaters for each scoring play
                    const index = players.findIndex(player => player.p_id == skater.player.id);
                    
                    if(index == -1){
                        return;
                    }
                    
                    const query = {p_id : skater.player.id};
                    
                    if(skater.playerType == "Scorer"){
                        const newValues = { $set: {goals: players[index].goals+1, points: players[index].points+1} };
                        
                        await playersdb.updateOne(query, newValues);
                    } else if(skater.playerType == "Assist") {
                        const newValues = { $set: {assists: players[index].assists+1, points: players[index].points+1} };
                        
                        await playersdb.updateOne(query, newValues);
                    }
                }));
            }));
        }));

        client.close();
    }catch(e){
        console.error(e);
    }
}

async function updateFights(){
    try {
        const client = await mongodb.MongoClient.connect(process.env.DATABASE_CONNECTION_STRING, {useUnifiedTopology: true, useNewUrlParser: true });
        const playersdb = client.db('players').collection('players');
        let players = await playersdb.find({}).toArray();
        let d = new Date();

        d.setDate(d.getDate() - 1); //Yesterday
        
        const url = `https://statsapi.web.nhl.com/api/v1/schedule?date=${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        const res = await axios.get(url).catch((error) => {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.log(error.response.data);
                console.log(error.response.status);
                console.log(error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                console.log(error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.log('Error', error.message);
            }

            return;
        });

        const games = res.data.dates[0].games;
        
        //Get all the game links for the current day
        await Promise.all(games.map(async game => {
            //Use each games scoring plays to check for goalie points 
            const gameURL = `https://statsapi.web.nhl.com${game.link}`;
            const gameres = await axios.get(gameURL).catch((error) => {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.log(error.response.data);
                    console.log(error.response.status);
                    console.log(error.response.headers);
                } else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.log(error.request);
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.log('Error', error.message);
                }
                
                return;
            });

            const gameData = gameres.data;
            const penaltyPlays = gameData.liveData.plays.penaltyPlays;

            await Promise.all(penaltyPlays.map(play => {
                const data = gameData.liveData.plays.allPlays[play];
                
                if(data.result.secondaryType != 'Fighting') { return; }

                data.players.forEach( async skater => {
                    //Look at all the skaters for each fighting penalty
                    const index = players.findIndex(player => player.p_id == skater.player.id);
                    
                    if(index == -1){
                        return;
                    }

                    const query = {p_id : skater.player.id};
                    const newValues = { $set: {fights: players[index].fights+1} };
                    
                    await playersdb.updateOne(query, newValues, (err, res) => {
                        if (err) throw err;
                    });
                });
            }));
        }));

        client.close();
    }catch(e){
        console.error(e);
    }
}

module.exports = router;