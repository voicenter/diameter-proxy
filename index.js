'use strict';
const fastify = require('fastify')({
    logger: true
})
const diameter = require('diameter');


var HOST = '127.0.0.1';
var PORT = 3868;

var options = {
    beforeAnyMessage: diameter.logMessage,
    afterAnyMessage: diameter.logMessage,
    port: PORT,
    host: HOST
};




fastify.get('/', async (request, reply) => {

    var socket = diameter.createConnection(options, function() {
        var connection = socket.diameterConnection;
        var request = connection.createRequest('Diameter Common Messages', 'Capabilities-Exchange');
        request.body = request.body.concat([
            [ 'Origin-Host', 'gx.pcef.example.com' ],
            [ 'Origin-Realm', 'pcef.example.com' ],
            [ 'Vendor-Id', 10415 ],
            [ 'Origin-State-Id', 219081 ],
            [ 'Supported-Vendor-Id', 10415 ],
            [ 'Auth-Application-Id', 'Diameter Credit Control Application' ]
        ]);
        connection.sendRequest(request).then(function(response) {

            let proxyResponse=diameterResponseParse(response)
            console.log('  response: ' ,proxyResponse);
            reply.type('application/json').code(200)
            reply.send( proxyResponse)
            // handle response
        }, function(error) {
            console.log('Error sending request: ' + error);
        });
    });
    // Handling server initiated messages:
    socket.on('diameterMessage', function(event) {
        console.log("On diameterMessage",event);

    });
    socket.on('error', function(err) {
        console.log(err);
    });


})

fastify.listen(8068,'0.0.0.0', (err, address) => {
    if (err) throw err
    fastify.log.info(`server listening on ${address}`)
})



function diameterResponseParse( diameterResponse ) {
    let Response = {}
    if(diameterResponse&&diameterResponse.constructor.name==="Object"&&diameterResponse.body.constructor.name==="Array"){
        diameterResponse.body.forEach(function (avp) {
            try{
                Response[avp[0]] = avp[1]
            }catch (e) {
                console.error("avp parsing error",avp)
            }

        })
    }
    if(diameterResponse&&diameterResponse.constructor.name==="Object" && diameterResponse.header.constructor.name==="Object"){
            try{
                Response.header = diameterResponse.header
            }catch (e) {
                console.error("header parsing error",avp)
            }
    }

    return Response

}
