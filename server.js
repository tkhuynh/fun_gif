var express = require("express"),
    qs = require('querystring'),
		app = express(),
		bodyParser = require("body-parser"),
		mongoose = require('mongoose'),
		hbs = require('hbs'),
		auth = require('./resources/auth'),
    request = require('request');
    // config = require('./config');

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
      username: req.body.username,
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

app.post('/auth/facebook', function(req, res) {
  var fields = ['id', 'email', 'first_name', 'last_name', 'link', 'name'];
  var accessTokenUrl = 'https://graph.facebook.com/v2.5/oauth/access_token';
  var graphApiUrl = 'https://graph.facebook.com/v2.5/me?fields=' + fields.join(',');
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: process.env.FACEBOOK_SECRET,
    redirect_uri: req.body.redirectUri
  };

  // Step 1. Exchange authorization code for access token.
  request.get({ url: accessTokenUrl, qs: params, json: true }, function(err, response, accessToken) {
    if (response.statusCode !== 200) {
      return res.status(500).send({ message: accessToken.error.message });
    }

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: graphApiUrl, qs: accessToken, json: true }, function(err, response, profile) {
      if (response.statusCode !== 200) {
        return res.status(500).send({ message: profile.error.message });
      } console.log(profile);
      if (req.header('Authorization')) {
        User.findOne({ facebook: profile.id }, function(err, existingUser) {
          if (existingUser) {
            return res.status(409).send({ message: 'There is already a Facebook account that belongs to you' });
          }
          var token = req.header('Authorization').split(' ')[1];
          var payload = jwt.decode(token, process.env.TOKEN_SECRET);
          User.findById(payload.sub, function(err, user) {
            if (!user) {
              return res.status(400).send({ message: 'User not found' });
            }
            user.facebook = profile.id;
            user.picture = user.picture || 'https://graph.facebook.com/v2.3/' + profile.id + '/picture?type=large';
            user.displayName = user.displayName || profile.name;
            user.save(function() {
              var token = auth.createJWT(user);
              res.send({ token: token });
            });
          });
        });
      } else {
        // Step 3. Create a new user account or return an existing one.
        User.findOne({ facebook: profile.id }, function(err, existingUser) {
          if (existingUser) {
            var token = auth.createJWT(existingUser);
            return res.send({ token: token });
          }
          var user = new User();
          user.facebook = profile.id;
          user.picture = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
          user.displayName = profile.name;
          user.save(function() {
            var token = auth.createJWT(user);
            res.send({ token: token });
          });
        });
      }
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
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    user.save(function(err) {
      res.status(200).end();
    });
  });
});

app.get('/api/gifs', function (req, res) {
	Gif.find({}).sort({_id: -1}).populate('owner').exec(function (err, allGifs) {
		if (err) {
			res.status(500).json({error: err.message});
		} else {
			res.json({results: allGifs});
		}
	});
});

app.post('/api/gifs', auth.ensureAuthenticated, function (req, res) {
  User.findById(req.user, function (err, user) {
  	var newGif = new Gif(req.body);
    newGif.owner = user._id;
  	newGif.save(function (err, savedGif) {
  		if (err) {
  			res.status(500).json({error: err.message});
  		} else {
        user.gifs.push(newGif);
        user.save();
  			res.json(savedGif);
  		}
  	});
  });
});

app.delete('/api/gifs/:id', auth.ensureAuthenticated, function (req, res) {
  var gifId = req.params.id;
  User.findById(req.user, function (err, user) {
    Gif.findById(gifId, function (err, foundGif) {
      if (foundGif.owner.toString() === user._id.toString()) {
        Gif.findOneAndRemove({
          _id: gifId
        }, function (err, deletedGif) {
          user.gifs.splice(user.gifs.indexOf(gifId), 1);
          user.save();
        });
      }
    });
  });
});

app.get("*", function (req, res) {
	res.render("index");
});

app.listen(process.env.PORT || 3000, function() {
	console.log("server running");
});