const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database_name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
module.exports = db.promise();