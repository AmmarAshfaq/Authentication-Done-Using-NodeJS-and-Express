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
  app.get('/forgot',(req,res)=>{
    res.render('user/forgot',{title:'Request password Reset'})
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

function validateLogin(req,res,next){
  req.checkBody('email','Email is Required').notEmpty();
  req.checkBody('email','Email is Invalid').isEmail();
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