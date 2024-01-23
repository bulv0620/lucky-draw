const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require('path');
const names = require('./name')

let zjNames = [
]

function getRandomName(namesArray, thing, flag) {
  // 计算总权重
  const totalWeight = namesArray.reduce((acc, curr) => acc + curr.weight, 0);

  // 生成一个随机数，用于选择名字
  const randomNum = Math.random() * totalWeight;

  // 遍历数组，根据随机数选择名字
  let cumulativeWeight = 0;
  for (const nameObj of namesArray) {
      cumulativeWeight += nameObj.weight;
      if (randomNum <= cumulativeWeight) {

        const curName = nameObj.name

        if(flag && zjNames.find(el => el.name === curName)) {
          return getRandomName(namesArray, thing, flag)
        }
        else {
          if(flag) {
            zjNames.push({
              name: curName,
              thing
            })
          }
          return nameObj.name;
        }
      }
  }
}


const app = express();
app.use('/',express.static(path.join(__dirname,'public')));

app.get('/list', (req, res) => {
  res.send(names.map(el => el.name).join(','))
})

app.get('/zjr', (req, res) => {
  res.send(zjNames.map(el => `${el.name}(${el.thing})`).join(', '))
})

const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });

let timer = null
let thing = ''

io.on("connection", (socket) => {
  console.log('客户端进入')
  socket.on('to-server', (data) => {
    const clientData = JSON.parse(data)
    
    switch (clientData.type) {
      case 'start':
        if(timer) break;
        else {
          timer = setInterval(() => {
            io.emit('to-client', JSON.stringify({
              type: 'gc',
              data: getRandomName(names, clientData.data, false)
            }))
          }, 50)
          thing = clientData.data
        }
        break; 
      case 'end':
        if(!timer) break
        else {
          clearInterval(timer)
          timer = null

          const name = `恭喜: ${getRandomName(names, clientData.data, true)} 获得${thing}!`

          io.emit('to-client', JSON.stringify({
            type: 'jg',
            data: name
          }))
        }
        break;
      case 'cz':
        zjNames = []
        io.emit('to-client', JSON.stringify({
          type: 'cz',
        }))
        break;
      default:
        break;
    }
  })

  socket.on('disconnect', () => {
    console.log('客户端离开')
  })
});

httpServer.listen(4567);