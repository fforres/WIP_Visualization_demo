# Things Trump Hate

#### How to update the data:

1. Open a headless chrome instance:
  > (Can also be a stable release, but as for 20/04/2017, Canary does de trick)

  *On Windows*
  ```
  start "" "C:\Users\felip\AppData\Local\Google\Chrome SxS\Application\chrome.exe" --headless --remote-debugging-port=9222
  ```

  *On mac/unix*
  - https://objectpartners.com/2017/04/13/how-to-install-and-use-headless-chrome-on-osx/
  - https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md

2. run `npm run start:data`
