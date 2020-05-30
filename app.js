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

// app.get('/orders', (req, res) => {
//     const q = "SELECT * FROM food_items;";
//     connection.query(q, function(err, results) {
//         if (err) throw err;
//         res.render("order", { items: results });
//     });

// });

app.get('/orders', isloggedin,(req, res) => {
    const q = "SELECT * FROM order_details;";
    connection.query(q, function(err, results) {
        if (err) throw err;
        res.render("orders", { orders: results });
    });})

app.get('/orders/new', isloggedin,(req, res) => {
    const q = "SELECT * FROM food_items;";
    connection.query(q, function(err, results) {
        if (err) throw err;
        res.render("new", { items: results });
    });
});

app.post('/orders', isloggedin,(req, res) => {
    var newOrder = {food_id: req.body.food_id, quantity : req.body.quantity, name: req.body.name, mobile_no: req.body.mobile_no, address: req.body.address, user_id: req.user.id};
    connection.query('INSERT INTO order_details SET ?', newOrder, (err, results) => {
        if (err) throw err;
        res.redirect("/orders");
    });
});

// app.get('/orderdetails', (req, res) => {
//     res.render('orderdetails');
// });

// app.post('/index', isloggedin, (req, res) => {
    // var newOrder = {quantity : req.body.quantity, name: req.body.name, mobile_no: req.body.mobile_no, address: req.body.address};
//     const q = 'INSERT INTO order_details(quantity, name, mobile_no, address) SET ?';
    // connection.query(q, newOrder, (err, results) => {
    //     if (err) throw err;
    //     res.render("orderdetails");
    // });
// });

// Order Route

// app.get('/order/new', isloggedin, (req, res) => {
//         res.render("order");
// });

// app.post('/order/:id/:user', isloggedin, (req, res) => {
//     var newOrder = {quantity : req.body.quantity, user_id: currentUser.id, food_id: req.params.id, name: req.body.name, mobile_no: req.body.mobile_no, address: req.body.address};
//     const q = 'INSERT INTO order_details(quantity, user_id, food_id, name, mobile_no, address) SET ?';
//     connection.query(q, newOrder, (err, results) => {
//         if (err) throw err;
//         res.render("orderdetails");
//     });
// });

// Order Placed Route
// app.get("/orderdetails/:id", isloggedin, (req, res) => {
//     const q = "SELECT * FROM order_details;";
//     connection.query(q, function(err, results) {
//         if (err) throw err;
//         res.render("orderdetails", { orders: results });
//     });
// });

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
    res.redirect('/');
})


// Middleware

function isloggedin(req, res, next){
    if(req.isAuthenticated()){
        next();
    }else{
        res.redirect('/login');
    }
}


const port = process.env.PORT || 3000;

app.listen(port, function() {
    console.log("Order Your Favourite Dishes");
});
