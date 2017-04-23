const debug = require('debug')('QUEUE');

function Queue (config = {}) {
  this.data = Array.isArray(config.data) ? config.data : [];
  this.worker = typeof(config.worker) === 'function' ? config.worker : null;
  this.onFinished = typeof(config.onFinished) === 'function' ? config.onFinished : null;
  this.concurrency = parseInt(config.concurrency) || 1;
  this.currentlyUsedWorkers = 0;
  this.paused = false;
  this.autoStart = typeof(config.autoStart) !== 'undefined' ? config.autoStart : false;
  debug('%o', config)
  if(this.data.length > 0 && this.autoStart) {
    this.doWork();
  };
}

Queue.prototype.start = function() {
  this.doWork();
}
Queue.prototype.done = function() {
  if (this.onFinished) {
    this.onFinished();
  }
}
Queue.prototype.enqueue = function(item) {
  this.data.push(item);
  debug(`adding ${item} to queue`)
  if(this.autoStart) {
    this.doWork();
  }
}
Queue.prototype.dequeue = function() {
  const item = this.data.pop();
  debug('dequeueing ', item);
  return item;
}

Queue.prototype.hasFreeWorkers = function() {
  return (this.currentlyUsedWorkers < this.concurrency);
}
Queue.prototype.doWork = function() {
  if (!this.paused && this.hasFreeWorkers()) {
    if(this.data.length > 0) {
      this.currentlyUsedWorkers++;
      const doWork = this.doWork.bind(this);
      this.worker(this.dequeue(), () => {
        this.currentlyUsedWorkers--;
        doWork();
      })
    } else {
      this.done();
    }
  }
}

Queue.prototype.pauseForTime = function(time) {
  if(parseInt(time)) {
    debug('PAUSING')
    this.paused = true;
    setTimeout(() => {
      debug('UN-PAUSING')
      this.paused = false;
      this.doWork();
    }, parseInt(time))
  }
}

Queue.prototype.pauseCallback = function(pauseCallback) {
  if(typeof(pauseCallback) === 'function') {
    debug('PAUSING')
    this.paused = true;
    pauseCallback(() => {
      debug('UN-PAUSING')
      this.paused = false;
      this.doWork();
    })
  }
}

 module.exports = Queue;

// var q = new Queue({
//   onFinished: function() {
//     debug('IM DONE');
//   },
//   autoStart: false,
//   concurrency: 2,
//   worker: function (data, done) {
//     setTimeout(() => {
//       debug('working on: ', data);
//       done();
//     }, 1000);
//   }
// });
//
// [1, 2, 3, 4, 5].forEach(e => q.enqueue(e));
// q.start();
// // setTimeout(() => {
// //   q.pauseForTime(5000);
// // }, 1500)
//
//
//  setTimeout(() => {
//    q.pauseCallback((cb) => {
//      setTimeout(() => {
//        cb();
//      }, 6000)
//    });
//  }, 1500)
//
//








/* API

create queue:
var q = new Queue({
  onFinished: function() { // default null
    debug('IM DONE');
  },
  concurrency: 1 // default 1
  autoStart: false, // default false
  data: [1,2,123,4,5,6];  // default []
  worker: function (data, done) { // default null
    setTimeout(() => {
      debug('working on: ', data);
      done();
    }, 1000);
  }
});

OR
var q = new Queue();
q.onFinished = function() { debug('IM DONE'); };
q.worker = function (data, done) { // default null
  setTimeout(() => {
    debug('working on: ', data);
    done();
  }, 1000);
};
[1, 2, 3, 4, 5].forEach(e => q.enqueue(e));
q.start();


PAUSING:

q.pauseForTime(5000); // pauses for 5 secs, then resumes

q.pauseCallback((done) => { // pauses until "done()" function is called
  setTimeout(() => {
    done();
  }, 6000)
});




*/
