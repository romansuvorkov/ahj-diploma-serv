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
// const msgArr = [
//   { type: 'text',
//     favorite: false,
//     msg: '1',
//     id: '1'},
//   { type: 'text',
//     favorite: false,
//     msg: '2',
//     id: '2'},
//   { type: 'text',
//     favorite: false,
//     msg: '3',
//     id: '3'},
//   { type: 'text',
//     favorite: false,
//     msg: '4',
//     id: '4'},
//   { type: 'text',
//     favorite: false,
//     msg: '5',
//     id: '5'},
//   { type: 'text',
//     favorite: false,
//     msg: '6',
//     id: '6'},
//   { type: 'text',
//     favorite: false,
//     msg: '7',
//     id: '7'},
//   { type: 'text',
//     favorite: false,
//     msg: '8',
//     id: '8'},
//     { type: 'text',
//     favorite: false,
//     msg: '9',
//     id: '9'},
//   { type: 'text',
//     favorite: false,
//     msg: '10',
//     id: '10'},
//   { type: 'text',
//     favorite: false,
//     msg: '11',
//     id: '11'},
//   { type: 'text',
//     favorite: false,
//     msg: '12',
//     id: '12'},
//   { type: 'text',
//     favorite: false,
//     msg: '13',
//     id: '13'},
//   { type: 'text',
//     favorite: false,
//     msg: '14',
//     id: '14'},
//   { type: 'text',
//     favorite: false,
//     msg: '15',
//     id: '15'},
//   { type: 'text',
//     favorite: false,
//     msg: '16',
//     id: '16'},
//     { type: 'text',
//     favorite: false,
//     msg: '17',
//     id: '17'},
//   { type: 'text',
//     favorite: false,
//     msg: '18',
//     id: '18'},
//   { type: 'text',
//     favorite: false,
//     msg: '19',
//     id: '19'},
//   { type: 'text',
//     favorite: false,
//     msg: '20',
//     id: '20'},
//   { type: 'text',
//     favorite: false,
//     msg: '21',
//     id: '21'},
//   { type: 'text',
//     favorite: false,
//     msg: '22',
//     id: '22'},
//   { type: 'text',
//     favorite: false,
//     msg: '23',
//     id: '23'},
//   { type: 'text',
//     favorite: false,
//     msg: '24',
//     id: '24'},
//     { type: 'text',
//     favorite: false,
//     msg: '25',
//     id: '25'},
//   { type: 'text',
//     favorite: false,
//     msg: '26',
//     id: '26'},
//   { type: 'text',
//     favorite: false,
//     msg: '27',
//     id: '27'},
//   { type: 'text',
//     favorite: false,
//     msg: '28',
//     id: '28'}
// ];

// router.get('/msgArr', async (ctx, next) => {
//   ctx.response.body = JSON.stringify(msgArr);
//   console.log('Message sended to frontend');
// });

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

wsServer.on('connection', (ws, req) => {
  ws.on('message', msg => {
    // const newObj = {text: msg, id: uuid.v4()};
    const newMessage = JSON.parse(msg);
    newMessage.id = uuid.v4();
    msgArr.push(newMessage);
    // console.log(msgArr);
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
