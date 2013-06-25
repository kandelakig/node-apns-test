var fs   = require('fs');
var tls  = require('tls')

var closed = false;

exports.test = function () {
  connect()
}

function connect() {
  var socket = tls.connect({
    host: 'gateway.push.apple.com',
    port: 2195,
    pfx: fs.readFileSync('IconSkins_Dev.p12'),
    rejectUnauthorized: false
  }, function() {
    console.log('Connection established')
    wait(10000)
    // sendPush(socket, {
    //   id: 1,
    //   token: '8eaddd1ee0fab6368c1669abec6f8df6119edc2315f96acde82fd4220b0f6387',
    //   message: 'Test-1',
    //   badge: 1,
    //   sound: 'default'
    // })
    // sendPush(socket, {
    //   id: 2,
    //   token: 'd8608a980063638882327efe2eb90be77d6209ce39083d7a530ef82b2c4dde9f',
    //   message: 'Test-2',
    //   badge: 1,
    //   sound: 'default'
    // })
    // sendPush(socket, {
    //   id: 9,
    //   token: '0000000000000000000000000000000000000000000000000000000000000000',
    //   message: 'bad request',
    //   badge: 1,
    //   sound: 'default'
    // })
  })

  socket.on('data', console.log)

  socket.on('close', function() {
    console.log('Connection was closed')
    closed = true;
  })
  socket.on('error', function(err) {
    console.error('Error occured', err)
    closed = true;
  })
  socket.on('clientError', function(err) {
    console.error('Client error occured', err)
    closed = true;
  })
}

function sendPush(socket, notification) {
  var id = notification.id
  var token = new Buffer(notification.token.replace(/[^0-9a-f]/gi, ""), "hex")
  var encoding = notification.encoding || 'utf8'
  var payload = JSON.stringify({
    alert: {
      body: notification.message,
      "action-loc-key": 'BOOM'
    },
    badge: notification.badge,
    sound: notification.sound
  })
  var messageLength = Buffer.byteLength(payload, encoding)
  var expiry = notification.expiry || 0

  data = new Buffer(1 + 4 + 4 + 2 + token.length + 2 + messageLength)
  var position = 0;
  // Command
  data[position] = 1;
  position++;
  // Identifier
  data.writeUInt32BE(id, position);
  position += 4;
  // Expiry
  data.writeUInt32BE(expiry, position);
  position += 4;
  // Token Length
  data.writeUInt16BE(token.length, position);
  position += 2;
  // Device Token
  position += token.copy(data, position, 0);
  // Payload Length
  data.writeUInt16BE(messageLength, position);
  position += 2;
  //Payload
  position += data.write(payload, position, encoding);

  console.log(data.toString())

  return socket.write(data);
}

function wait(n) {
  if (closed || n === 0) return
  console.log(n)
  process.nextTick(wait.bind(undefined, n-1))
}

exports.connect = connect;