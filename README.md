
# Description

This is a custom implementation of German board game "[Mensch ärgere Dich nicht](https://en.wikipedia.org/wiki/Mensch_%C3%A4rgere_Dich_nicht)" (back-end part). When it will be done, users can play together (up to 4 players) and/or play with a bots.

  

# Goal

The main goal of this project is to create Smart TV multiplayer game, that's why there is as much as possible logic placed in the backend side (e.g. user don't throw the dice as navigation is not comfortable n TVs), but server does automatically.  

# How to run?
## npm version
To run server you should:
- have installed node
- install required modules: `npm install`
- execute one of commands in the terminal:
	- `npm run dev` - run developer mode with `nodemon`
	- `npm start` - run common mode with `node`

## Docker version
To run server as container you should:
- have installed docker
- build docker image of the service. Been in project's folder execute: `docker build . -t api`
- execute command in the terminal:
-  `docker run -p 3001:3001 -d api` - run container based on `api` image.

## Stack version
I you want to build full stack (UI + API) follow [next](https://github.com/DmytroCh/game-front-end#docker-compose-version) instruction.
