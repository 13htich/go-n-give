const express = require('express');
const cors = require('cors');
const parser = require('body-parser');

const app = express();

// Middleware
app.use(parser.json());
app.use(cors());

// Teams route
const teams = require('./routes/api/teams');
const players = require('./routes/api/players');
const questions = require('./routes/api/questions');
const winners = require('./routes/api/winners');
const skaters = require('./routes/api/skaters');

app.use('/api/teams', teams);
app.use('/api/players', players);
app.use('/api/questions', questions);
app.use('/api/winners', winners);
app.use('/api/skaters', skaters);

// Handle production 
if(process.env .NODE_ENV === 'production'){
    // Static folder
    app.use(express.static(__dirname + '/public'));

    // Handle SPA
    app.get(/.*/, (req, res) => res.sendFile(__dirname + '/public/index.html'));
}

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server started on port ${port}`));