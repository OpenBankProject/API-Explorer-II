Welcome to the OBP API Explorer II
=================================

# ABOUT

This application is used to explore OBP APIs and interact with the data and services in the context of the logged in user.

This application will gradually replace the original API Explorer. Long live the API Explorer!



## Install the Prerequisite Software
  * required: { node: `>=16.14` }
  * required: { npm: `>=8.0.0` }

### Development Project Setup

  * Setup your .env (see .env.example)

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


##### Lint with [ESLint](https://eslint.org/)

```sh
yarn lint
```
or
```sh
npm lint
```

##### Format with [Prettier](https://prettier.io/)

```sh
yarn format
```
or
```sh
npm format
```

## Compile and Minify for Production

##### Build the frontend

```sh
yarn build
```
or
```sh
npm build
```

##### Build the backend

```sh
yarn build-server
```
or
```sh
npm build-server
```

##### Start the backend server
```sh
your-absolute-path-to-server-dist> node app.js
```

##### Nginx deployment

```config
server {
    # Frontend
    location / {
        root    /your_absolute_path_to_dist/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API
    location /api {
        proxy_pass http://localhost:8085;
    }
}
```

```sh
nginx -s reload //Restart your nginx
```


# LICENSE

This project is licensed under the AGPL V3 (see NOTICE) and a commercial license from TESOBE.

