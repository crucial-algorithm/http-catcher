const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const SimpleScheduler = require('./SimpleScheduler');
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
endpoints.map(({method, endpoint, response, sideEffect}) => {
  console.log(`    ${method.toUpperCase()} ${endpoint} ${sideEffect ? ' with side effect' : ''}`);

  app[method.toLowerCase()](endpoint, multer().none(), async (req, res) => {
    // side effects are used to simulate making calls during request
    await handleSideEffect(sideEffect, req.body);

    if (response.type === 'redirect') {
      handleRedirect(response.url, req, res);
    } else {
      res.json(JSON.parse(replaceVars(JSON.stringify(response), req.body)));
    }
  });

})

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
 *
 */

/**
 *
 * @param {SideEffect} sideEffect
 * @param {Object} requestBody
 * @returns {Promise<void>}
 */
async function handleSideEffect(sideEffect, requestBody) {
  if (!sideEffect) return;

  const payload = replaceVars(JSON.stringify(sideEffect.body), requestBody);
  const headers = { 'Content-Type': 'application/json' };

  if (sideEffect.headers) {
    sideEffect.headers.map(({key, value}) => headers[key] = replaceVars(value, requestBody));
  }

  const call = async () => {
    const r = await fetch(sideEffect.url, {
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


function handleRedirect(target, req, res) {
  res.redirect(replaceVars(target, req.body));
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
