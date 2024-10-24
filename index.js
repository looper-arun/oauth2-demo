const express = require('express');
const bodyParser = require('body-parser');
const OAuth2Server = require('oauth2-server');
const {Request, Response} = OAuth2Server

const db = {accessTokens: {}}

const app = express();
const port = process.env.PORT || 3000

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// In-memory token storage for demo purposes
const oauth = new OAuth2Server({
    model: {
        getClient: function(clientId, clientSecret) {
            const clients = [
                {
                    clientId: 'client1',
                    clientSecret: 'secret',
                    grants: ['password', 'client_credentials']
                }
            ];
            var clientInfo = clients.find(c => c.clientId === clientId && c.clientSecret === clientSecret);
            return clientInfo 
        },
        getUser: function(username, password) {
            const users = [
                { id: 1, username: 'john', password: 'password123' }
            ];
            return users.find(user => user.username === username && user.password === password);
        },
        saveToken: function(token, client, user) {
            const resp = {
                ...token,
                client,
                user
            }
            if (token.accessToken) {
                db.accessTokens[token.accessToken] = resp
                setTimeout(() => {
                    delete db.accessTokens[token.accessToken]
                }, 10000) // 10 sec
            }
            return resp;
        },
        getAccessToken: function(token) {
            // Normally you'd query a database for access tokens
            if (!db.accessTokens[token]) {
                return
            }
            return {
                ...db.accessTokens[token],
                client: { id: 'client1' },
                user: { id: 1 },
                accessTokenExpiresAt: new Date(Date.now() + 10000) // 10 sec expiry
            }
        },
        getUserFromClient: function(client) {
          return client
        },
        // These are placeholders for the example
        revokeToken: () => true,
        verifyScope: () => true,
        getRefreshToken: () => null
    }
});

app.post('/token', (req, res) => {
    const request = new Request(req);
    const response = new Response(res);
    oauth
        .token(request, response)
        .then(token => {
            token = {...token, access_token: token.accessToken}
            var resp = res.json(token)
            return resp
        })
        .catch(err => res.status(500).json(err));
});

// A protected route
app.get('/secure', (req, res) => {
    const request = new Request(req);
    const response = new Response(res);

    oauth
        .authenticate(request, response)
        .then(() => res.json({ message: 'You have access!' }))
        .catch(err => res.status(401).json(err));
});

app.listen(port, () => {
    console.log(`OAuth2 server is running on http://localhost:${port}`);
});
