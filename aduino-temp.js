const express = require('express');
const app = express();
const bodyParser = require('body-parser');
util =  require('util');
mysql = require('mysql');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.text());
const port = 8001;


const mysql_insert_temp = function (callback, device_id, temperature, sequence_number) {
    var connection = mysql.createConnection(
        {
            host: '18.232.93.89',
            user: 'kdw9502',
            password: 'rkdehddnr1',
            database: 'kdw9502_db'
        }
    )
    connection.connect();
    let query = 'INSERT INTO arduino_temp(timestamp, temperature, sequence_number, device_id) VALUES (%d, %f, %d, %d)';
    query = util.format(query, + new Date(), temperature, sequence_number, device_id);

    connection.query(query, function (error, results, fields) {
        connection.end();
        if (callback)
            callback(results);
    })
}

const mysql_select = function (callback, device_id) {
    var connection = mysql.createConnection(
        {
            host: '18.232.93.89',
            user: 'kdw9502',
            password: 'rkdehddnr1',
            database: 'kdw9502_db'
        }
    )
    connection.connect();
    let query = "";
    let prev_day = new Date();
    prev_day.setDate(prev_day.getDate() - 1);

    if (device_id)
    {
        query = util.format("SELECT * from arduino_temp where device_id = %s AND timestamp > %f;", device_id,+prev_day);
    }
    else{
        query = util.format("SELECT * from arduino_temp where timestamp > %f;", +prev_day);
    }

    connection.query(query, function (error, results, fields) {
        connection.end();
        callback(results);
    })

};

const send_callback = function(req, res)
{
    let json_data = req.query;
    let device_id = json_data["device_id"];
    let temperature = json_data["temperature_value"];
    let sequence_number = json_data["sequence_number"];

    let now_date = new Date();
    now_date = now_date.setHours(now_date.getHours() + 9);
    now_date = now_date.toISOString().split('T');
    let year_month_day = now_date[0];
    let hour_minute_second = now_date[1].split('.')[0];

    try{
        mysql_insert_temp(null,device_id,temperature,sequence_number);
        res.json({"device_id": device_id, "status":"ok", "time": year_month_day + " " + hour_minute_second});
    }
    catch (e) {
        res.json({"device_id": device_id, "status":"fail", "time": year_month_day + " " + hour_minute_second});
    };
}

const received_callback = function(req, res)
{
    let json_data = req.query;
    let device_id = json_data["device_id"];

    let json = {"results":{}};
    mysql_select(function (results) {
        for (let i=0; i < results.length ; i++)
        {
            let now_date = new Date(results[i].timestamp)
            now_date = now_date.setHours(now_date.getHours() + 9);
            now_date = now_date.toISOString().split('T');
            let year_month_day = now_date[0];
            let hour_minute_second = now_date[1].split('.')[0];

            let date_string = year_month_day + " " + hour_minute_second;

                //{sequence  number, time,  온도데이타, device id}
            json["results"][i.toString()] = {"sequence_number": results[i].sequence_number,
                "time": date_string, "temperature": results[i].temperature, "device_id" : results[i].device_id}

        }
        res.json(json);
    }, device_id);
}

app.get('/send', send_callback);
app.get('/receive', received_callback);
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
