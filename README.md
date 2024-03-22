# http-catcher
Simple http catcher created to support e2e tests

## Run in command line
```bash
npm run start
```

## Adding new custom endpoints
Edit file `custom-endpoints.json` and add new record to the array

## Run docker image locally:
```shell
docker build -t http-catcher .
docker run http-catcher
```


## Build to push to docker hub:
```shell
# latest
docker build --platform linux/amd64  -t filipeutter/http-catcher .
docker push filipeutter/http-catcher

# tag
docker build --platform linux/amd64  -t filipeutter/http-catcher:2.1 .
docker push filipeutter/http-catcher:2.1
```

Define custom endpoints by setting `ENDPOINTS` enviornment variable
```bash
export ENDPOINTS=[ { "method": "post", "endpoint": "/sibs", "response": {"formContext": "zzz", "transactionID": 123456}, "sideEffect": { "url": "http://localhost:3000/wh/sibs", "method": "post", "body": { "merchantTransactionId": "{{merchantTransactionId}}"} } } ]
```


