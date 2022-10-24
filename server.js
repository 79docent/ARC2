const express = require("express")
const app = express()
const path = require('path')
const bodyParser = require("body-parser")
const https = require("https")
const {Datastore} = require('@google-cloud/datastore');
var request = require('request');

const datastore = new Datastore();

var counter = 0;

app.use(bodyParser.urlencoded({extended: true}));

app.route('/getweather').get(function(req, res) {
    const cityName = 'Warszawa'
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=d248ede03a6ab01b39c2b33e5adc019c&units=metric`
    let request = request({
        method: 'GET',
        uri: url,
    },function(response){
        response.on("data", function(data){
            const jsondata = JSON.parse(data)
            const temp = jsondata.main.temp
            const des = jsondata.weather[0].description
    
            const kind = 'Entity';
    
            const name = `sampleentity1${counter}`;
    
            const entityKey = datastore.key([kind, name]);
    
            const entity = {
                key: entityKey,
                data: {
                    city: cityName,
                    temp: temp,
                    des: des,
                },
            };
    
            datastore.save(entity)
    
            console.log(`City: ${entity.data.city} Temp: ${entity.data.temp}`)

            counter++;
        });
    });
    request.end()
});

// app.post('/', function(req,res) {
//     let counter = 0;
//     let interval = setInterval(() => {
//         const cityName = req.body.cityName
//         const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=d248ede03a6ab01b39c2b33e5adc019c&units=metric`
        
//         https.get(url, function(response){
//             response.on("data", function(data){
//                 const jsondata = JSON.parse(data)
//                 const temp = jsondata.main.temp
//                 const des = jsondata.weather[0].description
    
//                 const kind = 'Entity';
    
//                 const name = `sampleentity1${counter}`;
    
//                 const entityKey = datastore.key([kind, name]);
    
//                 const entity = {
//                     key: entityKey,
//                     data: {
//                         city: cityName,
//                         temp: temp,
//                         des: des,
//                     },
//                 };
    
//                 datastore.save(entity)
    
//                 console.log(`City: ${entity.data.city} Temp: ${entity.data.temp}`)
                
//                 counter++;

//                 cityName = 'Gdynia'

//                 if(counter >= 3){
//                     clearInterval(interval)
//                 }

//                 res.write("<h1>The temperature in " + cityName + " is " + temp + " degress Cel. </h1>");
//                 res.write("<p>The weather description: " + des + "</p>");
//                 res.send();
//             })
//         })
//     }, 10000)
// });

const PORT = process.env.PORT || 8080;
app.listen(PORT, _ => {
    console.log(`App deployed at Port ${PORT}`);
});