import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.prod_host,
    user: process.env.prod_user,
    password: process.env.prod_password,
    database: process.env.prod_database,
    ssl: { rejectUnauthorized: true }
});

export async function testProductionDatabase() {
    const connection = await pool.getConnection();
    try {
        await connection.ping();
        console.log(`Connected to mysql database name: ${process.env.prod_database}`);
    }
    catch (err) {
        console.log("Could not connect to mysql database");
        console.error(err);  // Print the error to debug further
        process.exit(1);
    } finally {
        connection.release();  // Always release the connection
    }
}

export default pool;
