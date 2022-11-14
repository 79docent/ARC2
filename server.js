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
    let string = "User and City combo already exists";

    const [userCityCheck] = await datastore.runQuery(datastore.createQuery('UserCities').filter('user', '=', user).filter('city', '=', cityName))
    if(userCityCheck[0] == undefined){
        let entityKey = datastore.key('UserCities')
        let entity = {
            key: entityKey,
            data: {
                city: cityName,
                user: user,
            },
        };
        datastore.save(entity);
        string = "Success"
    }

    const [cityCheck] = await datastore.runQuery(datastore.createQuery('City').filter('name', '=', cityName))

    if(cityCheck[0] == undefined){
        let cityEntityKey = datastore.key('City')
        let cityEntity = {
            key: cityEntityKey,
            data: {
                name: cityName,
            },
        };
        datastore.save(cityEntity);
    };

    res.send(string)
});

app.get('/getweather/:user', async function(req, res){
    const cityQuery = datastore.createQuery('UserCities').filter('user', '=', req.params.user);
    const [userCities] = await datastore.runQuery(cityQuery);
    let string = ``;

    userCities.forEach(async e => {
        let weatherQuery = datastore.createQuery('Weather').filter('city', '=', e.city).limit(1)
        let [weather] = await datastore.runQuery(weatherQuery)
        string += `${e.city}: ${weather[0].des} ${weather[0].temp}<br>`
        console.log(`${e.city}: ${weather[0].des} ${weather[0].temp}`)
    })
    res.send(string)
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
