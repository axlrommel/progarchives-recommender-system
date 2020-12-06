const cheerio = require('cheerio');
const got = require('got');
const R = require('ramda');
const Redis = require('ioredis');

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

const myArgs = process.argv.slice(2);
const progReviews = `http://www.progarchives.com/Collaborators.asp?id=${myArgs[0]}`;
(async () => {
  try {
    const response = await got(progReviews);
    const $ = cheerio.load(response.body);

    const revs = $('ul').eq(6).html();
    const brs = R.split('<br>', revs);
    const revs_clean = R.map(R.trim, brs);
    const clean = revs_clean.map(i => {
      const idx = i.indexOf('/strong>');
      return i.substring(0, idx + 8);
    })
      .filter(i => i && i.length > 10);
    await Promise.all(
      clean.map(async (i) => {
        const starPos = i.indexOf('static-images/');
        const stars = i.substring(starPos + 14, starPos + 15);
        const artistIdx1 = i.indexOf('href=\"artist.asp?id=');
        const len1 = 'href=\"artist.asp?id='.length;
        const artistIdx2 = i.indexOf('\">', artistIdx1);
        const artistIdx3 = i.indexOf("</a>", artistIdx2);
        const albumIdx1 = i.indexOf('href=\"album.asp?id=');
        const len2 = 'href=\"album.asp?id='.length;
        const albumIdx2 = i.indexOf('\">', albumIdx1);
        const albumIdx3 = i.indexOf('</a>', albumIdx2);
        const reviewObj = {
          reviewerId: myArgs[0],
          stars,
          artistId: i.substring(artistIdx1 + len1, artistIdx2),
          artistName: i.substring(artistIdx2 + 2, artistIdx3),
          albumId: i.substring(albumIdx1 + len2, albumIdx2),
          albumName: i.substring(albumIdx2 + 2, albumIdx3)
        };
        // console.log(i);
        console.log(JSON.stringify(reviewObj));
        await redisCfg.sadd('reviews', JSON.stringify(reviewObj));
        return;
      })
    );
    process.exit(0);
  } catch (error) {
    //do nothing
  }
})();