var mongoose = require('mongoose');
	Schema = mongoose.Schema;

var GifSchema = new Schema( {
	keyword: String,
	url: String,
	imported: Date
});

var Gif = mongoose.model('Gif', GifSchema);
module.exports = Gif;