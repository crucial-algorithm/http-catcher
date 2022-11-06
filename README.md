#Simple HTTP catcher for e2e testing support

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
