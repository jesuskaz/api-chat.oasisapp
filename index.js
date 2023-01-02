const WebSocket = require('ws')
const express = require('express')
const moment = require('moment')
const mysql = require('mysql');

const app = express()
const port = 50005; //port for https

// Connnexion to database

const db = mysql.createConnection({
    hote: "localhost",
    user: "africam",
    password: "Everest@@2022",
    database: "africam_oasis",
});

db.connect((err) => {
    if(err){
        throw err;
        return 
    }
    console.log("DataBase Connected");
});

app.get('/', (req, res) => {
    res.send("Hello World");
});
app.listen(port, () => {
    console.log(`Example app listening at https://oasisapp.tech:${port}`)
});

var  webSockets = {}

const wss = new WebSocket.Server({ port: 6060 }) //run websocket server with port 6060
wss.on('connection', function (ws, req)
{
    var userID = req.url.substr(1) //get userid from URL ip:6060/userid
    var spliting = userID.split("/")
    var receiver = spliting[0]
    var sender = spliting[1]

    var liste = new Object();

    // chat_id, read, date, sendbyuser, users_id, width_uid, message
    var id_of_chat = "SELECT id FROM chat WHERE users_id = " + sender + " AND with_uid = " + receiver + "";
    var id_of_chat2 = "SELECT id FROM chat WHERE users_id = " + receiver + " AND with_uid = " + sender + "";
    // var get_reverse = "SELECT chat_id,users_id, with_uid, sentbyuser, message FROM message JOIN chat ON message.chat_id = chat.id JOIN users ON chat.users_id = users.id WHERE users_id = " + receiver + " AND with_uid = " + sender;

    db.query(id_of_chat, function(err, rx) {
        var id = 0;

        if(Object.keys(rx).length > 0)
        {
            id = rx[0]["id"];

            var get_msg = "SELECT chat_id,users_id, with_uid, sentbyuser, message FROM message JOIN chat ON message.chat_id = chat.id JOIN users ON chat.users_id = users.id WHERE chat_id = " + id;
            db.query(get_msg, function(err, result) {
            console.log(result.length)
            if(result.length > 0)
            {
                var data = result
                liste["conversation"] = data;
                liste["status"] = true;
            }
            console.log(JSON.stringify(liste));
            ws.send(JSON.stringify(liste));
        })
        }
        else
        {
            db.query(id_of_chat2, function(err, rxx) {
                if(Object.keys(rxx).length > 0) 
                {
                    id = rxx[0]["id"];
                    
                    var get_msg = "SELECT chat_id,users_id, with_uid, sentbyuser, message FROM message JOIN chat ON message.chat_id = chat.id JOIN users ON chat.users_id = users.id WHERE chat_id = " + id;
                    db.query(get_msg, function(err, result) {
                        console.log(result.length)
                        if(result.length > 0)
                        {
                            var data = result
                            liste["conversation"] = data;
                            liste["status"] = true;
                        }
                        console.log(JSON.stringify(liste));
                        ws.send(JSON.stringify(liste));
                    })
                }
            })
            console.log("ID ::: " + id)
        }
    })

    webSockets[userID] = ws //add new user to the connection list

    ws.on('message', message => 
    { //if there is any message
        var datastring = message.toString();

        if(datastring.charAt(0) == "{")
        {     
            datastring = datastring.replace(/\'/g, '"');

            var data = JSON.parse(datastring)
            if(data.auth == "chatapphdfgjd34534hjdfk")
            {
                if(data.cmd == 'send')
                {
                    var request = "SELECT * FROM chat WHERE users_id = " +data.userid + " AND with_uid = " +data.receiver_id+ "";
                    var request_inverse = "SELECT * FROM chat WHERE users_id = " +data.receiver_id + " AND with_uid = " +data.userid+ "";
                    var post = {users_id: data.userid, with_uid: data.receiver_id};
                 
                    db.query(request, function (err, res, field) {
                        if(res.length < 1 || res.length != 1)
                        {
                            db.query(request_inverse, function(err, result, field) {       
                                if(result.length < 1 || result.length != 1)
                                {
                                    db.query("INSERT INTO chat SET ?", post, (errr) => {
                                        if(err)
                                        {
                                            console.log("Error ... ");
                                            throw err;
                                        }
                                        else
                                        {
                                            console.log("SEND ... ");
                                        }
                                    });
                                }
                            });
                        }
                    
                        db.query(request, function (err, result, field) {
                      
                            if(result.length >= 1)
                            {
                                var chat_id = result[0].id;

                                var message_storage = {chat_id: chat_id, message: data.msgtext, sentbyuser: data.userid};

                                db.query("INSERT INTO message SET ?", message_storage, (err) => {
                                    if(err)
                                    {
                                        console.log("Error ... ");
                                        throw err;
                                    }
                                    else
                                    {
                                        console.log("SEND ... ");
                                    }
                                });
                            }
                            else
                            {
                                db.query(request_inverse, function(err, re, field) {
                                    if(re.length >= 1)
                                    {
                                        var chat_id = re[0].id;
        
                                        var message_storage = {chat_id: chat_id, message: data.msgtext, sentbyuser: data.userid};
        
                                        db.query("INSERT INTO message SET ?", message_storage, (err) => {
                                            if(err)
                                            {
                                                console.log("Error ... ");
                                                throw err;
                                            }
                                            else
                                            {
                                                console.log("SEND ... ");
                                            }
                                        });
                                    }
                                })
                            }
                        })
                    });

                    var boardws = webSockets[data.userid] //check if there is reciever connection
                    // console.log(boardws)

                    if (boardws)
                    {
                        var cdata = "{'cmd':'" + data.cmd + "','userid':'"+data.userid+"', 'msgtext':'"+data.msgtext+"'}";
                        // var cdata = "{'cmd':'" + data.cmd + "','receiver_id':"+data.receiver_id + ",'userid':"+data.userid+",'msgtext':'"+data.msgtext+"'}";
                        console.log(cdata);
                        boardws.send(cdata); //send message to reciever
                        console.log("SEND SUCCESSFULL");
                        ws.send(data.cmd + ":success");
                    }
                    else
                    {
                        console.log("No reciever user found.");
                        ws.send(data.cmd + ":error");
                    }
                }
                else
                {
                    console.log("No send command");
                    ws.send(data.cmd + ":error");
                }
            }
            else
            {
                console.log("App Authincation error");
                ws.send(data.cmd + ":error");
            }
        }
        else
        {
            console.log("Non JSON type data");
            ws.send(data.cmd + ":error");
        }
    })

    ws.on('close', function () 
    {
        var userID = req.url.substr(1)
        delete webSockets[userID] //on connection close, remove reciver from connection list
        console.log('User Disconnected: ' + userID)
    })
    liste["connexion"] = 'connected'
    ws.send(JSON.stringify(liste)); //innitial connection return message
})

// const WebSocket = require('ws')
// const express = require('express')
// const moment = require('moment')
// const app = express()
// const port = 7878; //port for https

// app.get('/', (req, res) => {
//     res.send("Hello World");
// });

// app.listen(port, () => {
//     console.log(`Example app listening at http://192.168.43.3:${port}`)
// });


// var  webSockets = {}

// const wss = new WebSocket.Server({ port: 6060 }) //run websocket server with port 6060

// wss.on('connection', function (ws, req)  
// {
//     var userID = req.url.substr(1) //get userid from URL ip:6060/userid 
//     webSockets[userID] = ws //add new user to the connection list

//     console.log('User ' + userID + ' Connected ') 
    
//     ws.on('message', message => 
//     { //if there is any message

//         // console.log(message);
//         var datastring = message.toString();
//         if(datastring.charAt(0) == "{")
//         {     

//             datastring = datastring.replace(/\'/g, '"');

//             var data = JSON.parse(datastring)
//             if(data.auth == "chatapphdfgjd34534hjdfk")
//             {
//                 if(data.cmd == 'send')
//                 { 

//                     var boardws = webSockets[data.userid] //check if there is reciever connection
//                     console.log("Check ::: ",boardws)
//                     if (boardws)
//                     {
//                         var cdata = "{'cmd':'" + data.cmd + "','userid':'"+data.userid+"', 'msgtext':'"+data.msgtext+"'}";
//                         console.log(cdata)
//                         boardws.send(cdata); //send message to reciever
//                         ws.send(data.cmd + ":success");
//                     }
//                     else
//                     {
//                         console.log("No reciever user found.");
//                         ws.send(data.cmd + ":error");
//                     }
//                 }
//                 else
//                 {
//                     console.log("No send command");
//                     ws.send(data.cmd + ":error");
//                 }
//             }
//             else
//             {
//                 console.log("App Authincation error");
//                 ws.send(data.cmd + ":error");
//             }
//         }
//         else
//         {
//             console.log("Non JSON type data");
//             ws.send(data.cmd + ":error");
//         }
//     })

//     ws.on('close', function () 
//     {
//         var userID = req.url.substr(1)
//         delete webSockets[userID] //on connection close, remove reciver from connection list
//         console.log('User Disconnected: ' + userID)
//     })
//     ws.send('connected'); //innitial connection return message
// })
