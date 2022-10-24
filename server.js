const express = require("express")
const app = express()
const path = require('path')
const bodyParser = require("body-parser")
const https = require("https")

app.use(bodyParser.urlencoded({extended: true}));



app.get('/updateWeather', function(req, res) {
    res.sendFile(path.join(__dirname) + '/views/index.html');
});

app.post('/', function(req,res) {
    const cityName = req.body.cityName
    const url = "https://api.openweathermap.org/data/2.5/weather?q="+ cityName+"&appid=d248ede03a6ab01b39c2b33e5adc019c&units=metric"
    

    https.get(url, function(response){
        response.on("data", function(data){
            const jsondata = JSON.parse(data)
            const temp = jsondata.main.temp
            const des = jsondata.weather[0].description

            res.write("<h1>The temperature in " + cityName + " is " + temp + " degress Cel. </h1>");
            res.write("<p>The weather description: " + des + "</p>");
            res.send();
            
        })
    })
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, _ => {
    console.log(`App deployed at Port ${PORT}`);
});