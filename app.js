var express = require('express')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var validator = require('express-validator')
var ejs = require('ejs')
var engine = require('ejs-mate')
var session = require('express-session')
var mongoose = require('mongoose')
var MongoStore = require('connect-mongo')(session)
var passport = require('passport');
var flash = require('connect-flash');
var app = express()

mongoose.connect('mongodb://localhost/farmingApp')

require('./config/passport');
app.use(express.static('public'))
app.engine('ejs', engine)
app.set('view engine', 'ejs')
app.use(cookieParser())

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(validator());
// here our session data is save in our database
app.use(
  session({
    secret: 'yazan123',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: mongoose.connection
    })
  })
)

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
require('./routes/user')(app,passport)
app.listen(3002, function () {
  console.log('App running in Port 3002')
})
