# Deploying to a Linux server with Apache

This guide puts a game made with audiogame utils on the public internet. It uses a server that runs Ubuntu and the Apache 2 web server. Anyone with the link can play. The guide does not cover logins or accounts.

The guide assumes that you can connect to your server with SSH and run commands with `sudo`. It does not assume that you have configured Apache before.

The examples use these names. Replace them with your own:

1. `example.com` is your domain name.
2. `mygame` is the name of your game. The game appears at `https://example.com/mygame/`.
3. `deploy` is the account that you use to sign in to the server.

## Choose a setup

The setup depends on one question: does your game need its own server program?

1. **A browser-only game** runs completely in the player's browser. Most single-player games are this type. The server only sends files: HTML, JavaScript, and sounds. You do Part 1 of this guide.
2. **A multiplayer game** also has a server program, written with `audiogame-utils/net/server`. That program runs all the time on the server and holds the true state of the game. You do Part 1 and Part 2 of this guide.

Your bundler copies audiogame utils into the JavaScript files that it builds. The server does not need audiogame utils for a browser-only game.

## How a request reaches a multiplayer game

For a multiplayer game, each player's browser makes two kinds of requests:

1. The browser opens `https://example.com/mygame/`. Apache sends the game's files from a folder on the server.
2. The game opens a WebSocket to `wss://example.com/mygame/ws`. Apache forwards this connection to your server program, which listens on port 8080 of the server itself.

Apache handles the encryption for both. Your server program never talks to the internet directly. Players cannot reach port 8080 from outside the server.

## Before you begin

Make sure that you have the following:

1. A server that runs Ubuntu 22.04 or later.
2. An account named `deploy` on the server that can sign in with SSH and run `sudo`. Many hosts give you only the `root` account on a new server. In that case, sign in as `root` and run these commands to create the account and copy your SSH key to it:

   ```console
   adduser deploy
   usermod -aG sudo deploy
   rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
   ```

   Then sign out and sign in again as `deploy`. Use this account for the rest of the guide.

3. A domain name that points to the server's IP address. If players might type `www.example.com`, make that name point to the server too.
4. Apache 2.4. To install it, run this command on the server:

   ```console
   sudo apt install apache2
   ```

5. An HTTPS certificate for your domain. A free certificate from Let's Encrypt works. To get one and add it to Apache, run these commands on the server:

   ```console
   sudo apt install certbot python3-certbot-apache
   sudo certbot --apache -d example.com -d www.example.com
   ```

   The certificate covers each name that you give with `-d`. A browser shows a security warning for a name that the certificate does not cover. If you do not use `www.example.com`, leave out `-d www.example.com`.

   Certbot creates a file in `/etc/apache2/sites-available/` whose name ends in `-le-ssl.conf`. This guide calls it your HTTPS site file.

6. For a multiplayer game only: Node.js on the server. Use the current LTS release, and use the same major version that you use on your computer.

## Part 1: Publish the browser files

Do these steps for every game.

### Step 1: Set the public path

If your game is at the root of the domain, such as `https://example.com/`, skip this step.

When the game is in a folder, such as `/mygame/`, tell your bundler. If you use Vite, add `base` to `vite.config.js`:

```js
export default {
	base: '/mygame/',
}
```

Vite writes this path in front of every file that the page loads. Without it, the page asks for `/assets/index.js` when the file is at `/mygame/assets/index.js`, and the browser gets a "404 Not Found" error.

If you load sounds or maps by URL in your code, use relative paths, such as `sounds/step.ogg`. A path that starts with a slash, such as `/sounds/step.ogg`, always starts at the root of the domain.

### Step 2: Build the game

On your computer, in your project folder, run your build command:

```console
npm run build
```

With Vite, the result is a folder named `dist`. It contains everything that the browser needs.

### Step 3: Copy the files to the server

First, on the server, create the folder for the game and give your account permission to write to it:

```console
sudo mkdir -p /var/www/mygame
sudo chown deploy:deploy /var/www/mygame
```

Then, on your computer, copy the contents of `dist` to that folder. This command uses `scp`, which is part of OpenSSH on Windows, macOS, and Linux:

```console
scp -r dist/* deploy@example.com:/var/www/mygame/
```

`dist/*` copies the files in `dist` without the `dist` folder itself. On Windows PowerShell, write the path as `dist\*`.

### Step 4: Tell Apache where the files are

On the server, open your HTTPS site file in a text editor. Inside the `<VirtualHost *:443>` section, add these lines:

```apache
Alias /mygame /var/www/mygame
<Directory /var/www/mygame>
	Require all granted
</Directory>
```

`Alias` connects the address `/mygame` to the folder `/var/www/mygame`. `Require all granted` lets every visitor read the files in that folder. Apache refuses access to folders outside `/var/www/html` until you allow it.

Check the configuration for errors, then load it:

```console
sudo apache2ctl configtest
sudo systemctl reload apache2
```

`configtest` reports "Syntax OK" when the file is correct. If it reports an error, the message gives the file name and line number. Apache keeps the old configuration until a reload succeeds.

### Step 5: Test the game

Open `https://example.com/mygame/` in a browser and play. Make sure that sounds play.

If sounds do not play, open the browser's developer tools and look at the console for errors. A "404 Not Found" error means that a path is wrong. Go back to Step 1.

If your game is browser only, it is now published. To publish a new version, do Step 2 and Step 3 again.

## Part 2: Run the game server

Do these steps for a multiplayer game. They assume that you have read the [networking guide](net.md).

### Step 1: Make the server listen only on the server itself

Your server program must accept connections only from Apache. Set the host to `127.0.0.1`, the address that a computer uses to talk to itself:

```js
import { WebSocketServer } from 'ws'
import { createServer } from 'audiogame-utils/net/server'

const game = createServer()
const sockets = new WebSocketServer({
	host: '127.0.0.1',
	port: Number(process.env.PORT ?? 8080),
	path: '/ws',
})

sockets.on('connection', socket => {
	game.accept(socket)
})
```

`host: '127.0.0.1'` means that only programs on the server can connect. If you leave it out, the program accepts connections from the whole internet, and players can skip Apache and its encryption.

`process.env.PORT ?? 8080` reads the port from the `PORT` environment variable. If the variable is not set, the port is 8080. This lets you change the port without a change to the code.

`path: '/ws'` accepts only connections to the `/ws` path.

### Step 2: Connect from the address of the page

In your browser code, make the WebSocket URL from the address of the page. Then the same code works on your computer and on the server:

```js
import { createReconnectingClient } from 'audiogame-utils/net'

const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
const client = createReconnectingClient({
	url: `${scheme}://${location.host}${import.meta.env.BASE_URL}ws`,
	protocol: true,
})
```

`location.protocol` is `'https:'` on the published site. A page loaded over HTTPS must use `wss`, because browsers block unencrypted connections from a secure page.

`import.meta.env.BASE_URL` is the `base` value from Vite, such as `/mygame/`. With other bundlers, write the path yourself.

On your computer, the development server must forward `/ws` to your server program. In Vite, use the `server.proxy` option with `ws: true`.

### Step 3: Copy the server code to the server

On the server, create a system account for the game. The server program runs as this account, so a bug in the game cannot change other files on the server:

```console
sudo useradd --system --home /srv/mygame --shell /usr/sbin/nologin mygame
sudo mkdir -p /srv/mygame
sudo chown deploy:deploy /srv/mygame
```

`--shell /usr/sbin/nologin` means that nobody can sign in as this account.

Copy your server code and your `package.json` and `package-lock.json` files to `/srv/mygame`. Then, on the server, install the packages that the server program needs:

```console
cd /srv/mygame
npm ci --omit=dev
```

`npm ci` installs the exact versions in `package-lock.json`. `--omit=dev` leaves out development tools, such as the bundler and the test runner.

### Step 4: Run the server program as a service

A systemd service starts your server program when the server starts, and starts it again if it stops. Create the file `/etc/systemd/system/mygame.service` with this content:

```ini
[Unit]
Description=mygame game server
After=network.target

[Service]
User=mygame
Group=mygame
WorkingDirectory=/srv/mygame
Environment=NODE_ENV=production
Environment=PORT=8080
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
```

`ExecStart` is the command that starts the program. Change `server.js` to the file that starts your server. To find the full path of Node.js, run `which node`.

`Restart=always` starts the program again after a crash. `RestartSec=2` waits 2 seconds first.

`WantedBy=multi-user.target` starts the service each time the server starts.

Start the service and make it start automatically:

```console
sudo systemctl daemon-reload
sudo systemctl enable --now mygame
```

`daemon-reload` makes systemd read the new file. `enable --now` starts the service now and each time the server starts.

To see the output of your program, run this command. Press Control+C to stop:

```console
journalctl -u mygame -f
```

### Step 5: Turn on the Apache proxy modules

A proxy is a program that receives a request and sends it on to another program. Apache needs three modules for this. Run these commands on the server:

```console
sudo a2enmod proxy proxy_http proxy_wstunnel
sudo systemctl restart apache2
```

`proxy_wstunnel` is the module that forwards WebSocket connections. Without it, the page loads, but the game cannot connect.

### Step 6: Forward the WebSocket to the server program

Open your HTTPS site file again. Inside the `<VirtualHost *:443>` section, add these lines above the `Alias` line from Part 1:

```apache
ProxyPass /mygame/ws ws://127.0.0.1:8080/ws
ProxyTimeout 3600
```

`ProxyPass` sends every request for `/mygame/ws` to your server program. Apache checks `ProxyPass` rules before `Alias` rules, so this path goes to the server program, and all other paths under `/mygame` come from the folder.

The address starts with `ws://`, without encryption. This is correct. The connection from the browser to Apache uses `wss://`. Apache removes the encryption and sends the connection a short distance, inside the server, to your program.

`ProxyTimeout 3600` lets a connection stay quiet for up to 3600 seconds, which is 1 hour, before Apache closes it.

Check the configuration and load it:

```console
sudo apache2ctl configtest
sudo systemctl reload apache2
```

### Step 7: Test the server

Make sure that your server program listens only on the server itself:

```console
sudo ss -ltnp | grep 8080
```

The output must show `127.0.0.1:8080`. If it shows `0.0.0.0:8080` or `*:8080`, the program accepts connections from the internet. Go back to Step 1.

Then open `https://example.com/mygame/` in two browsers and play together.

## Publish a new version

For each new version, do these steps:

1. Build the game on your computer.
2. Copy the browser files to `/var/www/mygame`.
3. For a multiplayer game, copy the server code to `/srv/mygame`. If `package-lock.json` changed, run `npm ci --omit=dev` again. Then restart the server program:

   ```console
   sudo systemctl restart mygame
   ```

A restart disconnects all players. The reconnecting client connects again by itself. But the new server program starts empty: player sessions, groups, and matches in progress are lost, unless your server program saves them and loads them again.

## Troubleshooting

### The page loads, but sounds or scripts do not

The public path is wrong. Do Step 1 of Part 1 again, then build and copy the files again.

### The game cannot connect to the server

Check these causes, one at a time:

1. The `proxy_wstunnel` module is off. Do Step 5 of Part 2.
2. The path in `ProxyPass` is different from the path in your browser code.
3. The page uses `https`, and the browser code uses `ws`. Use the code in Step 2 of Part 2.
4. The server program is not running. Run `systemctl status mygame` and `journalctl -u mygame` to find out why.

### The browser gets "503 Service Unavailable"

Apache cannot reach your server program. The program is not running, or it listens on a different port. Make sure that the port in `ProxyPass` and the `PORT` value in the service file are the same.

### Players disconnect after a quiet period

Increase `ProxyTimeout`. If you set `protocol: true` in the client, heartbeats keep the connection busy, which also helps.

## Security

1. Always use HTTPS and `wss`. Other people on the network cannot read or change encrypted traffic.
2. Keep your server program on `127.0.0.1`. Apache is then the only way in.
3. Never trust a packet from a player. A player can send any packet. Your server program must check every action. See the security section of the [networking guide](net.md).
4. Install updates for the server regularly with `sudo apt update` and `sudo apt upgrade`.
