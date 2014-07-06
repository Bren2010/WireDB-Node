// An abstraction for the tracker.
var config  = require('config')
var bencode = require('bencode')
var url     = require('url')
var Q       = require('q')

var http    = require(config.tracker.protocol.slice(0, -1))

var fetch = function (peer_id, port, peers, event) {
    var deferred = Q.defer()

    // Prepare a URL object with the tracker's address and our query.
    var loc = Object.create(config.tracker)
    loc.query = {
        peer_id: peer_id,
        port: port
    }

    if (typeof(peers) == "number") {
        loc.query.peers = peers
    }

    if (event === "started" || event === "stopped") {
        loc.query.event = event
    }

    loc = url.format(loc)

    http.get(loc, function (res) {
        var buff = new Buffer(0)

        res.on('data', function(data) {
            buff = Buffer.concat([buff, data])
        })

        res.on('end', function() {
            try {
                var obj = bencode.decode(buff, 'utf8')
            } catch (err) {
                return deferred.reject(err)
            }

            if (obj === "bye") { // The tracker has stopped this peer.
                return deferred.resolve({stopped: true})
            }

            // Validate the tracker's output.
            var failed = true
            failed &= typeof(obj.failure_reason) !== "undefined"
            failed &= obj.failure_reason !== null

            var ok = true
            ok &= typeof(obj.interval) === "number"
            ok &= typeof(obj.now) === "number"
            ok &= /^[a-f0-9]{40}$/i.test(obj.head)
            ok &= obj.peers instanceof Array
            // Should do more thorough check of obj.peers array.

            if (failed) {
                var err = new Error('Tracker said:  ' + obj.failure_reason)
                deferred.reject(err)
            } else if (!ok) {
                var err = new Error('Tracker response was malformed.')
                deferred.reject(err)
            } else {
                deferred.resolve({
                    interval: obj.interval,
                    now: obj.now,
                    head: obj.head.toLowerCase(),
                    peers: obj.peers
                })
            }
        })
    }).on('error', function (err) {
        deferred.reject(err)
    })

    return deferred.promise
}

/**
* Starts a new session with the tracker.  Should be called first.
*
* @param {String} pid  20-byte self-designated Peer ID.  Must be hexadecimal.
* @param {Number} port Peer's opened port for incoming connections.
*
* @return {Promise} Will resolve with either an error or the tracker's output.
*/
module.exports.start = function (pid, port) {
    return fetch(pid, port, null, 'started')
}

/**
* Keeps a session with the tracker alive.  Should be called on interval.
*
* @param {String} pid  20-byte self-designated Peer ID.  Must be hexadecimal.
* @param {Number} port Peer's opened port for incoming connections.
*
* @return {Promise} Will resolve with either an error or the tracker's output.
*/
module.exports.keepAlive = function (pid, port) {
    return fetch(pid, port)
}

/**
* Terminates a session with the tracker.  Should be called last.
*
* @param {String} pid  20-byte self-designated Peer ID.  Must be hexadecimal.
* @param {Number} port Peer's opened port for incoming connections.
*
* @return {Promise} Will resolve with either an error or the tracker's output.
*/
module.exports.stop = function (pid, port) {
    return fetch(pid, port, null, 'stopped')
}
