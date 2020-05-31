require('dotenv').config();

const express = require("express"),
      app = express(),
      session = require('express-session'),
      bodyParser = require("body-parser"),
      expressSanitizer = require("express-sanitizer"),
      methodOverride = require("method-override"),
      mysql = require("mysql"),
      bcrypt = require('bcrypt-nodejs'),
      passport = require("passport"),
      flash = require("connect-flash"),
      LocalStrategy = require("passport-local");

// App Config
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressSanitizer());
app.use(methodOverride("_method"));

// Passport Config
app.use(session({
    secret: "System Breached",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function(req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash('error');
    res.locals.signupMessage = req.flash('signupMessage');
    res.locals.loginMessage = req.flash('loginMessage');
    res.locals.success = req.flash('success');
    next();
});

// Database Config
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'foodapp',
    multipleStatements: true
});

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(function(id, done) {
    connection.query("SELECT * FROM users WHERE id = ? ", [id],
        function(err, rows) {
            done(err, rows[0]);

        });
});

// Passport Sign-Up

passport.use(
    'local-signup',
    new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true
        },
        function(req, username, password, done) {
            connection.query("SELECT * FROM users WHERE username = ? ", [username], function(err, rows) {
                if (err)
                    return done(err);
                if (rows.length) {
                    return done(null, false, req.flash('signupMessage', 'That is already taken'));
                } else {
                    const newUserMysql = {
                        username: username,
                        password: bcrypt.hashSync(password, null, null)
                    };

                    const insertQuery = "INSERT INTO users (username, password) values (?, ?)";

                    connection.query(insertQuery, [newUserMysql.username, newUserMysql.password],
                        function(err, rows) {
                            newUserMysql.id = rows.insertId;

                            return done(null, newUserMysql);
                        });
                }
            });
        })
);


// Passport Login

passport.use(
    'local-login',
    new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true
        },
        function(req, username, password, done) {
            connection.query("SELECT * FROM users WHERE username = ? ", [username],
                function(err, rows) {
                    if (err)
                        return done(err);
                    if (!rows.length) {
                        return done(null, false, req.flash('loginMessage', 'No User Found'));
                    }
                    if (!bcrypt.compareSync(password, rows[0].password))
                        return done(null, false, req.flash('loginMessage', 'Wrong Password'));

                    return done(null, rows[0]);
                });
        })
);

// Routes

app.get("/", function(req, res) {
    res.redirect("/menu");
});

// Index Route

app.get("/menu", (req, res) => {
    const q = "SELECT * FROM food_items;";
    connection.query(q, function(err, results) {
        if (err) throw err;
        res.render("menu", { items: results });
    });
});

// Previous Orders Route

app.get('/orders', isloggedin,(req, res) => {
    // const q = 'SELECT order_details.payment, food_items.item_name, food_items.image_url, order_details.name, order_details.quantity,order_details.mobile_no, order_details.address, order_details.placed_at FROM food_items INNER JOIN order_details ON food_items.id = order_details.food_id;';
    const q = "SELECT f.item_name, f.image_url, f.price, o.quantity, o.name, o.payment, o.address, o.placed_at, o.mobile_no FROM order_details AS o INNER JOIN food_items AS f ON o.food_id = f.id INNER JOIN users AS u ON o.user_id = u.id WHERE u.id =" + req.user.id + ";";
    connection.query(q, function(err, results) {
        if (err) throw err;
        res.render("orders", { orders: results });
    });
});

// New Order Form

app.get('/orders/new', isloggedin,(req, res) => {
    const q = "SELECT * FROM food_items;";
    connection.query(q, function(err, results) {
        if (err) throw err;
        res.render("new", { items: results });
    });
});

// New Order Route

app.post('/orders', isloggedin,(req, res) => {
    var newOrder = {food_id: req.body.food_id, quantity : req.body.quantity, name: req.body.name, mobile_no: req.body.mobile_no, address: req.body.address, user_id: req.user.id, payment: req.body.payment};
    connection.query('INSERT INTO order_details SET ?', newOrder, (err, results) => {
        if (err) throw err;
        res.redirect("/orders");
    });
});

// Reviews Routes

app.get('/reviews', (req, res) => {
    const q = 'SELECT r.review, r.reviewed_at,u.username FROM reviews as r INNER JOIN users AS u ON r.user_id = u.id;';
    connection.query(q, (err, results) => {
        if (err) throw err;
        res.render("reviews", { reviews: results });
    });
});

// New Review Route

app.get('/reviews/new', isloggedin,(req, res) => {
    res.render('newreview');
});

app.post('/reviews', (req, res) => {
    var newReview = {review: req.body.review, user_id: req.user.id};
    connection.query('INSERT INTO reviews SET ?', newReview, (err, results) => {
        if (err) throw err;
        res.redirect("/reviews");
    });
});

// Authentication Routes

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", function(req, res, next) {
    passport.authenticate("local-signup", {
        successRedirect: "/",
        failureRedirect: "/register",
        failureFlash: true
    })(req, res);
});

app.get("/login", function(req, res) {
    res.render("login");
});

app.post("/login", function(req, res, next) {
    passport.authenticate("local-login", {
        successRedirect: "/",
        failureRedirect: "/login",
        failureFlash: true
    })(req, res);
});

app.get('/logout', function(req, res) {
    req.logout();
    req.flash("success", "Logged you out!");
    res.redirect('/menu');
});


// Middleware

function isloggedin(req, res, next){
    if(req.isAuthenticated()){
        next();
    }else{
        req.flash('error', 'You need to be logged in to do that');
        res.redirect('/login');
    }
}


const port = process.env.PORT || 3000;

app.listen(port, function() {
    console.log("Order Your Favourite Dishes");
});
