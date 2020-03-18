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
        let diameterRequest = CreateDiameterRequest(request,connection)
        connection.sendRequest(diameterRequest).then(function(response) {

            let proxyResponse=diameterResponseParse(response)
            console.log('  response: ' ,proxyResponse);
            reply.type('application/json').code(200)
            reply.send( proxyResponse)
            // handle response
        }, function(error) {
            console.log('Error sending request: ' + error);
        });

         socket.diameterConnection.end();
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

function CreateDiameterRequest(httpReq,connection) {
    let networkDomain= "mnc001.mcc001.3gppnetwork.org"
    let SessionId =getRandomInt(10000000,99999999)
    if(httpReq.body&&httpReq.body["P-Visited-Network-ID"])networkDomain=httpReq.body["P-Visited-Network-ID"]

   if(!httpReq.body || !httpReq.body.command ||!httpReq.body.command =="Capabilities-Exchange" ){
       var request = connection.createRequest('Diameter Common Messages', 300,networkDomain +";"+SessionId);
       request.body = request.body.concat([

           [ 'Destination-Realm', networkDomain ],
           [ 'Auth-Session-State', 0 ],
           [ 'Supported-Vendor-Id', 10415 ],
           [ 'Auth-Application-Id', 'Diameter Credit Control Application' ]
       ]);
   }else if(httpReq.body.command==""){
       var request = connection.createRequest('Diameter Common Messages', 'Capabilities-Exchange');
       request.body = request.body.concat([
           [ 'Origin-Host', networkDomain],
           [ 'Origin-Realm', networkDomain],
           [ 'Vendor-Id', 10415 ],
           [ 'Origin-State-Id', 0 ],
           [ 'Supported-Vendor-Id', 10415 ],
           [ 'Auth-Application-Id', 'Diameter Capabilities-Exchange  Application' ]
       ]);

    }

    return request
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
