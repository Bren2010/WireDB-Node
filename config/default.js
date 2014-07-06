var url = require('url')

module.exports.database = 'memory'
module.exports.errInterval = 1 // Second interval nodes should contact the tracker on if an error occurs.

module.exports.tracker = url.parse('http://localhost:3000/') // Tracker location

module.exports.aia = { // Attribute-Issuing Authority location and key
    loc: url.parse('http://localhost:3001/'),
    key: { // The AIA's master signing key.  (curve, pubKey)
        curve: 'c256',
        pub: '07d736dc6247d1b85c8ac8ed6ca8023c4c5b5849caaa366e020568a9b97c942340dffaddc6727a0c2334054fb3cf81dce2e87cf4c9a23896b3962ce9fcbb2a32'
    }
}

module.exports.sead = { // SEAD configuration
    period: 5000, // Send periodic updates every 5 seconds.
    m: 15, // Maximum network diameter.
    n: 15, // Number of sequence numbers to prepare for.  (= 2^n - 1)
    pbkdf: { // PBKDF settings for keys between peers.
        salt: 'yOJFVshLUL',
        count: 1000
    },
    timeouts: { // ttl = max((n * interval), (m * period)) + grace
        interval: 60000, // On what interval to push up sequence number manually.
        grace: 30000, // Grace to give a node to push a new routing entry.
        cleanup: 10000 // On what interval to clean the routing table.
    },
}
