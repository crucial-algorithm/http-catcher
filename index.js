const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3001;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

let message = null;


app.get('/', (req, res) => {
    res.json(message)
});

app.get('/clear', (req, res) => {
    message = null;
    res.status(200).send('ok');
});


app.post('/', (req, res) => {
    message = req.body;
    res.status(200).send('Stored');
});

app.listen(port, () => {
    console.log(`HTTP catcher running at ${port}`)
});
