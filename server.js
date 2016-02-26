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

app.get("*", function (req, res) {
	res.render("index");
});

app.listen(3000, function() {
	console.log("server running");
});