# http-catcher
Simple http catcher created to support e2e tests

Endpoints:
|Method | URL | Description |
|---|---|---|
|POST | http://localhost:3001/ | Post any payload to be "stored" (previous payload will be overwritten) - tested with JSON payloads only |
|GET |  http://localhost:3001/ | Read last message sent with POST |
|GET |  http://localhost:3001/clear | Clear last message sent (if needed) |

Test locally:
```shell
docker build -t http-catcher .
docker run http-catcher
```


Build to push to docker hub:
```shell
docker build --platform linux/amd64  -t filipeutter/http-catcher .
docker push filipeutter/http-catcher
```