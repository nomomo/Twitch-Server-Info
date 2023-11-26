// ==UserScript==
// @name        Twitch-Server-Info
// @namespace   Twitch-Server-Info
// @version     0.1.3
// @author      Nomo
// @description Check Twitch server location.
// @icon        https://raw.githubusercontent.com/nomomo/Twitch-Server-Info/master/images/logo.png
// @supportURL  https://github.com/nomomo/Twitch-Server-Info/issues
// @homepageURL https://github.com/nomomo/Twitch-Server-Info/
// @downloadURL https://raw.githubusercontent.com/nomomo/Twitch-Server-Info/master/Twitch-Server-Info.user.js
// @updateURL   https://raw.githubusercontent.com/nomomo/Twitch-Server-Info/master/Twitch-Server-Info.user.js
// @include     *://*.twitch.tv/*
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js
// @run-at      document-start
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_setClipboard
// @grant       unsafeWindow
// @grant       GM_registerMenuCommand
// ==/UserScript==
/*jshint multistr: true */
/* global GM_getValue, GM_setValue, GM_registerMenuCommand, GM_setClipboard, unsafeWindow, GM_addStyle, TWITCH_SERVER_INFO_SET_VAL, TWITCH_SERVER_INFO_FIXER */
if (window.TWITCH_SERVER_INFO === undefined) {
    (async () => {
        unsafeWindow.TWITCH_SERVER_INFO = true;
        console.log("[TSI]   RUNNING TWITCH SERVER INFO", document.location.href);
        ////////////////////////////////////////////////////////////////////////////////////
        // libs
        ////////////////////////////////////////////////////////////////////////////////////
        (function () {
            Date.prototype.format = function (f) {
                if (!this.valueOf()) return " ";

                var weekName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                var d = this;
                var h = d.getHours() % 12;

                return f.replace(/(yyyy|yy|MM|dd|E|hh|mm|ss|a\/p|amp)/gi, function ($1) {
                    switch ($1) {
                        case "yyyy":
                            return d.getFullYear();
                        case "yy":
                            return (d.getFullYear() % 1000).zf(2);
                        case "MM":
                            return (d.getMonth() + 1).zf(2);
                        case "dd":
                            return d.getDate().zf(2);
                        case "E":
                            return weekName[d.getDay()];
                        case "HH":
                            return d.getHours().zf(2);
                        case "hh":
                            return (h ? h : 12).zf(2);
                        case "mm":
                            return d.getMinutes().zf(2);
                        case "ss":
                            return d.getSeconds().zf(2);
                        case "a/p":
                            return d.getHours() < 12 ? "AM" : "PM";
                        case "amp":
                            return d.getHours() < 12 ? "AM" : "PM";
                        default:
                            return $1;
                    }
                });
            };
            String.prototype.string = function (len) {
                var s = '',
                    i = 0;
                while (i++ < len) {
                    s += this;
                }
                return s;
            };
            String.prototype.zf = function (len) {
                return "0".string(len - this.length) + this;
            };
            Number.prototype.zf = function (len) {
                return this.toString().zf(len);
            };
        })();

        // Debug function
        var NOMO_DEBUG = function ( /**/ ) {
            if (nomo_global.DEBUG) {
                var args = arguments,
                    args_length = args.length,
                    args_copy = args;
                for (var i = args_length; i > 0; i--) {
                    args[i] = args_copy[i - 1];
                }
                args[0] = "[TSI]  ";
                args.length = args_length + 1;
                console.log.apply(console, args);
            }
        };

        // Message pop-up
        var simple_message = function(msg, $elem){
            if($elem === undefined){
                $elem = $("body");
            }
            var prefix = "GM_setting_autosaved";
            var positiontext = "left";

            $elem.find("."+prefix).animate({bottom:"+=40px"}, {duration:300, queue: false}); // cleqrQueue().dequeue().finish().stop("true","true")
            // @keyframes glow {to {text-shadow: 0 0 10px white;box-shadow: 0 0 10px #5cb85c;}}
            $("<div style='animation: glow .5s 10 alternate; position:fixed; "+positiontext+":10px; bottom:20px; z-index:10000000;' class='"+prefix+" btn btn-success'>"+msg+"</div>")
                .appendTo($elem)
                .fadeIn("fast")
                .animate({opacity:1}, 10000, function(){
                    $(this).fadeOut("fast").delay(600).remove();
                })
                .animate({left:"+=30px"}, {duration:300, queue: false});
        };
        
        ////////////////////////////////////////////////////////////////////////////////////
        // Initialize
        ////////////////////////////////////////////////////////////////////////////////////
        const LOGGING_MAX = 1000;
        const FIXER_DELAY_MIN = 250;
        var SETTIMEOUT_FIXED_FAILED = undefined;
        var SETTIMEOUT_FIXER_EGG = undefined;
        var FIXER_EGG_COUNT = 0;

        var NOMO_getValue = function (name, val) {
            return (typeof GM_getValue === "function" ? GM_getValue(name, val) : val);
        };
        var NOMO_setValue = function (name, val) {
            return (typeof GM_setValue === "function" ? GM_setValue(name, val) : val);
        };

        // Define global variables
        var nomo_global = {
            "DEBUG": NOMO_getValue("DEBUG", false),
            "DEBUG_FETCH": NOMO_getValue("DEBUG_FETCH", false),
            "DEBUG_M3U8": NOMO_getValue("DEBUG_M3U8", false),
            "LOGGING": NOMO_getValue("LOGGING", false),
            "FIXER": NOMO_getValue("FIXER", false),
            "FIXER_SERVER": NOMO_getValue("FIXER_SERVER", ["sel"]),
            "FIXER_ATTEMPT_MAX": NOMO_getValue("FIXER_ATTEMPT_MAX", 15),
            "FIXER_DELAY": NOMO_getValue("FIXER_DELAY", 500),
            "SERVER_CHANGE_SHOW": NOMO_getValue("SERVER_CHANGE_SHOW", true),
            "prev_server": "",
            "prev_server_list": [],
            "prev_changed_server_list": [],
            "is_squad": false
        };

        // verify FIXER_SERVER
        if(typeof nomo_global.FIXER_SERVER === "string"){
            if(nomo_global.FIXER_SERVER.indexOf(",") !== -1){
                nomo_global.FIXER_SERVER = nomo_global.FIXER_SERVER.split(",");
            }
            else{
                nomo_global.FIXER_SERVER = [nomo_global.FIXER_SERVER];
            }
        }
        for (var i = 0; i < nomo_global.FIXER_SERVER.length; i++) {
            nomo_global.FIXER_SERVER[i] = nomo_global.FIXER_SERVER[i].replace(/("|'|`)/g, '').toLowerCase();
        }

        ////////////////////////////////////////////////////////////////////////////////////
        // Console Interface
        ////////////////////////////////////////////////////////////////////////////////////
        // To toggle debug mode, type TWITCH_SERVER_INFO_DEBUG() in console window
        unsafeWindow.TWITCH_SERVER_INFO_DEBUG = function () {
            nomo_global.DEBUG = !nomo_global.DEBUG;
            NOMO_setValue("DEBUG", nomo_global.DEBUG);
            return "DEBUG: " + nomo_global.DEBUG;
        };

        // To toggle LOGGING mode, type TWITCH_SERVER_INFO_LOGGING() in console window
        unsafeWindow.TWITCH_SERVER_INFO_LOGGING = function () {
            nomo_global.LOGGING = !nomo_global.LOGGING;
            NOMO_setValue("LOGGING", nomo_global.LOGGING);
            return "LOGGING: " + nomo_global.LOGGING;
        };

        // To clear log, type TWITCH_SERVER_INFO_CLEARLOG() in console window
        unsafeWindow.TWITCH_SERVER_INFO_CLEARLOG = function () {
            NOMO_setValue("LOG", []);
            return "CLEAR LOG";
        };

        // To print log, type TWITCH_SERVER_INFO_SHOWLOG() in console window
        unsafeWindow.TWITCH_SERVER_INFO_SHOWLOG = function () {
            var log_data = NOMO_getValue("LOG", []);
            for (var key in log_data) {
                log_data[key][0] = new Date(log_data[key][0] * 1000).format("yyyy-MM-dd amp hh:mm:ss");
            }
            return log_data;
        };

        unsafeWindow.TWITCH_SERVER_INFO_SET_VAL = function (name, val) {
            if (typeof GM_setValue === "function") {
                nomo_global[name] = val;
                GM_setValue(name, val);
            }
            return val;
        };

        unsafeWindow.TWITCH_SERVER_INFO_FIXER = function () {
            return TWITCH_SERVER_INFO_SET_VAL("FIXER", !nomo_global.FIXER);
        };

        var set_log = function(log){
            if (!nomo_global.LOGGING){
                return;
            }
            // save unix time time as s unit, without ms
            var date_n = Number(new Date());
            var date_s = String(date_n).substr(0, String(date_n).length - 3);

            // load old log data
            var log_data = NOMO_getValue("LOG", []);
            var new_log_data = [date_s].concat(log);
            log_data.unshift(new_log_data);
            if (log_data.length > LOGGING_MAX) {
                log_data = log_data.slice(0, LOGGING_MAX);
            }
            NOMO_setValue("LOG", log_data);
            NOMO_DEBUG("Logging Complete", new_log_data);
        };

        // Manage creation of the settings menu
        if (typeof GM_registerMenuCommand === "function") {
            GM_registerMenuCommand("Change Notification Setting", function () {
                TWITCH_SERVER_INFO_SET_VAL("SERVER_CHANGE_SHOW", !nomo_global.SERVER_CHANGE_SHOW);
                if(nomo_global.SERVER_CHANGE_SHOW){
                    simple_message("Server Change Notification : ON");
                }
                else {
                    simple_message("Server Change Notification : OFF");
                }
            });
        }

        // Server list:: 2023-11-26 updated
        // Reference: https://twitchstatus.com/
        var server_list_2 = {
            "hkg":"AS: Hong Kong",
            "blr":"AS: India, Bangalore",
            "maa":"AS: India, Chennai",
            "hyd":"AS: India, Hyderabad",
            "bom":"AS: India, Mumbai",
            "del":"AS: India, New Delhi",
            "jkt01":"AS: Indonesia, Cikarang Barat",
            "jkt02":"AS: Indonesia, Jakarta",
            "osa":"AS: Japan, Osaka",
            "tyo":"AS: Japan, Tokyo",
            "mnl":"AS: Manila, Philippines",
            "sin":"AS: Singapore",
            "sel":"AS: South Korea, Seoul",
            "tpe":"AS: Taiwan, Taipei",
            "bkk":"AS: Thailand, Bangkok",
            "vie":"Europe: Austria, Vienna",
            "prg":"Europe: Czech Republic, Prague",
            "cph":"Europe: Copenhagen, Denmark",
            "hel":"Europe: Finland, Helsinki",
            "mrs":"Europe: France, Marseille",
            "cdg":"Europe: France, Paris",
            "ber":"Europe: Germany, Berlin",
            "dus":"Europe: Germany, Dusseldorf",
            "fra":"Europe: Germany, Frankfurt",
            "muc":"Europe: Germany, Munich",
            "mil":"Europe: Italy, Milan",
            "ams":"Europe: Netherlands, Amsterdam",
            "osl":"Europe: Norway, Oslo",
            "waw":"Europe: Poland, Warsaw",
            "mad":"Europe: Spain, Madrid",
            "arn":"Europe: Sweden, Stockholm",
            "lhr":"Europe: UK, London",
            "ymq":"NA: Canada, Quebec",
            "yto":"NA: Canada, Toronto",
            "qro":"NA: Mexico, Queretaro",
            "syd":"Oceania: AU, Sydney",
            "scl":"South America: chile, Santiago",
            "for":"South America: Brazil, Fortaleza",
            "rio":"South America: Brazil, Rio de Janeiro",
            "sao":"South America: Brazil, Sao Paulo",
            "bue":"South America: Buenos Aires, Argentina",
            "bog":"South America: Colombia, Bogota",
            "dfw56":"US Central: Garland, TX",  // added 2023-11-26
            "dfw":"US Central: Dallas, TX",
            "den":"US Central: Denver, CO",
            "iah":"US Central: Houston, TX",
            "iad":"US East: Ashburn, VA",
            "atl":"US East: Atlanta, GA",
            "ord":"US East: Chicago, IL",
            "mfe":"US East: McAllen, TX",       // added 2023-11-26
            "mia":"US East: Miami, FL",
            "jfk":"US East: New York, NY",
            "lax":"US West: Los Angeles, CA",
            "pdx":"US West: Portland, OR",
            "slc":"Salt Lake City, UT",
            "sfo":"US West: San Francisco, CA",
            "sjc":"US West: San Jose, CA",
            "sea":"Seattle, WA",
            "hou":"US Central: Houston, TX",    // old
            "phx":"US West: Phoenix, AZ",       // old
            "lis":"DEPRECATED Europe: Portugal, Lisbon",
            "lim":"DEPRECATED South America: Lima, Peru",
            "mde":"DEPRECATED South America: Medellin, Colombia",
            "gig":"DEPRECATED South America: Rio de Janeiro, Brazil",
            "gru":"DEPRECATED South America: Sao Paulo, Brazil",
            "akamai":"Akamai"
        };

        // CSS
        if (typeof GM_addStyle === "function") {
            GM_addStyle( /*css*/ `
                div.player-buttons-right #current_server{
                    bottom:42px;
                    right:18px;
                }
                #current_server{
                    color:#fff;
                    z-index:10;
                    position:absolute;
                    bottom:34px;
                    right:6px;
                    text-align:right;
                    font-size:11px;
                    ${typeof GM_setClipboard === "function" ?
                    `user-select: text;
                    cursor: pointer;` : ``}
                }

                #copied{
                    background-color:#686878;
                    border-radius:10px;
                    padding:1px 7px;
                    margin-right:7px;
                    user-select: none;
                }

                #fixer_loader{
                    width:100%;
                    height:100%;
                    position:absolute;
                    top:0;
                    left:0;
                    background:rgba(0,0,0,0.7);
                    z-index:10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                #fixer_loader .loader_text{
                    color:#fff;
                    margin-top:0px;
                    font-size:1.5em;
                    color:#fff;
                    position: absolute;
                    top: auto;
                    left: auto;
                }

                #fixer_loader .loader_contents,
                #fixer_loader .loader_contents:after {
                border-radius: 50%;
                width: 10em;
                height: 10em;
                }
                #fixer_loader .loader_contents {
                margin: 60px auto;
                font-size: 10px;
                position: relative;
                text-indent: -9999em;
                border-top: 1.1em solid rgba(255, 255, 255, 0.1);
                border-right: 1.1em solid rgba(255, 255, 255, 0.1);
                border-bottom: 1.1em solid rgba(255, 255, 255, 0.1);
                border-left: 1.1em solid rgba(255, 255, 255, 0.35);
                -webkit-transform: translateZ(0);
                -ms-transform: translateZ(0);
                transform: translateZ(0);
                -webkit-animation: load8 0.5s infinite linear;
                animation: load8 0.5s infinite linear;
                }

                @keyframes glow_twitch {to {text-shadow: 0 0 15px white;box-shadow: 0 0 15px #7d5bbe;}}
                .tsi_sc {
                    user-select:none;
                    cursor:pointer;
                    padding:5px 10px !important;
                    background:rgba(0,0,0,0.7);
                    color:#fff;
                    border-radius:5px;
                    animation:glow_twitch .5s 20 alternate;
                    font-size:13px;z-index:10;position:absolute;
                    position:absolute;left:50%;
                    bottom:20px;
                    transform:translateX(-50%);
                }

                @-webkit-keyframes load8 {
                0% {
                    -webkit-transform: rotate(0deg);
                    transform: rotate(0deg);
                }
                100% {
                    -webkit-transform: rotate(360deg);
                    transform: rotate(360deg);
                }
                }
                @keyframes load8 {
                0% {
                    -webkit-transform: rotate(0deg);
                    transform: rotate(0deg);
                }
                100% {
                    -webkit-transform: rotate(360deg);
                    transform: rotate(360deg);
                }
                }

                .player-tip, .player-button{
                    z-index:60 !important;
                }
                .pl-menu, .pl-menu *{
                    z-index:70 !important;
                }

                .GM_setting_autosaved.btn{
                    max-width:100%;
                    font-size:12px;
                    white-space:pre-wrap;
                    user-select:text;
                }
                @keyframes glow {to {text-shadow: 0 0 10px white;box-shadow: 0 0 10px #5cb85c;}}
                .GM_setting_autosaved.btn{display:inline-block;margin-bottom:0;font-weight:normal;text-align:center;vertical-align:middle;cursor:pointer;background-image:none;border:1px solid transparent;padding:6px 12px;line-height:1.42857143;border-radius:4px;}
                .GM_setting_autosaved.btn:focus,.GM_setting_autosaved.btn:active:focus,.GM_setting_autosaved.btn.active:focus{outline:thin dotted;outline:5px auto -webkit-focus-ring-color;outline-offset:-2px}
                .GM_setting_autosaved.btn:hover,
                .GM_setting_autosaved.btn:focus{color:#fff;text-decoration:none}
                .GM_setting_autosaved.btn:active,
                .GM_setting_autosaved.btn.active{outline:0;background-image:none;-webkit-box-shadow:inset 0 3px 5px rgba(0,0,0,0.125);box-shadow:inset 0 3px 5px rgba(0,0,0,0.125)}
                .GM_setting_autosaved.btn-success{color:#fff;background-color:#5cb85c;border-color:#4cae4c}
            `);
        }

        function createTSILayout(e){
            // Get streamer id from url
            var i;
            var streamer_id = String(document.location.href).match(/twitch\.tv\/(?:.+channel=)?([a-zA-Z0-9-_]+)\/?/); // /twitch\.tv\/(([a-zA-Z0-9-_]+)|.+channel=([a-zA-Z0-9-_]+))\/?/
            streamer_id = (streamer_id !== null ? streamer_id.pop() : "");

            // check the type: tsi (default)
            if (e.data.type === "tsi") {
                var msg_arg = e.data.arg;
                
                if (nomo_global.DEBUG_FETCH) {
                    NOMO_DEBUG('Message received from worker', e.data);
                }

                // check playlist is master or vod
                var is_master_playlist = msg_arg.indexOf('usher.ttvnw.net/api/channel/hls') !== -1;
                var is_vod = msg_arg.indexOf('usher.ttvnw.net/vod/') !== -1;
                if (is_master_playlist){
                    set_log(["mp", streamer_id]);
                }

                // Clears the server display DOM when a .m3u8 file or VOD is played for the first time on a channel
                if (is_master_playlist || is_vod) {
                    // remove old DOM
                    $("#current_server").remove();
                    nomo_global.prev_server = "";
                    nomo_global.prev_server_list = [];                        
                    nomo_global.prev_changed_server_list = [];

                    // Squad streaming is not currently supported
                    if(/https?:\/\/(?:www\.)?twitch\.tv\/[a-zA-Z0-9-_]+\/squad$/.test(document.location.href)){
                        nomo_global.is_squad = true;
                        NOMO_DEBUG("Squad streaming is not currently supported");
                    }
                    else{
                        nomo_global.is_squad = false;
                    }
                }

                // First filter if the URL contains /v1/segment/.
                if (!nomo_global.is_squad && msg_arg.indexOf("/v1/segment/")) {
                    // sample 1: https://video-edge-7e9b9c.sea01.abs.hls.ttvnw.net/v1/segment/CrkETpsPvu8J-JU7Uw41bTmckS0cEofD3pr3EKsfyLpEMWZgb5zeNdYkjkVo5KBYM95UtJvXIJsRRMKazzgDmtksZTSZU-f_EkxSuZrsRdGoaCeHqzbT4l-8mb0OOh9FohqMuzmla4eSVEagbddvmI-_vm3fXDRUehf2BtfhApNVXkcsCVhmrgUKXDuP8YWfdTwmQalG1YnIFtbRg3xw9CVKqajbU4FLcgI0sLHpS-bb3OquKpucwfo8paJyXh7XWCsRF_yLIcbv6iSS7i83uVTTHx54NX8V0K5CntIfVWAfYG-xaypl6qKAKKIRbNa-hsRSQ62Kvqltb_mu6LhStkK1F3qmln_e1hCc7ytx7TVAJmK-GeeplfvCGIxI4qnhl3dSTV0RushnljKYgiA3kt_yC-KbqPPMjTcRgyitGwjyxpHweeQJfJqFGJizcpaFMzmdI5gW_CbdXhX4FWq6TCaRjSCgwx_ewXC5Ct6W7QnWaep35BhxdhX1i0-hh7YflMDFKAykfB07m48DWINT_Fn1K98J0tLKL7yaNJedzM2PhF9AeARA5_fSTzBkA_duOY9fmpOpRFN1VpfmHID3tYDY1F_XZJJmiG6rd_UynJfji8ikbhwkgVc0_QWtOerN10ysY3IvUjlIJn0RwFScCNqdUoMKMKPMsOMfaS1oc1vq8YBPCagEgLnBk6A0d6A61x3brmAU2RaiOCEMChn-n80GyEH3AoIoDOW3fj6lOg1M2uKlMb8vPBYpYp8SEPpaz83YuxcS4pbU4mznHkMaDAsKJElIKxXWiGX3zw.ts
                    // sample 2: https://live003-ttvnw.akamaized.net/v1/segment/CsoBN06NSMlknciQP8zdCmSmxw4Zz7GxFwO-SNrfef7l7Z7x-pDKXl6F0jeUDQSkwEXm61AgNcRXavIb-g9kT8U4XkZaOBhtJa0DxO10EkIFpePqwhq7Vmazjn1E0cZ1vzp_dQmnBirLIYTUssV3NmwNAjA5-pIMqrj4ibG4h8r3xr2lRz-yAyzatBu0d9HgvGWYRvSWVm1I6bZ8ii_sNV1squ9LlvIEJ0uQ1bCvVnP7sMmurlnKvTx-VDwQ8veMH5G1FQbwm9ta8RmpLBIQHt-eAsho321hz6pZk697kBoMVpjw0pSuRgcYKTDb.ts
                    var current_server = msg_arg.match(/\/\/(?:vid[a-zA-Z0-9-_]+\.)?([a-zA-Z0-9-_.]+)\/v1\/segment\/.+\.ts/);

                    // If the server name is found.
                    if (current_server !== null) {
                        // get server url
                        current_server = current_server.pop();

                        const MAX_SERVER_LIST_LENGTH = 5;
                        const MAX_CHANGED_SERVER_LIST_LENGTH = 3;

                        // save to server list
                        nomo_global.prev_server_list.push(current_server);
                        if (nomo_global.prev_server_list.length > MAX_SERVER_LIST_LENGTH) {
                            nomo_global.prev_server_list = nomo_global.prev_server_list.slice(nomo_global.prev_server_list.length - MAX_SERVER_LIST_LENGTH);
                        }

                        // Check if DOM recreation is required
                        var refreshDOM = false;
                        if (nomo_global.prev_server !== current_server) {
                            if(nomo_global.prev_server_list.length == 0){
                                NOMO_DEBUG("prev_server_list.length == 0, refreshDOM = false");
                                refreshDOM = false;
                            }
                            else if(nomo_global.prev_server_list.length == 1){
                                NOMO_DEBUG("prev_server_list.length == 1, refreshDOM = true");
                                refreshDOM = true;
                            }
                            else{
                                if(nomo_global.DEBUG){
                                    //simple_message(`[TSI] Server Changing.... : ${nomo_global.prev_server_list.join(", ")}`, $("body"));
                                }
                                NOMO_DEBUG(`prev_server_list` + nomo_global.prev_server_list.join(", "));
                                refreshDOM = true;
                                for(i = 0; i<nomo_global.prev_server_list.length; i++){
                                    if(current_server !== nomo_global.prev_server_list[i]){
                                        refreshDOM = false;
                                        break;
                                    }
                                }
                            }
                        }

                        var reCreateDOM = false;
                        if(!refreshDOM && $("#current_server").length === 0 && $(".player-controls__right-control-group").length !== 0){
                            reCreateDOM = true;
                        }

                        // refresh of recreate DOM
                        if (refreshDOM || reCreateDOM) {
                            NOMO_DEBUG("Current server:", current_server);

                            // Matching Server Name - Region
                            var server_str = current_server.split(".")[0];
                            var server_name = "";
                            if (current_server.indexOf("akamai") !== -1) {
                                server_str = "AKAMAI";
                                server_name = "<br />(AKAMAI)";
                            } else {
                                let serverKeys = Object.keys(server_list_2);
                                for (i = 0; i < serverKeys.length; i++) {
                                    let key = serverKeys[i];
                                    if (server_str.indexOf(key) !== -1) {
                                        let desc = server_list_2[key];
                                        server_name = "<br />(" + key.toUpperCase() + " / " + desc + ")";
                                        break;
                                    }
                                }
                            }

                            // push the current servers into the server_list array
                            if(refreshDOM){
                                nomo_global.prev_changed_server_list.push(server_str);
                                if (nomo_global.prev_changed_server_list.length > MAX_CHANGED_SERVER_LIST_LENGTH) {
                                    nomo_global.prev_changed_server_list = nomo_global.prev_changed_server_list.slice(nomo_global.prev_changed_server_list.length - MAX_CHANGED_SERVER_LIST_LENGTH);
                                }
                            }

                            // Logging on first connection
                            if(nomo_global.prev_server === ""){
                                set_log(["s1", streamer_id, current_server]);
                            }
                            
                            var server_change_history = "";
                            // If this is not the first connection and the server has changed
                            if(nomo_global.SERVER_CHANGE_SHOW && refreshDOM && nomo_global.prev_server !== ""){
                                server_change_history = "<br />" + nomo_global.prev_changed_server_list.join(" → ").toUpperCase();
                                // logging
                                NOMO_DEBUG("Update server list", nomo_global.prev_changed_server_list);
                                set_log(["sc", streamer_id, current_server]);
                                $("#current_server").remove();
                            }

                            // Display the number of connection attempts in FIXER
                            var fixed_string = "";
                            if (nomo_global.FIXER) {
                                if (e.data.fixed.FIXED) {
                                    fixed_string = "(" + e.data.fixed.FIXER_count + "/" + nomo_global.FIXER_ATTEMPT_MAX + ") <br />";
                                } else {
                                    fixed_string = "(" + e.data.fixed.FIXER_count + "/" + nomo_global.FIXER_ATTEMPT_MAX + ") <br />";
                                }
                            }
                            var dom_string = fixed_string + current_server + server_name + server_change_history;

                            // Create DOM
                            var $player_menu = $(".player-controls__right-control-group");   // for new twitch player
                            if ($player_menu.length !== 0) {
                                $player_menu.css("position","relative");
                                $(".player-buttons-right").find(".player-tip").css("z-index", 60);
                                $("#current_server").remove();
                                $(`<span id="current_server" style="display:none;">${dom_string}</span>`)
                                    .prependTo($player_menu)
                                    .fadeIn(500)
                                    // Copy to clipboard on click if available
                                    .on("click", function () {
                                        if (typeof GM_setClipboard === "function") {
                                            GM_setClipboard((current_server + server_name).replace("<br />", " "));
                                            $("#copied").remove();
                                            $(`<span id="copied" style="display:none">Copied!!</span>`)
                                                .prependTo($(this))
                                                .fadeIn(500)
                                                .animate({
                                                    opacity: 1
                                                }, 3000, function () {
                                                    $(this).fadeOut(500, function () {
                                                        $(this).remove();
                                                    });
                                                });
                                        }

                                        // ????
                                        FIXER_EGG_COUNT = FIXER_EGG_COUNT + 1;
                                        clearTimeout(SETTIMEOUT_FIXER_EGG);
                                        SETTIMEOUT_FIXER_EGG = setTimeout(function(){
                                            NOMO_DEBUG("FIXER_EGG_COUNT", FIXER_EGG_COUNT);
                                            if(FIXER_EGG_COUNT === 7){
                                                NOMO_DEBUG("FIXER EGG 7");
                                                TWITCH_SERVER_INFO_FIXER();
                                                $(".FIXER_EGG").remove();
                                                $(`<span class="FIXER_EGG"><br />FIXER ${nomo_global.FIXER ? "ON" : "OFF"}!!! Please refresh.</span>`).appendTo("#current_server");
                                            }
                                            else if(FIXER_EGG_COUNT === 8){
                                                NOMO_DEBUG("FIXER EGG 8");
                                                var FIXER_SERVER_PROMPT = prompt("고정할 서버(Target Server)에 포함된 문자열을 콤마로 구분하여 입력하세요.\n영문,숫자만 입력할 수 있습니다.\n예시1) sel, akamai\n예시2) sel03", nomo_global.FIXER_SERVER.join(", "));
                                                if(FIXER_SERVER_PROMPT === null){
                                                    NOMO_DEBUG("Canceled");
                                                }
                                                else if (FIXER_SERVER_PROMPT === ""){
                                                    TWITCH_SERVER_INFO_SET_VAL("FIXER_SERVER", []);
                                                }
                                                else{
                                                    // eslint-disable-next-line no-useless-escape
                                                    FIXER_SERVER_PROMPT = FIXER_SERVER_PROMPT.toLowerCase().replace(/[\{\}\[\]\/?.;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"\s]/gi, "").split(",");
                                                    TWITCH_SERVER_INFO_SET_VAL("FIXER_SERVER", FIXER_SERVER_PROMPT);
                                                    NOMO_DEBUG("FIXER_SERVER_PROMPT", FIXER_SERVER_PROMPT);
                                                }
                                            }
                                            FIXER_EGG_COUNT = 0;
                                        },1000);
                                    });
                            } // End of creation of DOM
                            // else{
                            //     simple_message(current_server + server_name);
                            // }

                            nomo_global.prev_server = current_server;
                        } // end of checing server name
                    } // end of checking .ts file with regex
                } // end of checking indexOf('.hls.ttvnw.net')
            } // end of checking if postMessage type is tsl.
            // Receive a fixer message
            else if (e.data.type === "tsi_fixer") {
                // Check if the count has exceeded FIXER_ATTEMPT_MAX
                var FIXED_FAILED = false;
                if (e.data.fixed.FIXER_count >= nomo_global.FIXER_ATTEMPT_MAX) {
                    FIXED_FAILED = true;
                }

                // Create LOADER DOM
                var $player_root = $(".player-root");    // for embeded player, old twitch player
                if($player_root.length === 0){
                    $player_root = $(".highwind-video-player__container");   // for new twitch player
                }
                if ($player_root.length !== 0) {
                    $("#fixer_loader").remove();
                    // if fixer failed
                    if (!e.data.fixed.FIXED) {
                        $(`
                        <div id="fixer_loader">
                            <div class="loader_text">
                                Target Server : ${nomo_global.FIXER_SERVER.join(', ')}<br />
                                Connected Server : ${e.data.fixed.CURRENT_SERVER}<br />
                                connection attempts: <span${FIXED_FAILED ? ' style="color:red !important;"' : ''}>${e.data.fixed.FIXER_count}</span> / ${nomo_global.FIXER_ATTEMPT_MAX}
                                ${FIXED_FAILED ? "<br /><span style='color:red !important;'>SERVER FIX FAILED</span>" : ''}
                            </div>
                            <div class="loader_contents">Loading...</div>
                        </div>`)
                            .prependTo($player_root);

                        // Show a failure message for 2 seconds and remove the DOM
                        if (FIXED_FAILED) {
                            clearTimeout(SETTIMEOUT_FIXED_FAILED);
                            SETTIMEOUT_FIXED_FAILED = setTimeout(function () {
                                $("#fixer_loader").remove();
                            }, 2000);
                        }
                    }
                }
            }
            // else if(e.data.arg === undefined){
            //     NOMO_DEBUG("undefined case", e);
            // } else if(e.data.arg.name !== "enqueue" && e.data.arg.name !== "remove"){NOMO_DEBUG(e.data);}
        }

        ////////////////////////////////////////////////////////////////////////////////////
        // Hijacking and Overriding Worker 
        ////////////////////////////////////////////////////////////////////////////////////
        var realWorker = unsafeWindow.Worker;
        unsafeWindow.Worker = function (input) {
            // Explicitly convert to a String
            var newInput = String(input);
            NOMO_DEBUG("newInput", newInput);

            var myBlob = "importScripts('https://static.twitchcdn.net/assets/amazon-ivs-wasmworker.min-7da53ec1e6fb32a92d1d.js');";

            var req = new XMLHttpRequest();
            req.open('GET', newInput, false);
            req.send();
            var resText = req.responseText;
            if(req.status == 200 || req.status == 201){
                myBlob = resText;
            }

            // overriding blob
            var workerBlob = new Blob(
                [ /*javascript*/ `
                    // load global variables
                    const FIXER = ${nomo_global.FIXER};
                    const FIXER_SERVER = ${nomo_global.FIXER_SERVER.length > 0 ? '["'+(nomo_global.FIXER_SERVER).join('","')+'"]' : "[]"};
                    const FIXER_ATTEMPT_MAX = ${nomo_global.FIXER_ATTEMPT_MAX};
                    const FIXER_DELAY = ${FIXER_DELAY_MIN  >= nomo_global.FIXER_DELAY ? nomo_global.FIXER_DELAY : FIXER_DELAY_MIN};
                    const DEBUG_WORKER = ${nomo_global.DEBUG};
                    const DEBUG_M3U8 = ${nomo_global.DEBUG_M3U8};
                    var FIXER_count = 1;
                    var FIXED = false;
                    var FIXED_SERVER = undefined;

                    // debug function in WORKER
                    var NOMO_DEBUG = function ( /**/ ) {
                        if (DEBUG_WORKER) {
                            var args = arguments,
                                args_length = args.length,
                                args_copy = args;
                            for (var i = args_length; i > 0; i--) {
                                args[i] = args_copy[i - 1];
                            }
                            args[0] = "[TSI]  ";
                            args.length = args_length + 1;
                            console.log.apply(console, args);
                        }
                    };

                    // DEBUG:: check global variables
                    NOMO_DEBUG({"FIXER":FIXER, "FIXER_SERVER":FIXER_SERVER, "FIXER_ATTEMPT_MAX":FIXER_ATTEMPT_MAX, "FIXER_DELAY":FIXER_DELAY, "DEBUG_WORKER":DEBUG_WORKER, "DEBUG_M3U8":DEBUG_M3U8});
                    
                    // Explicitly double-check types to prevent errors
                    if(typeof FIXER !== "boolean" || typeof FIXER_SERVER !== "object"){
                        FIXER = false;
                        NOMO_DEBUG("typeof FIXER is not boolean", FIXER, FIXER_SERVER);
                    }
                    if(typeof DEBUG_WORKER !== "boolean"){
                        DEBUG_WORKER = false;
                        NOMO_DEBUG("typeof DEBUG_WORKER is not boolean", DEBUG_WORKER);
                    }
                    if(typeof DEBUG_M3U8 !== "boolean"){
                        DEBUG_M3U8 = false;
                        NOMO_DEBUG("typeof DEBUG_M3U8 is not boolean", DEBUG_M3U8);
                    }

                    // sleep fuctnion
                    function sleep(ms) {
                        return new Promise(resolve => setTimeout(resolve, ms));
                    }

                    // Hijacking & overriding the fetch function inside a worker
                    const originalFetch = self.fetch;
                    self.fetch = async function(input, init){
                        // Sending messages out of the worker
                        postMessage({"id":0,"type":"tsi","arg":input,"fixed":{"FIXED":FIXED,"FIXER_count":FIXER_count}});

                        // Server Fixer (Auto Reconnector)
                        if(FIXER
                            && FIXER_SERVER !== undefined 
                            && FIXER_SERVER.length > 0 
                            && input.indexOf('usher.ttvnw.net/api/channel/hls') !== -1){
                            FIXED = false;
                            FIXER_count = 1;
                            NOMO_DEBUG("URL detected on first channel connection", input);
                            
                            // start iteration
                            while(!FIXED && FIXER_count <= FIXER_ATTEMPT_MAX){
                                NOMO_DEBUG("Attempting to auto-select server...");
                                NOMO_DEBUG("Current Attempt Count", (FIXER_count) + " / " + FIXER_ATTEMPT_MAX);

                                var m3u8_fetch = await originalFetch.apply(this, arguments);
                                var m3u8_text = await m3u8_fetch.text();
                                // NOMO_DEBUG("m3u8_text", m3u8_text);

                                // check the error
                                if(m3u8_text.indexOf("error_code") !== -1 || m3u8_text.indexOf("Can not fi") !== -1){
                                    NOMO_DEBUG("Error - Stop Server fixer", {m3u8_text});
                                    break;
                                }

                                // check the cluster string
                                var cluster_str;
                                if((/CLUSTER=/).test(m3u8_text)){
                                    cluster_str = m3u8_text.split("CLUSTER=")[1].split(",")[0].replace(/"/g,'');
                                    NOMO_DEBUG("Cluster string exists", cluster_str);

                                    for(var SN of FIXER_SERVER){
                                        // If the desired server is found.
                                        if(cluster_str.indexOf(SN) !== -1){
                                            FIXED = true;
                                            NOMO_DEBUG("Server Fixer Success", SN, cluster_str);
                                            break;
                                        }
                                    }
                                }
                                // CLUSTER string does not exist, retry
                                else{
                                    NOMO_DEBUG("CLUSTER string does not exist, retry");
                                    cluster_str = "Server name not found.";
                                }

                                // Send a postMessage to display the loader
                                postMessage({"id":0,"type":"tsi_fixer","arg":"","fixed":{"FIXED":FIXED,"CURRENT_SERVER":cluster_str,"FIXER_count":FIXER_count}});
                                
                                // When the desired server is found or the maximum count is reached
                                if(FIXED || FIXER_count === FIXER_ATTEMPT_MAX){
                                    // return as blob
                                    var m3u8_blob = new Blob([m3u8_text], {
                                        type: 'text/plain'
                                    });
                                    var m3u8_blob_url = URL.createObjectURL(m3u8_blob);
                                    var new_arg = arguments;
                                    new_arg[0] = m3u8_blob_url;
                                    NOMO_DEBUG("step2", m3u8_blob_url);
                                    // revoke after 10s
                                    setTimeout(function(){URL.revokeObjectURL(m3u8_blob_url)},10000);
                                    return originalFetch.apply(this, new_arg);
                                }
                                else{
                                    // If the desired server is not found
                                    NOMO_DEBUG("The desired server was not found", FIXER_SERVER, cluster_str);
                                    FIXER_count = FIXER_count + 1;
                                }

                                // Retry at FIXER_DELAY interval
                                await sleep(FIXER_DELAY);
                            }   // end of while loop
                        }   // end of if for iteration

                        // To debug M3U8
                        if(DEBUG_M3U8 && input.toLowerCase().indexOf(".m3u8") !== -1){
                            var m3u8_fetch = await originalFetch.apply(this, arguments);
                            var m3u8_text = await m3u8_fetch.text();
                            NOMO_DEBUG("\\n", input, "\\n", (new Date()), "\\n", m3u8_text);
                            // return as blob
                            var m3u8_blob = new Blob([m3u8_text], {
                                type: 'text/plain'
                            });
                            var m3u8_blob_url = URL.createObjectURL(m3u8_blob);
                            var new_arg = arguments;
                            new_arg[0] = m3u8_blob_url;
                            // NOMO_DEBUG("step2", m3u8_blob_url);
                            // Revoke after 10s
                            setTimeout(function(){URL.revokeObjectURL(m3u8_blob_url)},10000);
                            return originalFetch.apply(this, new_arg);
                        }

                        if(DEBUG_WORKER && input.toLowerCase().indexOf('usher.ttvnw.net/api/channel/hls') !== -1){
                            NOMO_DEBUG("master playlist m3u8 \\n" + input);
                        }

                        return originalFetch.apply(this, arguments);
                    };

                    ${myBlob};

                    // override onmessage to debug
                    // setTimeout(function(){
                    //     console.log(self);
                    //     var old_onmessage = self.onmessage;
                    //     self.onmessage = function(e){
                    //         old_onmessage(e);
                    //         console.log("self", e.data);
                    //     };
                    // }, 1);
                `], {
                    type: 'text/javascript'
                }
            );
            // end of overriding of blob

            var workerBlobUrl = URL.createObjectURL(workerBlob);
            var workerBlobWrapper = new Blob(
                [ /*javascript*/ `
                importScripts('${workerBlobUrl}');
               `], {
                    type: 'text/javascript'
                });

            var workerBlobWrapperUrl = URL.createObjectURL(workerBlobWrapper);
            var my_worker = new realWorker(workerBlobWrapperUrl);

            ////////////////////////////////////////////////////////////////////////////////////
            // Receiving postMessages and creating DOM outside of Worker
            ////////////////////////////////////////////////////////////////////////////////////
            my_worker.onmessage = function (e) {
                createTSILayout(e);
            };

            ////////////////////////////////////////////////////////////////////////////////////
            // modified Worker
            ////////////////////////////////////////////////////////////////////////////////////
            NOMO_DEBUG("my_worker", my_worker);
            // return to the original function that created the worker
            return my_worker;
        };
    })();
}
