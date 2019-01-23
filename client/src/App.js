import React, {Component} from 'react';
import './App.css';

import SpotifyWebApi from 'spotify-web-api-js';

const spotifyApi = new SpotifyWebApi();


class App extends Component {
    constructor() {
        super();
        const params = this.getHashParams();
        const token = params.access_token;
        if (token) {
            spotifyApi.setAccessToken(token);
        }
        this.state = {
            loggedIn: token ? true : false,
            nowPlaying: {name: 'Not Checked', albumArt: ''},
            lyrics: ''
        }

        if(this.state.loggedIn) {
            this.getNowPlaying();
        }
    }

    getHashParams() {
        var hashParams = {};
        var e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        e = r.exec(q)
        while (e) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
            e = r.exec(q);
        }
        return hashParams;
    }

    getNowPlaying() {
        spotifyApi.getMyCurrentPlaybackState()
            .then((response) => {
                if (typeof response === 'object') {
                    fetch(`http://localhost:8888/lyrics?q_artist=${encodeURIComponent(response.item.artists[0].name)}&q_track=${encodeURIComponent(response.item.name)}`,
                    )
                        .then((lyricResp) => {
                            return lyricResp.text();
                        })
                        .then((data) => {
                            this.setState({
                                lyrics: data,

                            })
                        });


                    this.setState({
                        nowPlaying: {
                            name: response.item.name,
                            albumArt: response.item.album.images[0].url,
                            artist: response.item.artists[0].name,

                        }
                    });
                } else {
                    this.setState({
                        nowPlaying: {
                            name: 'Nothing playing...',
                            artist: 'You',
                            albumArt: '',
                            lyrics: ''
                        }
                    });
                }
            })
    }

    render() {
        let button;
        let add;

        if (this.state.loggedIn) {
            button = <button onClick={() => this.getNowPlaying()}> Reload </button>;
        } else {
            button = <a href='http://localhost:8888/login'> Login to Spotify </a>;
        }

        return (
            <div className="App">
                {button}
                <h1>{this.state.nowPlaying.name}</h1>
                <h4><b>by:</b> {this.state.nowPlaying.artist}</h4>
                <p>{this.state.lyrics}</p>

                <footer>
                    <hr></hr>
                    <p>Created by <a target="_blank" rel="noopener noreferrer" href="https://www.jylhis.com">Jylhis</a>
                        <br></br>using <a target="_blank" rel="noopener noreferrer" href="https://developer.musixmatch.com">Musixmatch API </a> and <a target="_blank" rel="noopener noreferrer" href="https://developer.spotify.com">Spotify API</a></p>
                </footer>
            </div>
        );
    }
}

export default App;
