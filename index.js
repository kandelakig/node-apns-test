var fs   = require('fs')
var tls  = require('tls')

var closed = false

var Errors = {
  0: 'No errors encountered',
  1: 'Processing error',
  2: 'Missing device token',
  3: 'Missing topic',
  4: 'Missing payload',
  5: 'Invalid token size',
  6: 'Invalid topic size',
  7: 'Invalid payload size',
  8: 'Invalid token',
  10: 'Shutdown',
  255: 'None (unknown)'
}

var host = 'gateway.sandbox.push.apple.com'
var port = 2195

function test() {
  connect()
}

function connect() {
  console.log('Reading certificate and private key data')
  var pfxData = fs.readFileSync('cert.p12')
  console.log('Trying to connect to ' + host + ':' + port)
  var socket = tls.connect({
    host: host,
    port: port,
    pfx: pfxData,
    rejectUnauthorized: false
  }, function() {
    console.log('Connection established')
    wait(10)
    sendPush(socket, {
      id: 99999,
      token: '8eaddd1ee0fab6368c1669abec6f8df6119edc2315f96acde82fd4220b0f6387',
      message: 'Test-1',
      badge: 1,
      sound: 'default'
    })
    sendPush(socket, {
      id: 2,
      token: 'd8608a980063638882327efe2eb90be77d6209ce39083d7a530ef82b2c4dde9f',
      message: 'Test-2',
      badge: 1,
      sound: 'default'
    })
    sendPush(socket, {
      id: 9,
      token: '0000000000000000000000000000000000000000000000000000000000000000',
      message: 'bad request',
      badge: 1,
      sound: 'default'
    })
  })

  socket.on('data', function(data) {
    if (data instanceof Buffer) {
      if (data.readInt8(0) === 8) {
        var errCode = data.readInt8(1)
        var errMessage = Errors[errCode] || 'UNKNOWN'
        console.error('Error received from APNS for message #' + data.readInt32BE(2) + ': ' + errCode + ' - ' + errMessage)
      } else {
        console.error('Unknown error received from APNS')
      }
    } else {
      console.log(data)
    }
  })

  socket.on('close', function() {
    console.log('Connection was closed')
    closed = true
  })
  socket.on('error', function(err) {
    console.error('Error occured', err)
    closed = true
  })
  socket.on('clientError', function(err) {
    console.error('Client error occured', err)
    closed = true
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
  var position = 0
  // Command
  data[position] = 1
  position++
  // Identifier
  data.writeUInt32BE(id, position)
  position += 4
  // Expiry
  data.writeUInt32BE(expiry, position)
  position += 4
  // Token Length
  data.writeUInt16BE(token.length, position)
  position += 2
  // Device Token
  position += token.copy(data, position, 0)
  // Payload Length
  data.writeUInt16BE(messageLength, position)
  position += 2
  //Payload
  position += data.write(payload, position, encoding)

  return socket.write(data)
}

function wait(n) {
  if (closed || n === 0) return
  setTimeout(wait.bind(undefined, n-1), 100)
}

exports.test = test
exports.connect = connect