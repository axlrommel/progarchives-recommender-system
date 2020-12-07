const Redis = require('ioredis');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
  path: './data/output.csv',
  alwaysQuote: true,
  header: ['reviewerId', 'stars', 'artistId', 'artistName', 'albumId', 'albumName'],
  append: true
});

const redisCfg = new Redis({
  port: 6379,
  host: '127.0.0.1',
  db: 6,
  maxRetriesPerRequest: 0,
  lazyConnect: true,
  reconnectOnError: function () {
    return false;
  },
});

(async () => {
  try {
    let get_more = true;
    while (get_more) {
      let arr = [];
      for (i = 0; i < 100; i++) {
        const entry = await redisCfg.spop('reviews');
        if (!entry) {
          get_more = false;
          break;
        }
        arr.push(JSON.parse(entry));
      }
      await csvWriter.writeRecords(arr);
      arr = [];
    }
    process.exit(0);
  } catch (err) {
    //do nothing
  }
})();
