const express = require("express")
const path = require('path')
const bodyParser = require("body-parser")
const {Datastore} = require('@google-cloud/datastore');
const axios = require("axios")
const app = express()

const datastore = new Datastore();

app.use(bodyParser.urlencoded({extended: true}));

app.get('/user', function(req, res){
    res.sendFile(path.join(__dirname) + '/views/index.html');
});

app.post('/usercity', async function(req, res) {
    let user = req.body.user
    let cityName = req.body.cityName
    let string = "User and City combo already exists";

    const userTransaction = datastore.transaction();
    try{
        await userTransaction.run();
        const [userCityCheck] = await datastore.runQuery(datastore.createQuery('UserCities').filter('user', '=', user).filter('city', '=', cityName));
        if(userCityCheck[0] == undefined){
            let entityKey = datastore.key(['UserCities', `${user}_${cityName}`]);
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
        await userTransaction.commit();
    } catch(err){
        await userTtransaction.rollback();
    }

    const cityTransaction = datastore.transaction();
    try{
        const [cityCheck] = await datastore.runQuery(datastore.createQuery('City').filter('name', '=', cityName));
        if(cityCheck[0] == undefined){
            let cityEntityKey = datastore.key(['City', `City_${cityName}`]);
            let cityEntity = {
                key: cityEntityKey,
                data: {
                    name: cityName,
                },
            };
            datastore.save(cityEntity);
        };
        await cityTransaction.commit();
    } catch(err){
        await cityTransaction.rollback();
    }
    

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

    cities.forEach(async city => {
        const url1 = `https://api.openweathermap.org/data/2.5/weather?q=${city.name}&appid=d248ede03a6ab01b39c2b33e5adc019c&units=metric`
        const url2 = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city.name}/today?unitGroup=metric&elements=name%2Ctemp%2Cdescription&include=fcst%2Ccurrent&key=8VKGYLZHR73EHPUMQURTDB6Z9&contentType=json`
        const url3 = `https://api.weatherbit.io/v2.0/current?city=${city.name}&key=a73072f87c7c4f1ca87aa7d12b357afb`
        await axios.all([axios.get(url1), axios.get(url2), axios.get(url3)]).then(axios.spread(function(res1, res2, res3) {
            const temp1 = parseFloat(res1.data.main.temp);
            const des = res1.data.weather[0].description;
            const temp2 = parseFloat(res2.data.currentConditions.temp);
            const temp3 = parseFloat(res3.data.data[0].app_temp);


            let avgTemp = (temp1 + temp2 + temp3)/3;
            
            const entityKey = datastore.key('Weather')
            
            const entity = {
                key: entityKey,
                data: {
                    city: city.name,
                    temp: avgTemp,
                    des: des,
                    date: new Date(),
                },
            };
            
            datastore.save(entity);
        }));
    });
    res.sendStatus(200)
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, _ => {
    console.log(`App deployed at Port ${PORT}`);
});
