const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
dotenv.config();

const router = express.Router();

// Get Skaters
router.get('/', async (req, res) => {
    const skaters = await getSkaters();
    
    res.json(skaters);
});

async function getSkaters() {
    const teamIds = [];
    let teams = await axios.get('https://statsapi.web.nhl.com/api/v1/teams');
    
    teams = teams.data.teams;
    teams.forEach(team => teamIds.push(team.id));
    const playerIds = []

    for (const teamId of teamIds) {
        let roster = await axios.get(`https://statsapi.web.nhl.com/api/v1/teams/${teamId}/roster`);
        
        roster = roster.data.roster;
        roster.forEach(player => playerIds.push(player.person.id));
    }

    let skaters = []

    for (const playerId of playerIds) {
        let skater = await axios.get(`https://statsapi.web.nhl.com/api/v1/people/${playerId}`);
        
        skater = skater.data;
    
        let pos = 'F';
        const pv = 1;
        const number = skater.people[0].primaryNumber;
        const points = 0;
        const goals = 0;
        const assists = 0;
        const games = 0;
        const fights = 0;

        if(skater.people[0].primaryPosition.type === 'Defenseman') {
            pos = 'D';
        }
        if(skater.people[0].primaryPosition.type === 'Goalie') {
            pos = 'G'
        }

        skaters.push({
            name: skater.people[0].fullName.toString(),
            p_id: playerId,
            pos,
            team: skater.people[0].currentTeam.name.toString(),
            games,
            goals,
            assists,
            pv, 
            points,
            fights,
        });
    }
    
    skaters.sort((a,b) => (a.team > b.team) ? 1 : ((b.pos > a.pos) ? -1 : 0))
    
    return skaters;
}

module.exports = router;