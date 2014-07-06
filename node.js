// WireDB Node
//
// Notes:
// 1.  Proof-of-works will have to be done later.

var config  = require('config')
var crypto  = require('crypto')
var net     = require('net')
var url     = require('url')
var tracker = require('./tracker')
var sead    = require('./sead')

var peer_id = crypto.randomBytes(20).toString('hex')
var head = '0000000000000000000000000000000000000000'
var time = { // A tiny time abstraction.
    difference: 0,
    set: function (now) {
        this.difference = now - Math.floor(Date.now() / 1000)
    },
    get: function () {
        return this.difference + Math.floor(Date.now() / 1000)
    }
}

var router = new sead.Router(time)

console.log('To exit softly, type `exit` and press enter.\n')

console.log('Peer id:  ' + peer_id) // Should peer and node ids be the same?
console.log('Node id:  ' + router.id)

// Start peering server.
server = net.createServer(function (conn) {
    router.feed(conn)
})

server.listen(function () {
    var port = server.address().port

    console.log('Peering server started on port ' + port)

    // Tell the tracker we've joined.
    tracker.start(peer_id, port).then(function (out) {
        console.log('Successfully started a session with the tracker.')

        // Setup
        head = out.head
        time.set(out.now)

        var keepAlive = function (peer_id, port) {
            tracker.keepAlive(peer_id, port).then(function (out) {
                head = out.head
                time.set(out.now)

                tid = setTimeout(keepAlive, out.interval * 1000, peer_id, port)
            }, function (err) {
                console.error(err)
                tid = setTimeout(keepAlive, config.errInterval * 1000, peer_id, port)
            })
        }

        var tid = setTimeout(keepAlive, out.interval * 1000, peer_id, port)

        // Connect to some peers

        // Create a soft exit handler.
        process.stdin.on('data', function (chunk) {
            if (chunk.toString().indexOf('exit') !== -1) {
                console.log('One second...')

                tracker.stop(peer_id, port).catch(function (err) {
                    console.error(err)
                }).then(function () {
                    server.close(function () {
                        console.log('Good bye!')
                        process.exit()
                    })
                })
            }
        })
    }, function (err) {
        console.error(err)
        console.log('Shutting down.')
        server.close()
    })
})
