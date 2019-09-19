// ==UserScript==
// @name        Twitch-Server-Info
// @namespace   Twitch-Server-Info
// @version     0.0.1
// @author      nomo
// @description Check Twitch server location.
// @supportURL  https://github.com/nomomo/Twitch-Server-Info/issues
// @homepageURL https://github.com/nomomo/Twitch-Server-Info/
// @downloadURL https://raw.githubusercontent.com/nomomo/Twitch-Server-Info/master/Twitch-Server-Info.user.js
// @updateURL   https://raw.githubusercontent.com/nomomo/Twitch-Server-Info/master/Twitch-Server-Info.user.js
// @include     *://*.twitch.tv/*
// @match       about:blank
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js
// @run-at      document-start
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_setClipboard
// @grant       unsafeWindow
// ==/UserScript==
/*jshint multistr: true */
// @icon        https://raw.githubusercontent.com/nomomo/Twitch-Server-Info/master/images/logo.png

if (window.TWITCH_SERVER_INFO === undefined) {
    ////////////////////////////////////////////////////////////////////////////////////
    // libs
    ////////////////////////////////////////////////////////////////////////////////////
    (function () {
        Date.prototype.format = function (f) {
            if (!this.valueOf()) return " ";

            var weekName = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
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
                        return d.getHours() < 12 ? "오전" : "오후";
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

    ////////////////////////////////////////////////////////////////////////////////////
    // Initialize
    ////////////////////////////////////////////////////////////////////////////////////
    const LOGGING_MAX = 1000;
    unsafeWindow.TWITCH_SERVER_INFO = true;
    console.log("[TSI]", "RUNNING TWITCH SERVER INFO", document.location.href);

    // 글로벌 변수 선언
    var nomo_global = {
        "DEBUG": (typeof GM_getValue === "function" ? GM_getValue("DEBUG", false) : false),
        "LOGGING": (typeof GM_getValue === "function" ? GM_getValue("LOGGING", false) : false),
        "prev_server": ""
    };

    // 디버그 모드를 전환하려면 console 창에 TWITCH_SERVER_INFO_DEBUG() 를 붙여넣기 하세요.
    unsafeWindow.TWITCH_SERVER_INFO_DEBUG = function () {
        nomo_global.DEBUG = !nomo_global.DEBUG;
        if (typeof GM_setValue === "function") {
            GM_setValue("DEBUG", nomo_global.DEBUG);
        }
        return "DEBUG: " + nomo_global.DEBUG;
    };

    // LOGGING 모드를 전환하려면 console 창에 TWITCH_SERVER_INFO_LOGGING() 을 붙여넣기 하세요.
    unsafeWindow.TWITCH_SERVER_INFO_LOGGING = function () {
        nomo_global.LOGGING = !nomo_global.LOGGING;
        if (typeof GM_setValue === "function") {
            GM_setValue("LOGGING", nomo_global.LOGGING);
        }
        return "LOGGING: " + nomo_global.LOGGING;
    };

    // LOG를 클리어 하려면 console 창에 TWITCH_SERVER_INFO_CLEARLOG() 을 붙여넣기 하세요.
    unsafeWindow.TWITCH_SERVER_INFO_CLEARLOG = function () {
        if (typeof GM_setValue === "function") {
            GM_setValue("LOG_DATA", []);
        }
        return "CLEAR LOG";
    };

    // LOG를 콘솔창에 찍으려면 console 창에 TWITCH_SERVER_INFO_SHOWLOG() 을 붙여넣기 하세요.
    unsafeWindow.TWITCH_SERVER_INFO_SHOWLOG = function () {
        if (typeof GM_getValue === "function") {
            var log_data = GM_getValue("LOG_DATA", []);
            for (var key in log_data) {
                log_data[key][0] = new Date(log_data[key][0] * 1000).format("yyyy-MM-dd amp hh:mm:ss");
            }
            return log_data;
        }
    };

    // 디버깅용 함수
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

    // 서버 리스트 1 - 현재 사용 안 함
    // var server_list = [
    //     ["GL", "Edgecast", "g1.edgecast.hls.ttvnw.net"],
    //     ["US", "San Francisco", "video-edge-2ca3e4.sfo01.hls.ttvnw.net"],
    //     ["US", "Seattle", "video-edge-7e8e10.sea01.hls.ttvnw.net"],
    //     ["US", "San Jose", "video-edge-7e96ac.sjc01.hls.ttvnw.net"],
    //     ["US", "San Jose", "?.sjc02.hls.ttvnw.net"],
    //     ["US", "Chicago", "video-edge-835140.ord02.hls.ttvnw.net"],
    //     ["US", "Washington", "video20.iad02.hls.ttvnw.net"],
    //     ["US", "New York", "video-edge-8fd0d8.jfk03.hls.ttvnw.net"],
    //     ["US", "Los Angeles", "video20.lax01.hls.ttvnw.net"],
    //     ["US", "Dallas", "video20.dfw01.hls.ttvnw.net"],
    //     ["US", "Miami", "video-edge-7ea8a4.mia02.hls.ttvnw.net"],
    //     ["SE", "Stockholm", "video-edge-69c1b0.arn01.hls.ttvnw.net"],
    //     ["UK", "London", "video20.lhr02.hls.ttvnw.net"],
    //     ["NL", "Amsterdam", "video20.ams01.hls.ttvnw.net"],
    //     ["FR", "Paris", "video-edge-49b0d4.cdg01.hls.ttvnw.net"],
    //     ["DE", "Frankfurt", "video-edge-748bd0.fra01.hls.ttvnw.net"],
    //     ["PL", "Warsaw", "video-edge-8f9918.waw01.hls.ttvnw.net"],
    //     ["CZ", "Prague", "video-edge-4ae010.prg01.hls.ttvnw.net"],
    //     ["AU", "Sydney", "video-edge-8c6ee0.syd01.hls.ttvnw.net"],
    //     ["AS", "Hongkong", "video-edge-7cf698.hkg01.hls.ttvnw.net"],
    //     ["AS", "Tokyo", "video-edge-7cfe50.tyo01.hls.ttvnw.net"],
    //     ["AS", "Seoul", "video-edge-230da0.sel01.abs.hls.ttvnw.net"],
    //     ["AS", "Seoul", "??.sel02.abs.hls.ttvnw.net"],
    //     ["AS", "Seoul", "video-edge-0a9354.sel03.hls.ttvnw.net"]
    // ];

    // 서버 리스트 2
    // 다음을 참고: https://twitchstatus.com/
    var server_list_2 = [
        ["hkg", "AS: Hong Kong"],
        ["sel", "AS: Seoul, South Korea"],
        ["sin", "AS: Singapore"],
        ["tpe", "AS: Taipei, Taiwan"],
        ["tyo", "AS: Tokyo, Japan"],
        ["syd", "AU: Sydney"],
        ["lis", "DEPRECATED Europe: Portugal, Lisbon"],
        ["scl", "DEPRECATED South America: Chile"],
        ["lim", "DEPRECATED South America: Lima, Peru"],
        ["mde", "DEPRECATED South America: Medellin, Colombia"],
        ["gig", "DEPRECATED South America: Rio de Janeiro, Brazil"],
        ["gru", "DEPRECATED South America: Sao Paulo, Brazil"],
        ["eze", "DEPRECATED: South America: Argentina"],
        ["vie", "Europe: Austria, Vienna"],
        ["cph", "Europe: Copenhagen, Denmark"],
        ["prg", "Europe: Czech Republic, Prague"],
        ["hel", "Europe: Finland, Helsinki"],
        ["mrs", "Europe: France, Marseille"],
        ["cdg", "Europe: France, Paris"],
        ["ber", "Europe: Germany, Berlin"],
        ["fra", "Europe: Germany, Frankfurt"],
        ["mil", "Europe: Italy, Milan"],
        ["ams", "Europe: Netherlands, Amsterdam"],
        ["osl", "Europe: Norway, Oslo"],
        ["waw", "Europe: Poland, Warsaw"],
        ["mad", "Europe: Spain, Madrid"],
        ["arn", "Europe: Sweden, Stockholm"],
        ["lhr", "Europe: United Kingdom, London"],
        ["ymq", "NA: Quebec, Canada"],
        ["qro", "NA: Queretaro, Mexico"],
        ["yto", "NA: Toronto, Canada"],
        ["slc", "Salt Lake City, UT"],
        ["sea", "Seattle, WA"],
        ["rio", "South America: Rio de Janeiro, Brazil"],
        ["sao", "South America: Sao Paulo, Brazil"],
        ["dfw", "US Central: Dallas, TX"],
        ["den", "US Central: Denver, CO"],
        ["hou", "US Central: Houston, TX"],
        ["iad", "US East: Ashburn, VA"],
        ["atl", "US East: Atlanta, GA"],
        ["ord", "US East: Chicago"],
        ["mia", "US East: Miami, FL"],
        ["jfk", "US East: New York, NY"],
        ["lax", "US West: Los Angeles, CA"],
        ["phx", "US West: Phoenix, AZ"],
        ["pdx", "US West: Portland, Oregon"],
        ["sfo", "US West: San Francisco, CA"],
        ["sjc", "US West: San Jose,CA"],
        ["akamai", "Akamai"]
    ];

    // 스타일 추가
    GM_addStyle(`
        #current_server{
            z-index:10;
            position:absolute;
            bottom:42px;
            right:18px;
            text-align:right;
            font-size:11px;
            ${typeof GM_setClipboard === "function" ? 
            `user-select: text;
            cursor: pointer;` : ``}
        }

        #copied{
            background-color:#575260;
            border-radius:2px;
            padding:1px 4px;
            margin-right:7px;
            user-select: none;
        }

        .player-tip, .player-button{
            z-index:60 !important;
        }
        .pl-menu, .pl-menu *{
            z-index:70 !important;
        }
    `);

    ////////////////////////////////////////////////////////////////////////////////////
    // Worker 선언자 탈취 및 덮어쓰기
    ////////////////////////////////////////////////////////////////////////////////////
    var realWorker = unsafeWindow.Worker;
    unsafeWindow.Worker = function (input) {
        // 명시적으로 String 으로 재변환한다
        var newInput = String(input);
        NOMO_DEBUG("newInput", newInput);

        // 19-09-18 기준 wasmworker 버전: 2.14.0
        var myBlob = "importScripts('https://cvp.twitch.tv/2.14.0/wasmworker.min.js')"; // ""

        // worker 버전이 바뀔 수도 있으므로 매번 체크
        // return 해야 하므로 async false 사용. 성능에는 별 영향 없다.
        $.ajax({
                url: newInput,
                type: "GET",
                async: false,
                timeout: 2000,
            })
            .done(function (response) {
                myBlob = response;
                NOMO_DEBUG("ajax response", response);
            })
            .fail(function (error) {
                myBlob = "importScripts('https://cvp.twitch.tv/2.14.0/wasmworker.min.js')";
                NOMO_DEBUG("Request failed", error);
            })
            .always(function (com) {
                NOMO_DEBUG("Complete", com);
            });

        // blob 다시쓰기
        var workerBlob = new Blob(
            [`
                // Worker 내부의 fetch 함수 탈취 & 덮어쓰기
                const originalFetch = self.fetch;
                self.fetch = function(input, init){
                    // Worker 밖으로 메시지 보내기
                    postMessage({"id":0,"type":"tsi","arg":input});

                    // 서버 자동으로 설정하기 전략
                    // 1. 본 블록 안에서 fetch 된 데이터를 미리 읽어서
                    // 2. segmenet 의 서버를 확인하고
                    // 3-1. 원하는 서버이면 리턴하고
                    // 3-2. 원하지 않는 서버이면 originalFetch 를 이용해서
                    //      원하는 서버가 잡힐 때 까지 1~3 을 반복한다.

                    return originalFetch.apply(this, arguments);
                };

                ${myBlob};
                //importScripts('https://cvp.twitch.tv/2.14.0/worker.min.js');
            `], {
                type: 'text/javascript'
            }
        );
        // blob 다시쓰기 끝

        var workerBlobUrl = URL.createObjectURL(workerBlob);
        // var my_worker = new realWorker(input);   // 다시 쓰지 않은 기존 blob 주소를 이용해 worker 를 생성하려면 이렇게 한다.
        var my_worker = new realWorker(workerBlobUrl);

        ////////////////////////////////////////////////////////////////////////////////////
        // Worker 밖에서 postMessage 수신 및 DOM 생성
        ////////////////////////////////////////////////////////////////////////////////////
        my_worker.onmessage = function (e) {
            // 타입 확인
            if (e.data.type === "tsi") {
                NOMO_DEBUG('Message received from worker', e.data);

                var msg_arg = e.data.arg;
                // 아래처럼 확인하면 채널 첫 접속 시 .m3u8 파일이 걸러진다.
                if (msg_arg.indexOf('usher.ttvnw.net/api/channel/hls') !== -1) {
                    // 기존 DOM을 지운다.
                    $("#current_server").remove();
                    nomo_global.prev_server = "";
                }
                // 아래처럼 확인하면 segment 를 받아오기 위한 .m3u8 파일과 .ts 파일이 걸러진다.
                // if (msg_arg.indexOf('.hls.ttvnw.net') !== -1) {
                // 현재는 .ts 파일만 확인한다.
                else if (msg_arg.indexOf("/v1/segment/")) {
                    // example1: https://video-edge-7e9b9c.sea01.abs.hls.ttvnw.net/v1/segment/CrkETpsPvu8J-JU7Uw41bTmckS0cEofD3pr3EKsfyLpEMWZgb5zeNdYkjkVo5KBYM95UtJvXIJsRRMKazzgDmtksZTSZU-f_EkxSuZrsRdGoaCeHqzbT4l-8mb0OOh9FohqMuzmla4eSVEagbddvmI-_vm3fXDRUehf2BtfhApNVXkcsCVhmrgUKXDuP8YWfdTwmQalG1YnIFtbRg3xw9CVKqajbU4FLcgI0sLHpS-bb3OquKpucwfo8paJyXh7XWCsRF_yLIcbv6iSS7i83uVTTHx54NX8V0K5CntIfVWAfYG-xaypl6qKAKKIRbNa-hsRSQ62Kvqltb_mu6LhStkK1F3qmln_e1hCc7ytx7TVAJmK-GeeplfvCGIxI4qnhl3dSTV0RushnljKYgiA3kt_yC-KbqPPMjTcRgyitGwjyxpHweeQJfJqFGJizcpaFMzmdI5gW_CbdXhX4FWq6TCaRjSCgwx_ewXC5Ct6W7QnWaep35BhxdhX1i0-hh7YflMDFKAykfB07m48DWINT_Fn1K98J0tLKL7yaNJedzM2PhF9AeARA5_fSTzBkA_duOY9fmpOpRFN1VpfmHID3tYDY1F_XZJJmiG6rd_UynJfji8ikbhwkgVc0_QWtOerN10ysY3IvUjlIJn0RwFScCNqdUoMKMKPMsOMfaS1oc1vq8YBPCagEgLnBk6A0d6A61x3brmAU2RaiOCEMChn-n80GyEH3AoIoDOW3fj6lOg1M2uKlMb8vPBYpYp8SEPpaz83YuxcS4pbU4mznHkMaDAsKJElIKxXWiGX3zw.ts
                    // example2: https://live003-ttvnw.akamaized.net/v1/segment/CsoBN06NSMlknciQP8zdCmSmxw4Zz7GxFwO-SNrfef7l7Z7x-pDKXl6F0jeUDQSkwEXm61AgNcRXavIb-g9kT8U4XkZaOBhtJa0DxO10EkIFpePqwhq7Vmazjn1E0cZ1vzp_dQmnBirLIYTUssV3NmwNAjA5-pIMqrj4ibG4h8r3xr2lRz-yAyzatBu0d9HgvGWYRvSWVm1I6bZ8ii_sNV1squ9LlvIEJ0uQ1bCvVnP7sMmurlnKvTx-VDwQ8veMH5G1FQbwm9ta8RmpLBIQHt-eAsho321hz6pZk697kBoMVpjw0pSuRgcYKTDb.ts
                    var current_server = msg_arg.match(/\/\/(?:vid[a-zA-Z0-9-_]+\.)?([a-zA-Z0-9-_.]+)\/v1\/segment\/.+\.ts/);
                    // /\/\/(?:vid[a-zA-Z0-9-_]+\.)?([a-zA-Z0-9-_.]+)\/v1\/segment\/.+\.ts/
                    // /\/\/([a-zA-Z0-9-_.]+)\/v1\/segment\/.+\.ts/
                    // /(\w+(?:\.abs)?\.hls\.ttvnw\.net).+\.ts/

                    // 제대로 찾은 경우
                    if (current_server !== null) {

                        // 서버 주소 가져오기
                        current_server = current_server.pop();

                        // 기존에 가져온 이름과 동일한지 확인하여 다를 경우에만 DOM 재생성
                        if (nomo_global.prev_server !== current_server) {
                            nomo_global.prev_server = current_server;
                            NOMO_DEBUG("현재 서버:", current_server);

                            // 서버 이름 매칭하기
                            var server_str = current_server.split(".")[0];
                            var server_name = "";
                            for (var i = 0; i < server_list_2.length; i++) {
                                if (server_str.indexOf(server_list_2[i][0]) !== -1) {
                                    server_name = "<br />(" + server_list_2[i][0].toUpperCase() + " / " + server_list_2[i][1] + ")";
                                    break;
                                }
                            }

                            var dom_string = current_server + server_name;

                            // 로깅 하기
                            if (nomo_global.LOGGING && typeof GM_getValue === "function" && typeof GM_setValue === "function") {
                                // 기존 데이터 불러옴
                                var log_data = GM_getValue("LOG_DATA", []);

                                // unix time 시간을 ms 버리고 s 단위로 저장한다.
                                var date_n = Number(new Date());
                                var date_s = String(date_n).substr(0, String(date_n).length - 3);

                                // 주소로부터 스트리머 id 가져오기
                                var streamer_id = String(document.location.href).match(/twitch\.tv\/(?:.+channel=)?([a-zA-Z0-9-_]+)\/?/); // /twitch\.tv\/(([a-zA-Z0-9-_]+)|.+channel=([a-zA-Z0-9-_]+))\/?/
                                if (streamer_id !== null) {
                                    streamer_id = streamer_id.pop();
                                } else {
                                    streamer_id = "";
                                }

                                log_data.unshift([date_s, streamer_id, current_server]);
                                if (log_data.length > LOGGING_MAX) {
                                    log_data = log_data.slice(0, LOGGING_MAX);
                                }
                                GM_setValue("LOG_DATA", log_data);
                                NOMO_DEBUG("로깅 완료", log_data);
                            }

                            // DOM 생성
                            var $player_menu = $(document).find(".player-buttons-right"); //find(".hover-display");
                            if ($player_menu.length !== 0) {
                                $(".player-buttons-right").find(".player-tip").css("z-index", 60);
                                $("#current_server").remove();
                                $(`<span id="current_server" style="display:none;">${dom_string}</span>`)
                                    .prependTo($player_menu)
                                    .fadeIn(500)
                                    .on("click", function () {
                                        if (typeof GM_setClipboard === "function") {
                                            GM_setClipboard(dom_string.replace("<br />", ""));

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

                                    });
                            } // DOM 생성 끝
                        } // 기존에 가져온 서버 이름과 동일한지 체크 끝
                    } // 정규표현식으로 .ts 파일 체크 끝
                } // indexOf('.hls.ttvnw.net') 체크 끝
            } // postMessage type 이 tsl 인지 체크 끝
        };

        ////////////////////////////////////////////////////////////////////////////////////
        // 최종 수정된 Worker
        ////////////////////////////////////////////////////////////////////////////////////
        NOMO_DEBUG("my_worker", my_worker);
        // Worker 를 생성하려고 했던 원래 함수로 return
        return my_worker;
    };
}