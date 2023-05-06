const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3001;
let endpoints = process.env.ENDPOINTS;

if (!endpoints) {
  endpoints = [];
} else {
  endpoints = JSON.parse(endpoints);
}

if (endpoints.length === 0) {
  console.log('... No custom endpoints found');
}

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

if (endpoints.length > 0) console.log('... loading custom endpoints')
endpoints.map(({method, endpoint, response}) => {
  console.log(`    ${method.toUpperCase()} ${endpoint}`);
  app[method.toLowerCase()](endpoint, (req, res) => res.json(response))
})

app.listen(port, () => {
    console.log(`... HTTP catcher running at ${port}`)
});
