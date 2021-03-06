const http = require('http');
const path = require('path');
const Koa = require('koa');
const Router = require('koa-router');
const koaBody = require('koa-body');
const koaStatic = require('koa-static');
const fs = require('fs');
const uuid = require('uuid');
const WS = require('ws');
const app = new Koa();
const public = path.join(__dirname, '/public');


app.use(koaStatic(public));
app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUD, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }

    ctx.response.status = 204;
  }
});

app.use(koaBody({
  text: true,
  urlencoded: true,
  multipart: true,
  json: true,
}));

const router = new Router();
const server = http.createServer(app.callback())
const wsServer = new WS.Server({ server });
const port = process.env.PORT || 7070;
server.listen(port);
app.use(router.routes()).use(router.allowedMethods());

const msgArr = [];

router.get('/msgArr', async (ctx, next) => {
  const output = [];
  for (item of msgArr) {
    if (item.favorite === 'true') {
      output.push(item);
    }
  }
  console.log(output);
  ctx.response.body = JSON.stringify(output);
  console.log('Favorites sended to frontend');
});

router.get('/msgArr/:numb', async (ctx, next) => {
  let length = ctx.params.numb;
  let startIndex = null;
  let output = [];
  if (length <= msgArr.length) {
    startIndex = msgArr.length - length;
    output = msgArr.slice(startIndex, startIndex + 10);
  } else {
    if ((length - msgArr.length) < 10) {
      console.log('work 2');
      let index = msgArr.length % 10;
      startIndex = 0;
      length = 0;
      output = msgArr.slice(startIndex, index);
    }
  }
  ctx.response.body = JSON.stringify(output);
});

router.post('/msgArr', async (ctx, next) => {
  msgArr.push({...ctx.request.body, id: uuid.v4()});
  console.log('Message added');
  console.log(msgArr);
  ctx.response.status = 204
});

router.patch('/favorite', async (ctx, next) => {
  const { id, status } = ctx.request.query;
  const messageIndex = msgArr.findIndex((item) => item.id === id)
  msgArr[messageIndex].favorite = status;
  console.log(msgArr[messageIndex]);
  ctx.response.status = 204
});

wsServer.on('connection', (ws, req) => {
  ws.on('message', msg => {
    // const newObj = {text: msg, id: uuid.v4()};
    const newMessage = JSON.parse(msg);
    newMessage.id = uuid.v4();
    msgArr.push(newMessage);
    console.log(msgArr);
    [...wsServer.clients]
    .filter(o => {
      return o.readyState === WS.OPEN;
    })
    .forEach(o => o.send(JSON.stringify(newMessage)));
  });
  ws.on('close', msg => {
    [...wsServer.clients]
    .filter(o => {
      return o.readyState === WS.OPEN;
    })
    .forEach(o => o.send(JSON.stringify({type: 'delete'})));
    ws.close();
  });
 
});
