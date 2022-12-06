const express = require("express")
const path = require('path')
const bodyParser = require("body-parser")
const {Datastore} = require('@google-cloud/datastore');
const axios = require("axios")
const app = express()
const {PubSub} = require('@google-cloud/pubsub');
const avro = require('avro-js');
const fs = require('fs');

const datastore = new Datastore();
const pubsub = new PubSub('infinite-glow-365216');
const topic_cities = pubsub.topic('cities');
const topic_conditions = pubsub.topic('conditions');
const schema_definition = fs
    .readFileSync('schemas/conditions.avsc')
    .toString();
const schema_type = avro.parse(schema_definition);

app.use(bodyParser.json());

app.post('/messageHandler', async (req, res) => {
    const message = req.body ? req.body.message : null;
    if (message) {
        const buffer = Buffer.from(message.data, 'base64');
        const data = buffer ? buffer.toString() : null;
        console.log(`Message handler ${data}`);
        const url1 = `https://api.openweathermap.org/data/2.5/weather?q=${data}&appid=d248ede03a6ab01b39c2b33e5adc019c&units=metric`
        const url2 = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${data}/today?unitGroup=metric&elements=name%2Ctemp%2Cdescription&include=fcst%2Ccurrent&key=8VKGYLZHR73EHPUMQURTDB6Z9&contentType=json`
        const url3 = `https://api.openweathermap.org/data/2.5/weather?q=${data}&appid=d248ede03a6ab01b39c2b33e5adc019c&units=metric`
        
        await axios.all([axios.get(url1), axios.get(url2), axios.get(url3)]).then(axios.spread(function(res1, res2, res3) {
            const temp1 = parseFloat(res1.data.main.temp);
            const des = res1.data.weather[0].description;
            const temp2 = parseFloat(res2.data.currentConditions.temp);
            const temp3 = parseFloat(res1.data.main.temp);
            //const temp3 = parseFloat(res3.data.data[0].app_temp);

            let avgTemp = (temp1 + temp2 + temp3)/3;
            
            const entityKey = datastore.key('Weather');
            
            const entity = {
                key: entityKey,
                data: {
                    city: data,
                    temp: avgTemp,
                    des: des,
                    date: new Date(),
                },
            };
            datastore.save(entity);

            let conditions = {
                "country": res1.data.sys.country,
                "pressure": parseFloat(res1.data.main.pressure),
                "humidity": parseFloat(res1.data.main.humidity),
                "sunrise": res1.data.sys.sunrise.toString(),
                "sunset": res1.data.sys.sunset.toString()
            };
            let dataBuffer = Buffer.from(schema_type.toString(conditions))
            topic_conditions.publish(dataBuffer)
        }));
    };
    return res.sendStatus(204);
});

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
        let weatherQuery = datastore.createQuery('Weather').filter('city', '=', e.city).limit(1);
        let [weather] = await datastore.runQuery(weatherQuery);
        string += `${e.city}: ${weather[0].des} ${weather[0].temp}<br>`;
        console.log(`${e.city}: ${weather[0].des} ${weather[0].temp}`);
    })
    res.send(string);
});

app.get('/citiesweather', async function(req, res) {
    const query = datastore.createQuery('City').order('name');
    const [cities] = await datastore.runQuery(query);

    cities.forEach(city => {
        const dataBuffer = Buffer.from(city.name);
        topic_cities.publishMessage({ data: dataBuffer });
    });

    res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, _ => {
    console.log(`App deployed at Port ${PORT}`);
});
