/*
  eslint no-unused-vars: 0,
*/
const fs = require('fs');
const path = require('path');
const util = require('util');
const CDP = require('chrome-remote-interface');
const cheerio = require('cheerio');
const prettier = require('prettier');
const Twitter = require('twitter');
const debug = require('debug')('DATA');

const source = 'https://www.nytimes.com/interactive/2016/01/28/upshot/donald-trump-twitter-insults.html';

const twitterClient = new Twitter({
  consumer_key: 'Ka2UGqqTUuZANtnIjtcaerlHK',
  consumer_secret: 'Hu4UgAQaz2t1f5bfxeaH79L70CWIUrF52ytS01T2TPWm7CnXqj',
  access_token_key: '44652089-4BQ9fZ6N2aR8sR9XU3lgV0J44YF6M6XFDTutV6XRA',
  access_token_secret: 'b9HaSx3KD0UTXVwGpy2uU2vWMxTMrkSRmo62OaS9OcX9n',
});

const getData = url => new Promise((resolve) => {
  CDP((client) => {
    // Extract used DevTools domains.
    const { Page, Runtime } = client;
    // Enable events on domains we are interested in.
    Promise.all([
      Page.enable(),
    ]).then(() => Page.navigate({ url }));

    // Evaluate outerHTML after page has loaded.
    Page.loadEventFired(() => {
      Runtime.evaluate({
        expression: 'document.body.outerHTML',
      }).then((result) => {
        resolve(result.result.value);
        client.close();
      });
    });
  }).on('error', (err) => {
    console.error('Cannot connect to browser:', err);
  });
});

const clearText = text => text.replace(/“+/g, '').replace(/”+/g, '');

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
        insult.twitter = {};
        insult.twitter.id = insult.link.split('realDonaldTrump/status/')[1];
        insult.twitter.url = insult.link;
        insult.insult = clearText(anchor.text());
        insult.date = $insultElement.find('.g-kq-date-helper').text();
        HATE.insults.push(insult);
      });
    hatings.push(HATE);
  });
  return Promise.resolve(hatings);
};

const getTwitterData = (insultTweet) => new Promise((resolve) => {
  debug('getting data for %s ', insultTweet.id);
  twitterClient.get('statuses/show', {
    id: insultTweet.id,
  }, (err, response) => {
    if (err) {
      debug('error in %s ', insultTweet.id);
      console.error({
        error: true, data: err,
      });
      resolve({ error: true, data: err });
    } else {
      debug('obtained data for %s ', insultTweet.id);
      const newInsultTweet = Object.assign({
        loaded: true,
      }, insultTweet, response);
      debug('new data for tweet %s', newInsultTweet.id);
      resolve(newInsultTweet);
    }
  });
});

async function getDataForTweets(data) {
  let total = 0;
  data.forEach(hate => hate.insults.forEach((insult) => {
    if (!insult.loaded) {
      total += 1;
    }
  }));
  let iterator = 0;
  // return Promise.resolve(data.map(hate => hate.insults.map(insult => {
  //   if (!insult.twitter.loaded) {
  //     const newInsult = await getTwitterData(insult.twitter);
  //     if (!newInsult.error) {
  //       insult = newInsult;
  //     }
  //     debug(`RESOLVED ${iterator += 1} / ${total}`);
  //   }
  // })));
  for (let i = 0; i < data.length; i += 1) {
    const hate = data[i];
    for (let j = 0; j < hate.insults.length; j += 1) {
      let insult = hate.insults[j];
      if (!insult.loaded) {
        debug(`RESOLVED ${iterator += 1} / ${total}`);
        const newInsult = await getTwitterData(insult.twitter);
        if (!newInsult.error) {
          data[i].insults[j] = newInsult;
        }
      }
    }
  }
  return Promise.resolve(data);
}

const writeData = (hatings, file = './dataCrawler/data.js') => new Promise((resolve, reject) => {
  debug('writing file %s', file);
  fs.writeFile(path.resolve(process.cwd(), file), JSON.stringify(hatings), (err) => {
    if (err) {
      reject(err);
    } else {
      debug('file %s written', file);
      resolve();
    }
  });
});

const readData = (file = './dataCrawler/data.js') => new Promise((resolve, reject) => {
  fs.readFile(path.resolve(process.cwd(), file), (err, data) => {
    if (err) {
      reject(err);
    } else {
      resolve(JSON.parse(data));
    }
  });
});

getData(source)
  .then(data => cheerio.load(data))
  .then(parseData)
  .then(writeData)
  .then(readData)
  .then(getDataForTweets)
  .then(writeData)
  .then(() => console.log("DONE"))
  .catch(err => console.error(err));
