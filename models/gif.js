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
	},
	voters: [{ type: Schema.Types.ObjectId, ref: 'Like' }],
	currentUserLike: Boolean
});

var Gif = mongoose.model('Gif', GifSchema);
module.exports = Gif;