const fs = require('fs');
const CDP = require('chrome-remote-interface');
const source = 'https://www.nytimes.com/interactive/2016/01/28/upshot/donald-trump-twitter-insults.html';


// // TEST ALL REQUESTS
// CDP((client) => {
//     // extract domains
//     const {Network, Page} = client;
//     // setup handlers
//     Network.requestWillBeSent((params) => {
//         console.log(params.request.url);
//     });
//     Page.loadEventFired(() => {
//         client.close();
//     });
//     // enable events then start!
//     Promise.all([
//         Network.enable(),
//         Page.enable()
//     ]).then(() => {
//         return Page.navigate({url: source});
//     }).catch((err) => {
//         console.error(err);
//         client.close();
//     });
// }).on('error', (err) => {
//     // cannot connect to the remote endpoint
//     console.error(err);
// });


CDP((client) => {
  // Extract used DevTools domains.
  const { Page, Runtime } = client;

  // Enable events on domains we are interested in.
  Promise.all([
    Page.enable()
  ]).then(() => {
    return Page.navigate({url: source});
  });

  // Evaluate outerHTML after page has loaded.
  Page.loadEventFired(() => {
    Runtime.evaluate({expression: 'document.body.outerHTML'}).then((result) => {
      console.log(result.result.value);
      client.close();
    });
  });
}).on('error', (err) => {
  console.error('Cannot connect to browser:', err);
});
