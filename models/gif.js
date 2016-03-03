var mongoose = require('mongoose');
	Schema = mongoose.Schema;

var GifSchema = new Schema( {
	keyword: String,
	url: String,
	imported: String,
	height: Number,
	owner: {
		type: Schema.Types.ObjectId,
		ref: "User"
	}
});

var Gif = mongoose.model('Gif', GifSchema);
module.exports = Gif;