import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const environment = process.env.NODE_ENV;
const commonConfig = {
    current_env: environment,
};

// Production Configuration
const prodConfig = {
    ...commonConfig,
    dbConfig: {
        mysql: {
            mysql_host: process.env.prod_host,
            mysql_user: process.env.prod_user,
            mysql_password: process.env.prod_password,
            mysql_database: process.env.prod_database,
            mysql_port: process.env.prod_port ? parseInt(process.env.prod_port) : 3306,
            dialectOptions: process.env.prod_ssl === 'true' ? {
                ssl: {
                    rejectUnauthorized: true,
                    ca: process.env.prod_ssl_cert_path
                        ? fs.readFileSync(process.env.prod_ssl_cert_path).toString()
                        : undefined
                }
            } : {}
        },
        APP_PORT: process.env.prod_port ? parseInt(process.env.prod_port) : 8080,
    },
};

export const devConfig = {
    ...commonConfig,
    dbConfig: {
        mysql: {
            mysql_host: process.env.dev_host,
            mysql_user: process.env.dev_user,
            mysql_password: process.env.dev_password,
            mysql_database: process.env.dev_database,
            mysql_port: process.env.dev_port ? parseInt(process.env.dev_port) : undefined,
            dialectOptions: {
                ssl: {
                    rejectUnauthorized: false  // Bypass SSL in dev
                }
            }
        },
        APP_PORT: process.env.dev_port ? parseInt(process.env.dev_port) : undefined,
    },
};

console.log(`Current Environment: ${environment}`);

export const config = (environment === "production" ? prodConfig : devConfig);
