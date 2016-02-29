var express = require("express"),
		app = express(),
		bodyParser = require("body-parser"),
		mongoose = require('mongoose');

app.use(bodyParser.urlencoded({extended: true}));
// To allow body-parser to send and receive JSON data
app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'hbs');

// please change the app name
mongoose.connect('mongodb://localhost/fun_gif');

var Gif = require('./models/gif');

// Set Up API

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

app.listen(3000, function() {
	console.log("server running");
});