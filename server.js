const express = require("express")
const app = express()
const path = require('path')
const bodyParser = require("body-parser")
const https = require("https")
const {Datastore} = require('@google-cloud/datastore');
const cron = require("node-cron");

const datastore = new Datastore();
const tasks = new Array();

app.use(bodyParser.urlencoded({extended: true}));

function get_weather(user, cityName){
    let task = cron.schedule("*/5 * * * *", () => {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=d248ede03a6ab01b39c2b33e5adc019c&units=metric`
        https.get(url, function(response){
            response.on("data", function(data){
                const jsondata = JSON.parse(data)
                const temp = jsondata.main.temp
                const des = jsondata.weather[0].description
            
                const entityKey = datastore.key('Weather')
            
                const entity = {
                    key: entityKey,
                    data: {
                        user: user,
                        city: cityName,
                        temp: temp,
                        des: des,
                    },
                };
            
                datastore.save(entity)
            
                console.log(`City: ${entity.data.city} Temp: ${entity.data.temp}`)
            });
        });
    });
    task.start();
    let taskObject = {
        "task": task,
        "user": user,
        "city": cityName        
    }
    tasks.push(taskObject)
}

app.route('/getweather/:user/:city').get(function(req, res) {
    let user = req.params.user
    let cityName = req.params.city
    get_weather(user, cityName);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, _ => {
    console.log(`App deployed at Port ${PORT}`);
});