# LAN WebRTC Video Chat
### Create slef-signed certificate fore internal https server
```shell
openssl genrsa -out selfsigned.key 2048
openssl req -new -key selfsigned.key -out selfsigned.csr
openssl x509 -req -in selfsigned.csr -signkey selfsigned.key -out selfsigned.crt
```
### Run the server
```shell
node server.js
```
### Open the browser
```shell
ipconfig getifaddr en0
https://{YOUR_LAN_IP}:3000
```