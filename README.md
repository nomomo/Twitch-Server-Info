# Twitch-Server-Info

트위치 서버 이름을 화면에 표시해주는 UserScript

## Preview

- 스크립트를 적용하면 플레이어에 마우스를 올렸을 때 서버 주소와 서버가 위치한 지역을 표시합니다.  
클릭하면 클립보드에 서버 이름을 복사합니다.

![Preview](https://raw.githubusercontent.com/nomomo/Twitch-Server-Info/master/images/preview.png)

- Live 시청 중 서버가 자동 변경되는 경우 작은 팝업으로 알리고, 서버 변경 이력을 표시합니다. (최대 3개)  
팝업은 15초 동안 표시되며 클릭 시 바로 꺼집니다.

![Sample Screenshot](https://raw.githubusercontent.com/nomomo/Twitch-Server-Info/master/images/preview_sc.png)

- Toolbar 의 Tampermonkey 아이콘 - Twitch-Server-Info - Change Notification Setting 을 클릭하여 서버 변경 시 팝업 알림 여부를 켜고 끌 수 있습니다.

## Install

### STEP 1. ScriptManager

자신의 브라우저에 맞는 유저스크립트 관리 확장기능 설치 (동작 테스트는 Chrome, Firefox 에서만 했습니다.)

- Firefox - [Tampermonkey](https://addons.mozilla.org/ko/firefox/addon/tampermonkey/)
- Chrome - [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=ko)
- Opera - [Tampermonkey](https://addons.opera.com/extensions/details/tampermonkey-beta/)
- Safari 12+ | MacOS 10.14.4+ - [Tampermonkey](https://apps.apple.com/us/app/tampermonkey/id1482490089)
- Safari 6-12 - [Tampermonkey](https://safari.tampermonkey.net/tampermonkey.safariextz)
- Edge - [Tampermonkey](https://www.microsoft.com/store/p/tampermonkey/9nblggh5162s)
  
### STEP 2. UserScript

확장 기능 설치 이후 아래의 링크를 클릭하여 이동, 설치 버튼 누르기

- [Install](https://raw.githubusercontent.com/nomomo/Twitch-Server-Info/master/Twitch-Server-Info.user.js) from [https://raw.githubusercontent.com/nomomo/Twitch-Server-Info/master/Twitch-Server-Info.user.js](https://raw.githubusercontent.com/nomomo/Twitch-Server-Info/master/Twitch-Server-Info.user.js)

> 주의: 본 스크립트를 설치 및 사용하며 브라우저 과부하로 인한 응답 없음/뻗음 등 으로 인한 데이터 손실 등 문제 발생 시 개발자는 책임지지 않음(보고된 문제는 없음)  
> Twitch 접속에 문제가 생기거나 동영상 재생이 안 되는 문제 등이 발생하는 경우, Tampermonkey 의 관리 메뉴에서 이 스크립트를 끄거나 삭제해주세요.

## Q&A

- Q: Akamai 는 뭔가요? 지역이 어딘가요?  
A: Akamai 는 Twitch 가 이용하는 CDN 서비스입니다. 특정 지역의 이용자가 많아지면 해당 지역의 초과된 트래픽 처리를 위해 CDN 을 이용하는 것으로 추정됩니다. 주말 저녁과 같은 피크시간을 제외하고 Akamai 의 연결 속도는 대체로 양호한 편입니다. 대한민국 지역에서 접속 시 연결되는 서버의 상세 이름은 Akamai_korea 이며, 한국 지역을 담당하는 서버로 추정됩니다. 대한민국 외 지역에서 접속 시 연결되는 Akamai 서버가 달라지는지 확인되지 않아 편의상 Akamai 로만 표기하고 있습니다.
- Q: 스쿼드 스트리밍을 지원하나요?  
A: 현재 지원하지 않습니다. 꼭 필요한 경우 멀티트위치를 사용해주세요.

## Bug report

버그 많음 버그리포트 바랍니다 (__) nomotg@gmail.com

## Change log
<<<<<<< HEAD

### 0.0.9 (2021-08-04)

- Web Worker 를 override 하는 일부 스크립트와 충돌하는 증상을 개선 (예: TwitchAdSolutions)

=======
### 0.0.9 (2021-03-16)
- JQuery Library 의 http 요청 관련 문제 수정
>>>>>>> be6d06658b45b88f96f26adb60454491f2cecb7d
### 0.0.8 (2019-12-09)

- 특정 환경에서 twitch.tv 의 클립, 지난 동영상이 재생되지 않는 문제 개선

### 0.0.7 (2019-10-27)

- 스쿼드 스트리밍 시 작동하지 않도록 변경

### 0.0.6 (2019-10-17)

- 설정 버튼 클릭 후 서버 표시 위치가 변경되는 문제 수정 (Twitch 개편 이후 스타일이 수시로 바뀌고 있어서 대응 중)

### 0.0.5 (2019-10-15)

- Live 시청 중 서버가 자동으로 변경되는 경우 알리고, 변경 이력을 표시
- 서버 표시 위치를 찾을 수 없는 경우 팝업 메시지를 통해 알리도록 하여 아예 동작하지 않는 것을 방지

### 0.0.4 (2019-10-09)

- Twitch 디자인 개편 후 제대로 표시되지 않는 문제 수정

### 0.0.3 (2019-09-21)

- 디버그 및 테스트 용 기능 추가

### 0.0.2 (2019-09-20)

- Live 시청 후 VOD 재생 화면으로 넘어갈 경우, 서버 표시 문구를 지우도록 수정

### 0.0.1 (2019-09-19)
<<<<<<< HEAD

=======
>>>>>>> be6d06658b45b88f96f26adb60454491f2cecb7d
- 현재 서버 주소 / 위치 표시 기능 추가
