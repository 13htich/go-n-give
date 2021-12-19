const express = require('express');
const mongodb = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router();

// Get Winners
router.get('/', async (req, res) => {
    const client = await mongodb.MongoClient.connect(process.env.DATABASE_CONNECTION_STRING, {useUnifiedTopology: true, useNewUrlParser: true });
    const winnersDb = client.db('teams').collection('winners');
    const winners = await winnersDb.find({}).toArray();

    client.close();
    res.send(winners);
});

// Add Winner
router.post('/', async (req, res) => {
    const client = await mongodb.MongoClient.connect(process.env.DATABASE_CONNECTION_STRING, {useUnifiedTopology: true, useNewUrlParser: true });
    const winners = client.db('teams').collection('winners');
    const newTeam = req.body.team;
    const team = {
        forwards: {},
        defensemen: {},
        goalies: {}
    };

    Object.keys(newTeam).forEach(key => {
        Object.keys(newTeam[key]).forEach(posistion => {
            team[key][posistion] = {
                name: newTeam[key][posistion].name, 
                id: newTeam[key][posistion].id, 
                points: newTeam[key][posistion].points
            };
        });
    })

    await winners.insertOne({
        name: req.body.name,
        owner: req.body.owner,
        sid: req.body.sid,
        year: req.body.year,
        team,
        points: req.body.points,
        createdAt: new Date()
    });

    client.close();
    res.status(201).send();
});

module.exports = router;