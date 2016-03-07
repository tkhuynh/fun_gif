var mongoose = require('mongoose');
	Schema = mongoose.Schema;

var LikeSchema = new Schema( {
	gif_id: String,
	voter_id: String
});

var Like = mongoose.model('Like', LikeSchema);
module.exports = Like;