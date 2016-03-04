var express = require("express"),
    qs = require('querystring'),
		app = express(),
		bodyParser = require("body-parser"),
		mongoose = require('mongoose'),
		hbs = require('hbs'),
		auth = require('./resources/auth'),
    request = require('request');

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

// Facebook login
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
      }
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
            user.email = user.email || profile.email;
            user.username = user.username || profile.id;
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
          user.email = profile.email;
          user.username = profile.id;
          user.save(function() {
            var token = auth.createJWT(user);
            res.send({ token: token });
          });
        });
      }
    });
  });
});

// Google Login
app.post('/auth/google', function(req, res) {
  var accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
  var peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: process.env.GOOGLE_SECRET,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post(accessTokenUrl, { json: true, form: params }, function(err, response, token) {
    var accessToken = token.access_token;
    var headers = { Authorization: 'Bearer ' + accessToken };

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: peopleApiUrl, headers: headers, json: true }, function(err, response, profile) {
      if (profile.error) {
        return res.status(500).send({message: profile.error.message});
      }
      // Step 3a. Link user accounts.
      if (req.header('Authorization')) {
        User.findOne({ google: profile.sub }, function(err, existingUser) {
          if (existingUser) {
            return res.status(409).send({ message: 'There is already a Google account that belongs to you' });
          }
          var token = req.header('Authorization').split(' ')[1];
          var payload = jwt.decode(token, process.env.TOKEN_SECRET);
          User.findById(payload.sub, function(err, user) {
            if (!user) {
              return res.status(400).send({ message: 'User not found' });
            }
            user.google = profile.sub;
            user.picture = user.picture || profile.picture.replace('sz=50', 'sz=200');
            user.displayName = user.displayName || profile.name;
            user.email = user.email || profile.email;
            user.username = user.username || profile.sub;
            user.save(function(err) {
              var token = auth.createJWT(user);
              res.send({ token: token });
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        User.findOne({ google: profile.sub }, function(err, existingUser) {
          if (existingUser) {
            return res.send({ token: auth.createJWT(existingUser) });
          }
          var user = new User();
          user.google = profile.sub;
          user.picture = profile.picture.replace('sz=50', 'sz=200');
          user.displayName = profile.name;
          user.email = profile.email;
          user.username = profile.sub;
          user.save(function(err) {
            var token = auth.createJWT(user);
            res.send({ token: token });
          });
        });
      }
    });
  });
});


// Ger logged in user profile
app.get('/api/me', auth.ensureAuthenticated, function (req, res) {
  User.findById(req.user, function (err, user) {
    res.send(user.populate('gifs'));
  });
});

// Edit logged in user profile
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

// Get Users' Favorite Gifs
app.get('/api/gifs', function (req, res) {
	Gif.find({}).sort({_id: -1}).populate('owner').exec(function (err, allGifs) {
		if (err) {
			res.status(500).json({error: err.message});
		} else {
			res.json({results: allGifs});
		}
	});
});

// Add User's Favorite Gifs
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

// Delete User's Favorite Gif
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

// Catch All Routes
app.get("*", function (req, res) {
	res.render("index");
});

app.listen(process.env.PORT || 3000, function() {
	console.log("server running");
});