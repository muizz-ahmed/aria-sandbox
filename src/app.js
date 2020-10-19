var createError = require('http-errors');
var express = require('express');
var favicon = require('serve-favicon');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
// var cors = require('cors');
var bodyParser = require('body-parser');
var session = require('express-session');
var helmet = require('helmet');

var indexRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', 1);

app.use(helmet());

// favicon setup
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.jpg')));

// use express-session
app.use(session({
  secret: 'aria-api-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 60000 * 60 * 24,
  }
}));


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true, parameterLimit: 50000}));
// app.use(cors());
// app.options('*', cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);
  if(req.method === 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  if (req.url.startsWith('/admin')) {
    res.send(err);
  } else {
    res.render('error');
  }
});

module.exports = app;
