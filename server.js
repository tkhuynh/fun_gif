var express = require("express"),
		app = express(),
		bodyParser = require("body-parser"),
		mongoose = require('mongoose'),
		hbs = require('hbs'),
		auth = require('./resources/auth');

// require and load dotenv
require('dotenv').load();

app.use(bodyParser.urlencoded({extended: true}));
// To allow body-parser to send and receive JSON data
app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'hbs');

// please change the app name
mongoose.connect(
	process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
	'mongodb://localhost/fun_gif'
);

var Gif = require('./models/gif');
var User = require('./models/user');

// Set Up API

app.post('/auth/signup', function (req, res) {
  User.findOne({ email: req.body.email }, function (err, existingUser) {
    if (existingUser) {
      return res.status(409).send({ message: 'Email is already taken.' });
    }
    var user = new User({
      displayName: req.body.displayName,
      email: req.body.email,
      password: req.body.password
    });
    user.save(function (err, result) {
      if (err) {
        res.status(500).send({ message: err.message });
      } else {
        res.send({ token: auth.createJWT(result) });
      }
    });
  });
});

app.post('/auth/login', function (req, res) {
  User.findOne({ email: req.body.email }, '+password', function (err, user) {
    if (!user) {
      return res.status(401).send({ message: 'Invalid email or password.' });
    }
    user.comparePassword(req.body.password, function (err, isMatch) {
      if (!isMatch) {
        return res.status(401).send({ message: 'Invalid email or password.' });
      }
      res.send({ token: auth.createJWT(user) });
    });
  });
});

app.get('/api/me', auth.ensureAuthenticated, function (req, res) {
  User.findById(req.user, function (err, user) {
    res.send(user.populate('gifs'));
  });
});

app.put('/api/me', auth.ensureAuthenticated, function (req, res) {
  User.findById(req.user, function (err, user) {
    if (!user) {
      return res.status(400).send({ message: 'User not found.' });
    }
    user.displayName = req.body.displayName || user.displayName;
    user.email = req.body.email || user.email;
    user.save(function(err) {
      res.status(200).end();
    });
  });
});

app.get('/api/gifs', function (req, res) {
	Gif.find({}).sort({_id: -1}).exec(function (err, allGifs) {
		if (err) {
			res.status(500).json({error: err.message});
		} else {
			res.json({results: allGifs});
		}
	});
});

app.post('/api/gifs', function (req, res) {
	var newGif = new Gif(req.body);
	newGif.save(function (err, savedGif) {
		if (err) {
			res.status(500).json({error: err.message});
		} else {
			res.json(savedGif);
		}
	});
});

app.get("*", function (req, res) {
	res.render("index");
});

app.listen(process.env.PORT || 3000, function() {
	console.log("server running");
});