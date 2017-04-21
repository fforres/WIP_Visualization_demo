const fs = require('fs');
const cheerio = require('cheerio');
const CDP = require('chrome-remote-interface');
const prettier = require("prettier");

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

const getData = (url) => new Promise((resolve, reject) => {
  CDP((client) => {
    // Extract used DevTools domains.
    const { Page, Runtime } = client;
    // Enable events on domains we are interested in.
    Promise.all([
      Page.enable()
    ]).then(() => {
      return Page.navigate({url});
    });

    // Evaluate outerHTML after page has loaded.
    Page.loadEventFired(() => {
      Runtime.evaluate({
        expression: 'document.body.outerHTML'
      }).then((result) => {
        resolve(result.result.value);
        client.close();
      });
    });
  }).on('error', (err) => {
    console.error('Cannot connect to browser:', err);
  });
});

const clearText = (text) => {
  return text.replace(/“+/g, '').replace(/”+/g, '');
};

const parseData = ($) => {
  const hatings = [];
  $('.g-entity-item').each((i, el) => {
    const HATE = {};
    const $el = $(el);
    HATE.name = $el.find('.g-entity-name').text();
    HATE.type = $el.find('.g-entity-title').text();
    HATE.insults = [];
    $el.find('.g-insult-links-c')
      .each((insultIndex, element) => {
        const $insultElement = $(element);
        const insult = {};
        const anchor = $insultElement.find('a');
        insult.link = anchor.attr('href');
        insult.insult = clearText(anchor.text());
        insult.date = $insultElement.find('.g-kq-date-helper').text();
        HATE.insults.push(insult);
      });
    hatings.push(HATE);
  });
  return Promise.resolve(JSON.stringify(hatings));
};

const writeData = (data) => new Promise((resolve, reject) => {
  fs.writeFile('./vr/data.js',
    prettier.format(data),
    (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    }
  )
});

getData(source)
  .then(data => cheerio.load(data))
  .then(parseData)
  .then(writeData)
  .then(() => console.log("DONE"))
  .catch(el => console.error(err));
