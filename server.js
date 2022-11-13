const express = require("express")
const app = express()
const path = require('path')
const bodyParser = require("body-parser")
const https = require("https")
const {Datastore} = require('@google-cloud/datastore');

const datastore = new Datastore();

app.use(bodyParser.urlencoded({extended: true}));

app.get('/user', function(req, res){
    res.sendFile(path.join(__dirname) + '/views/index.html');
});

app.post('/usercity', async function(req, res) {
    let user = req.body.user
    let cityName = req.body.cityName
    let entityKey = datastore.key('UserCities')
    let entity = {
        key: entityKey,
        data: {
            city: cityName,
            user: user,
        },
    };

    datastore.save(entity);

    if(!(await datastore.runQuery(datastore.createQuery('City').filter('name', '=', cityName)))){
        let cityEntityKey = datastore.key('City')
        let cityEntity = {
            key: cityEntityKey,
            data: {
                name: cityName,
            },
        };
        datastore.save(cityEntity);
    };

    res.send("Success")
});

app.get('/getweather/:user', async function(req, res){
    const cityQuery = datastore.createQuery('UserCities').filter('user', '=', req.params.user);
    const [userCities] = await datastore.runQuery(cityQuery);

    userCities.forEach(async e => {
        let weatherQuery = datastore.createQuery('Weather').filter('city', '=', e.city).limit(1)
        let [weather] = await datastore.runQuery(weatherQuery)
        res.write(`${e.city}: ${weather.des} ${weather.temp}`)
        console.log(`${e.city}: ${weather.des} ${weather.temp}`)
    })
    res.end()
});

app.get('/citiesweather', async function(req, res) {
    const query = datastore.createQuery('City').order('name');
    const [cities] = await datastore.runQuery(query);

    cities.forEach(city => {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city.name}&appid=d248ede03a6ab01b39c2b33e5adc019c&units=metric`
        https.get(url, function(response){
            response.on("data", function(data){
                const jsondata = JSON.parse(data)
                const temp = jsondata.main.temp
                const des = jsondata.weather[0].description
            
                const entityKey = datastore.key('Weather')
            
                const entity = {
                    key: entityKey,
                    data: {
                        city: city.name,
                        temp: temp,
                        des: des,
                    },
                };
            
                datastore.save(entity)
            });
        });
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, _ => {
    console.log(`App deployed at Port ${PORT}`);
});
