var nodemailer = require('nodemailer')
var smtpTransport = require('nodemailer-smtp-transport')
var async = require('async')
var crypto = require('crypto')

var User = require('../models/user')
var secret = require('../secret/secret')
module.exports = (app, passport) => {
  app.get('/', function (req, res, next) {
    res.render('index', { title: 'Index || Rate Me' })
  })

  app.get('/signup', (req, res) => {
    var errors = req.flash('error')
    console.log(errors)
    res.render('user/signup', {
      title: 'Sign Up || Rate Me',
      messages: errors,
      hasErrors: errors.length > 0
    })
  })

  app.post(
    '/signup',
    validator,
    passport.authenticate('local.signup', {
      successRedirect: '/home',
      failureRedirect: '/signup',
      failureFlash: true
    })
  )
  app.get('/login', (req, res) => {
    var errors = req.flash('error')

    res.render('user/login', {
      title: 'Login || Rate Me',
      errors: errors,
      hasErrors: errors.length > 0
    })
  })
  app.post(
    '/login',
    validateLogin,
    passport.authenticate('local.login', {
      successRedirect: '/home',
      failureRedirect: '/login',
      failureFlash: true
    })
  )
  app.get('/home', (req, res) => {
    res.render('home', { title: 'Home || Rate Me' })
  })
  app.get('/forgot', (req, res) => {
    var errors = req.flash('error')
    var info = req.flash('info')

    res.render('user/forgot', {
      title: 'Request password Reset',
      errors: errors,
      hasErrors: errors.length > 0,
      info: info,
      noErrors: info.length > 0
    })
  })
  app.post('/forgot', (req, res, next) => {
    async.waterfall(
      [
        function (callback) {
          crypto.randomBytes(20, (err, buf) => {
            var rand = buf.toString('hex')
            callback(err, rand)
          })
        },
        function (rand, callback) {
          User.findOne({ email: req.body.email }, (err, user) => {
            if (!user) {
              req.flash(
                'error',
                'No Account With that email Exist or Email is invalid'
              )
              return res.redirect('/forgot')
            }
            user.passwordResetToken = rand
            user.passwordResetExpires = Date.now() + 60 * 60 * 1000
            user.save(err => {
              callback(err, rand, user)
            })
          })
        },
        function (rand, user, callback) {
          var smtpTransport = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
              user: secret.auth.user,
              pass: secret.auth.pass
            }
          })

          var mailOptions = {
            to: user.email,
            from: 'RateMe ' + '<' + secret.auth.user + '>',
            subject: 'RateMe Application Password Reset Token',
            text: 'You have requested for password reset token. \n\n' +
              'Please Click on the link to complete the process: \n\n' +
              'http://localhost:3002/reset/' +
              rand +
              '\n\n'
          }
          smtpTransport.sendMail(mailOptions, (err, response) => {
            req.flash(
              'info',
              'A password reset token has been sent to ' + user.email
            )
            return callback(err, user)
          })
        }
      ],
      err => {
        if (err) {
          return next(err)
        }
        res.redirect('/forgot')
      }
    )
  })
  app.get('/reset/:token', (req, res) => {
    User.findOne(
      {
        passwordResetToken: req.params.token,
        passwordResetExpires: { $gt: Date.now() }
      },
      (err, user) => {
        if (!user) {
          req.flash(
            'error',
            'Password reset token has expired or invalid.Enter your email to get a new token.'
          )
          return res.redirect('/forgot')
        }
        var errors = req.flash('error')
        var success = req.flash('success')

        res.render('user/reset', {
          title: 'Reset Your Password',
          errors: errors,
          hasErrors: errors.length > 0,
          success: success,
          noErrors: success.length > 0
        })
      }
    )
  })

  app.post('/reset/:token', (req, res) => {
    async.waterfall([
      function (callback) {
        User.findOne(
          {
            passwordResetToken: req.params.token,
            passwordResetExpires: { $gt: Date.now() }
          },
          (err, user) => {
            if (!user) {
              req.flash(
                'error',
                'Password reset token has expired or invalid.Enter your email to get a new token.'
              )
              return res.redirect('/forgot')
            }
            req.checkBody('password', 'Password is Required').notEmpty()
            req
              .checkBody('password', 'Password must not be less than 5.')
              .isLength({ min: 5 })
            req
              .check('password', 'Password Must Contain at least 1 Number.')
              .matches(/^(?=.*\d)(?=.*[a-z])[0-9a-z]{5,}$/, 'i')
            var errors = req.validationErrors()
            if (req.body.password == req.body.cpassword) {
              if (errors) {
                var messages = []
                errors.forEach(error => {
                  messages.push(error.msg)
                })
                var errors = req.flash('error')
                res.redirect('/reset/' + req.params.token)
              } else {
                user.password = req.body.password
                user.passwordResetToken = undefined
                user.passwordResetExpires = undefined

                user.save(err => {
                  req.flash(
                    'success',
                    'Your password has been successfully updated.'
                  )
                  callback(err, user)
                })
              }
            } else {
              req.flash('error', 'Password and confirm password is not equal.')
              res.redirect('/reset/' + req.params.token)
            }
          }
        )
      },
      function (user, callback) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: secret.auth.user,
            pass: secret.auth.pass
          }
        })

        var mailOptions = {
          to: user.email,
          from: 'RateMe ' + '<' + secret.auth.user + '>',
          subject: 'Your password has been updated',
          text: 'This is a confirmation that you updated a password for' +
            '' +
            user.email
        }
        smtpTransport.sendMail(mailOptions, (err, res) => {
          callback(err, user)
          var error = req.flash('error')
          var success = req.flash('success')

          res.render('user/reset', {
            title: 'Reset Your Password',
            errors: error,
            hasErrors: error.length > 0,
            success: success,
            noErrors: success.length > 0
          })
        })
      }
    ])
  })
}

function validator (req, res, next) {
  req.checkBody('fullname', 'Fullname is Required').notEmpty()
  req
    .checkBody('fullname', 'Fullname must not be less than 5.')
    .isLength({ min: 5 })
  req.checkBody('email', 'Email is Required').notEmpty()
  req.checkBody('email', 'Email is Invalid').isEmail()
  req.checkBody('password', 'Password is Required').notEmpty()
  req
    .checkBody('password', 'Password must not be less than 5.')
    .isLength({ min: 5 })
  req
    .check('password', 'Password Must Contain at least 1 Number.')
    .matches(/^(?=.*\d)(?=.*[a-z])[0-9a-z]{5,}$/, 'i')

  var errors = req.validationErrors()
  if (errors) {
    var messages = []
    errors.forEach(error => {
      messages.push(error.msg)
    })

    req.flash('error', messages)
    res.redirect('/signup')
  } else {
    return next()
  }
}

function validateLogin (req, res, next) {
  req.checkBody('email', 'Email is Required').notEmpty()
  req.checkBody('email', 'Email is Invalid').isEmail()
  req
    .checkBody('password', 'Password must not be less than 5.')
    .isLength({ min: 5 })
  req
    .check('password', 'Password Must Contain at least 1 Number.')
    .matches(/^(?=.*\d)(?=.*[a-z])[0-9a-z]{5,}$/, 'i')

  var errors = req.validationErrors()
  if (errors) {
    var messages = []
    errors.forEach(error => {
      messages.push(error.msg)
    })

    req.flash('error', messages)
    res.redirect('/login')
  } else {
    return next()
  }
  console.log(messages)
}
