const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const SimpleScheduler = require('./SimpleScheduler');
const cors = require('cors'); // Import the cors package
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

// Define the CORS options
const corsOptions = {
  credentials: true,
  origin(req, callback) {
    callback(null, true);
  }
};

app.use(cors(corsOptions)); // Use the cors middleware with your options
app.options('*', cors(corsOptions));

let storage = {
  __default__: []
}

app.get('/', (req, res) => {
  let bucket = req.query.bucket || '__default__';
  let log = req.query.log !== undefined;

  process.stdout.write(`... GET to / ${bucket}`);
  if (!storage[bucket]) {
    process.stdout.write(' [not created yet]\n');
    res.status(204).send('Bucket not found');
  } else {
    process.stdout.write(` [${Math.max(0,storage[bucket].length - 1)} record(s)]\n`);
    const result = storage[bucket].pop();

    if (log === true) {
      console.log(result, typeof result);
    }

    res.json(result);
    res.end();
  }
});

app.get('/clear', (req, res) => {
  let bucket = req.query.bucket || '__default__';

  console.log(`... GET to /clear [${bucket}]`);
  if (!storage[bucket]) {
    res.status(204).send('Bucket not found');
  } else {
    console.log(`... ${storage[bucket].length} to be discarded`);
    storage[bucket] = [];
    res.status(200).send('ok');
  }
  res.end();
});


app.get("/clear-all", (req, res) => {
  console.log(`... GET to /clear-all`);

  storage = {
    __default__: [],
  };
  res.status(200).send("ok");
  res.end();
});

app.get('/health-check', (req, res) => {
  res.status(200).send(getRemoteAddress(req));
  res.end();
});


app.post("/", (req, res) => {
  let bucket = req.query.bucket || "__default__";

  process.stdout.write(`... POST to / ${bucket}`);
  if (!storage[bucket]) {
    storage[bucket] = [];
  }

  process.stdout.write(` [${storage[bucket].length + 1} record(s)] \n`);
  storage[bucket].push(req.body);
  res.status(200).send("Stored");
  res.end();
});

console.log('... version 20240323-1213');

if (endpoints.length > 0) console.log('... loading custom endpoints')
endpoints.map(({method, endpoint, response, sideEffect, keep}) => {
  console.log(`    ${method.toUpperCase()} ${processEndpoint(endpoint)} ${sideEffect ? ' with side effect' : ''}`, keep);

  app[method.toLowerCase()](processEndpoint(endpoint), multer().none(), async (req, res) => {
    console.log('...', method.toUpperCase(), endpoint);
    // side effects are used to simulate making calls during request
    await handleSideEffect(sideEffect, req);

    if (response.type === 'redirect') {
      handleRedirect(response.url, req, res);
    } else if (response.type === 'case') {
      handleCase(response.options, req, res);
    } else if (response.type === 'payment-status') {
      res.sendStatus(Number(response.status));
    } else {
      res.json(JSON.parse(replaceVars(JSON.stringify(response), vars(req))));
    }
    res.end();
  });
})

function processEndpoint(value) {
  const placeholders = findPlaceHolders(value);

  placeholders.map((p) => value = value.replace(`{{${p}}}`, `:${p}`));

  return value;
}

app.listen(port, () => {
    console.log(`... HTTP catcher running at ${port}`)
});

const scheduler = new SimpleScheduler()

const lookup = function recurse(array,object) {
  let next = (array.length) ? object[array.shift()] : object;
  return (next instanceof Object && next[array[0]]) ? recurse(array,next) : next;
}

/**
 * A side effect definition
 * @typedef {{key: string, value: string}} SideEffectHeader
 * @typedef {{url: string, method: string, body: object, delay: number, headers: Array<SideEffectHeader> }} SideEffect
 * @typedef {{test: string, defaultOption: string, responses: {value: string, response: object}[] }} CaseParams
 *
 */

/**
 *
 * @param {SideEffect} sideEffect
 * @param {Request} req
 * @returns {Promise<void>}
 */
async function handleSideEffect(sideEffect, req) {
  if (!sideEffect) return;

  console.log('... has side effect');

  const context = vars(req);
  const payload = replaceVars(JSON.stringify(sideEffect.body), context);
  const headers = { 'Content-Type': 'application/json' };

  if (sideEffect.headers) {
    sideEffect.headers.map(({key, value}) => headers[key] = replaceVars(value, context));
  }

  const call = async () => {
    const r = await fetch(replaceVars(sideEffect.url, context), {
      method: sideEffect.method,
      headers,
      body: payload
    });

    console.log(`... Side effect response status: ${r.status}; Payload: ${JSON.stringify(payload)}`);
  }

  if (sideEffect.delay) {
    return scheduler.add({when: Date.now() + sideEffect.delay, call});
  }

  await call();
}

/**
 *
 * @param {Request} req
 * @returns {*&{requester_ip: string}}
 */
function vars(req) {
  return {...req.body, requester_ip: getRemoteAddress(req)};
}

function handleRedirect(target, req, res) {
  console.log('... handling redirect to', target);
  res.redirect(replaceVars(target, vars(req)));
}

function replaceVars(templateLiteral, vars) {
  const placeholders = findPlaceHolders(templateLiteral);
  let result = templateLiteral;
  placeholders.map((k) => (result = result.replace(`{{${k}}}`, lookup(k.split('.'), vars))));

  return result;
}

function findPlaceHolders(templateLiteral) {
  return (templateLiteral.match(/\{\{.+?}}/g) || []).map((s) => s.replace('{{', '').replace('}}', ''));
}

/**
 *
 * @param {CaseParams} options
 * @param req
 * @param res
 */
function handleCase(options, req, res) {
  const { test, defaultOption, responses } = options;
  let value;

  value = req.params[test] || replaceVars(test, vars(req));

  console.log('... handling case with value', value);
  let response = (responses.find((r) => r.value === value) || { response: null }).response;

  if (!response && defaultOption) {
    response = (responses.find((r) => r.value === defaultOption) || { response: null }).response;
  }

  res.json(JSON.parse(replaceVars(JSON.stringify(response), vars(req))));
}


function getRemoteAddress(req) {
  const parts = req.socket.remoteAddress.split(/:/g);

  return parts[parts.length - 1];
}
