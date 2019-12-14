import { App } from './app';

var app = new App();

import { GetServerSideRule } from './component/abr';
import { MediaPlayer } from 'dashjs';
import readingTime from 'reading-time';


const LARGE_BUFFER_TIME = 500;


function updateAbrSettings(player) {
    player.updateSettings({
        'streaming': {
            'abr': {
                'useDefaultABRRules': false
            },
            'stableBufferTime': LARGE_BUFFER_TIME, // we use this to request continuously
            'bufferTimeAtTopQuality': LARGE_BUFFER_TIME // we use this to request continously
        },
        'bufferAheadToKeep' : LARGE_BUFFER_TIME,
        'bufferToKeep' : LARGE_BUFFER_TIME,
        'liveDelayFragmentCount' : 50,
    });
    console.log(player.getSettings());
    player.addABRCustomRule(
        'qualitySwitchRules', 
        'ServerSideRule', 
        GetServerSideRule()
    );
}


function init() {
    let url = "https://www.example.org/manifest.mpd";
    let player = MediaPlayer().create();
    let video = document.querySelector('#videoPlayer'); 
    app.withPlayer();

    updateAbrSettings(player);
    player.initialize(video, url, true);
    app.start();
}


window.calcRT = ev => { 
    var stats = readingTime(ev.value).text;
    document.getElementById("readingTime").innerText = stats;
};
document.addEventListener("DOMContentLoaded", init);
