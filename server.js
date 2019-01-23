// Base spotify authentication cloned from: https://github.com/spotify/web-api-auth-examples

let express = require('express'); // Express web server framework
let request = require('request'); // "Request" library
let querystring = require('querystring');
let cookieParser = require('cookie-parser');

const spotify_client_id = process.env.SPOTIFY_CLIENT_ID; // Your client id
const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Your secret
const spotify_redirect_uri = 'http://localhost:8888/callback'; // Or Your redirect uri

// Musixmatch
const musixmatch_api_key = process.env.MUSIXMATCH_API_KEY;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
let generateRandomString = function (length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

let stateKey = 'spotify_auth_state';

let app = express();

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
}).use(cookieParser());


// TODO: Katso että ainoastaan kirjautuneet käyttäjät voivat kutsua tätä
app.get('/lyrics', function (req, res) {

    const artist = req.query.q_artist;
    const track = req.query.q_track;

    request(`http://api.musixmatch.com/ws/1.1/track.search?q_artist=${artist}&q_track=${track}&page_size=3&apikey=${musixmatch_api_key}&f_has_lyrics=true`,
        {json: true},
        (err, res1, body) => {
            if (err) {
                return console.log(err);
            }

            let track_id = "";
            try {
                track_id = body.message.body.track_list[0].track.track_id;
                console.log("id: " + track_id);
            } catch (e) {
                res.send(`Not found.`);
                return;
            }
            request(`http://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=${track_id}&apikey=${musixmatch_api_key}`,
                {json: true},
                (err, res2, body) => {
                    if (err) {
                        return console.log(err);
                    }
                    return res.send(body.message.body.lyrics.lyrics_body);
                });
        });


    `http://api.musixmatch.com/ws/1.1/track.search?q_artist=${artist}&q_track=${track}&page_size=3&apikey=${musixmatch_api_key}`

});

app.get('/login', function (req, res) {

    const state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    const scope = 'user-read-private user-read-email user-read-playback-state';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: spotify_client_id,
            scope: scope,
            redirect_uri: spotify_redirect_uri,
            state: state
        }));
});

app.get('/callback', function (req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        let authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: spotify_redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(spotify_client_id + ':' + spotify_client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {

                const access_token = body.access_token

                const options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: {'Authorization': 'Bearer ' + access_token},
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function (error, response, body) {
                    console.log(body);
                });

                // we can also pass the token to the browser to make requests from there
                res.redirect('http://localhost:3000/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: body.refresh_token
                    }));
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/refresh_token', function (req, res) {
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {'Authorization': 'Basic ' + (new Buffer(spotify_client_id + ':' + spotify_client_secret).toString('base64'))},
        form: {
            grant_type: 'refresh_token',
            refresh_token: req.query.refresh_token
        },
        json: true
    };

    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            res.send({
                'access_token': body.access_token
            });
        }
    });
});

console.log('Listening on 8888');
app.listen(8888);