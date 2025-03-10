Welcome to the OBP API Explorer II
=================================

# ABOUT

This application is used to explore OBP APIs and interact with the data and services in the context of the logged in user.

This application will gradually replace the original API Explorer. Long live the API Explorer!



## Install the Prerequisite Software
  * required: { node: `>=16.14` }
  * required: { npm: `>=8.0.0` }

### Development Project Setup

  * Setup your .env file (see .env.example)

##### Install dependencies

```sh
yarn install
```
or
```sh
npm install
```

##### Compile and Hot-Reload for Development

```sh
yarn dev
```
or
```sh
npm run dev
```

##### Get a Consumer Key for the OBP-API

API Explorer needs a Consumer Key / Secret to access the Open Bank Project API with OAuth.
To get this Consumer, go to the Portal of OBP-API, login and "Get a Consumer Key".
The callback URL (if running locally) should be http://localhost:5173/api/callback
Copy and paste the Consumer Key and Consumer Secret and add it to your .env file here.
You can use .env.example as a basis of your .env file. 



##### ~~Run Unit Tests with [Vitest](https://vitest.dev/)~~

<strike>

```sh
yarn test:unit
```
</strike>

or
<strike>

```sh
npm test:unit
```
</strike>

## Compile and Minify for Production

##### Build 

```sh
npm run build
```

##### Build Server 

```sh
npm run build-server
```



##### Start the backend server
```sh
npx ts-node <path-to-your-install>/server/app.js
```

##### Check the status of API-Explorer II back-end
```
Please find a message at a log file similar to this one:

Backend is running. You can check a status at http://localhost:8085/api/status

and use the link to check the status
```


##### Nginx deployment

```config
server {
    # Frontend
    location / {
        root    /path_to_dist/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API
    location /api {
        proxy_pass http://localhost:8085;
    }
}
```

Note: if you have issues with session stickyness / login issues, enable #DEBUG=express-session in your .env
and if you see messages like these in the log,

```
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session no SID sent, generating session
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session saving 5JIW_dx9CG8qs0OK4iv7Pn2Kg2huZuvQ
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session not secured
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session split response
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session saving -yf0uzAZf5mP9JVYov9oMR7CxQLnO4wm
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session not secured
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session no SID sent, generating session
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session saving nballQYMYZRn_HG0enM2RIPdv7GAdzJc
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session not secured
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session no SID sent, generating session
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session no SID sent, generating session

```

then make sure your NGINX config includes the $scheme: 

```

proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

```

so that Node knows that the cookies have been sent securely over https.

# Running Opey
If you want to run Opey locally you'll need to have a local instance running. The repo can be found [here](https://github.com/OpenBankProject/OBP-Opey). 

You will need to create a public-private key pair using open ssl (minimum 2048 bits).
1. create the directory ./server/cert
  ```
  mkdir ./server/cert
  cd ./server/cert  
  ```
2. Generate the public private key pair inside the ./server/cert directory
```
openssl genrsa -out private_key.pem 2048
openssl rsa -in private_key.pem -pubout -out public_key.pem
```
3. Copy the public key to Opey top level directory 
```
cp public_key.pem {path-to-your-opey-install}/
```

# Building the frontend container

As the frontend environment is read at build time, we need to reprocess the values 
at container runtime. 
This is done here: Dockerfiles/prestart.go
overwriting the values set here: Dockerfiles/frontend_build.env
Any newly introduced environment variables should be added to the prestart.go and frontend_build.env files accordingly.
# LICENSE

This project is licensed under the AGPL V3 (see NOTICE) and a commercial license from TESOBE.

