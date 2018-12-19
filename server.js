'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var validUrl = require('valid-url');

var cors = require('cors');

const dns = require('dns');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);
mongoose.connect(process.env.MONGODB_URI);

app.use(cors());

var urlSchema = new mongoose.Schema({
  url: { type: String, required: true },
  shortUrl: Number 
});

var URL = mongoose.model("URL", urlSchema);

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }))

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});


app.get('/api/shorturl/:url', function(req, res) { 
  let shortUrl = req.params.url;

  // get url for shorturl
  const query = URL.find(); // `query` is an instance of `Query`
  query.setOptions({ lean : true });
  query.collection(URL.collection);
  query.where('shortUrl').eq(shortUrl).exec(function(err, results) {
      if (err) throw err;
      // if url not in db add it and get short url
      if (results.length === 0) {
         res.send({"error": "Short url not recognized"});
      } else {
        res.redirect(results[0].url);
      }
  })
});

app.post('/api/shorturl/new', function(req, res) { 
  let longUrl = req.body.url;
  let shortUrl;
  
  if (!validUrl.isUri(longUrl)) 
    res.json({'error':'invalid url'});
  else {
   // remove any thing before and including the '//' and check if valid web address
    dns.lookup(req.body.url.replace(/(^\w+:|^)\/\//, ''), function(err, address, family){
      if(err) {
        res.json({'error':'invalid url'})}
      else {
        // see if url already in db
        const query = URL.find(); // `query` is an instance of `Query`
        query.setOptions({ lean : true });
        query.collection(URL.collection);
        query.where('url').eq(longUrl).exec(function(err, results) {
          if (err) throw err;
          // if url not in db add it and get short url
          if (results.length === 0) {
            // first get count 
            URL.count({}, function(err, count){
              shortUrl = count + 1;
              let newUrl = new URL({ url: longUrl, shortUrl: shortUrl});
              newUrl.save(function (err,data) {
                if (err) return console.log(err);
                // saved!
                res.send({"original_url": longUrl, "short_url": shortUrl});
              });
            });
          } 
          else {
            shortUrl = results[0].shortUrl; 
            res.send({"original_url": longUrl, "short_url": shortUrl});
          }
        })
      }
  });
 }
});

// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});