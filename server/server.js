const port = process.env.PORT || 80;
const app = require('express')();
const appIO = require('http').createServer(app);
const io = require('socket.io')(server);
appIO.listen(port);




const request = require('request');



function handler (req, res) {

}

const channels = {
	"General": {
		auth: 0,
		premium: false,
		readonly: false
	},
	"Help/support": {
		auth: 0,
		premium: false,
		readonly: false
	},
	"Vip": {
		auth: 0,
		premium: true,
		readonly: false
	},
	"Staff": {
		auth: 1,
		premium: false,
		readonly: false
	},
	"Admin": {
		auth: 4,
		premium: false,
		readonly: false
	},
	"Misbehaviour": {
		auth: 1,
		premium: false,
		readonly: true
	},
	"Audit Logs": {
		auth: 1,
		premium: false,
		readonly: true
	},
}

const sockets = {};


const messages = {}
const channel = io;

channel
	.on("connect", async socket => {
		// request client login token
		let channelName = Object.entries(channels)[0][0];
		socket.on("switchChannel", channel => {
			Object.entries(channels)
				.forEach((v, i) => {
					socket.leave(v[0]);
				});

			if (channels[channel]) {
				channelName = channel;
				socket.join(channel);
				socket.emit("messages", getMessages(100, channel));
			}

			
		});
		socket.emit("login", true);

		// verify user and get user info

		const user = await new Promise((resolve, reject) => {
			socket.emit("status", {
				show: true,
				message: "Validating account information."
			});
			socket.on("login", async d => {
				resolve(await getUserInfo(d.id, d.token));
			});
		});

		// is user forged or valid? Is user not logged in?

		if ((await user)) {
			user["description"], user["friends"], user["anime_tracked"], user["comments"], user["comments"], user["anime_tracked"], user["watched"] = "irrelevant";

			socket.emit("status", {
				show: false,
				message: `Account verified. Welcome back, ${user.username}`
			});

			

			socket.emit("authorized", {
				id: user.id,
				auth: user.authentication_level

			});


			console.log(">>> " + user.username + " has connected.");
			
			sockets[socket.id] = user;

			

			socket.on("message", message => {
				console.log(user.authentication_level, channels[channelName].auth, user.authentication_level >= channels[channelName].auth)

				if (!user.banned
					&& !user.tempBanned
					&& !user.muted
					&& message.text
					&& message.text.length <= 2000
					&& message.hasOwnProperty("channel")
					&& channels.hasOwnProperty(message.channel)
					&& channels[message.channel].readonly === false
					&& user.authentication_level >= channels[channelName].auth
					&& channels[channelName].premium ? user.premium : true)
				{
					if (user.authentication_level >= channels[channelName].auth) {
						createMessage(user, channelName || "General", message);
					}
					
				}
			});
			
			



		}
		else {
			unAuth(socket, user);
		}

		
	});




function getMessages(n, channelName) {
	if (messages[channelName])
		return messages[channelName].slice(-(n > 100 ? 100 : n));
	return [];
}


function createMessage(user, channelName, message) {
	const serializedMessage = serializeMessage(user, message.text);
	const newMessage = {
		author: user,
		channel: channelName,
		message: serializedMessage,
		id: Date.now()
	}
	console.log(`<${user.username}>: ${serializedMessage}`);

	if (typeof messages[channelName] !== "object")
		messages[channelName] = [];
	messages[channelName].push(newMessage);


	io.in(channelName).emit("message", newMessage);
}

const allowedTags = [
	{
		tag: "||",
		html: "spoiler"
	}
]

function serializeMessage(user, text) {
	if (user) {
		if (user.authentication_level >= 4) {

		}
		else {
			text = text
				.replace(/\</gi, "&lt;")
				.replace(/\>/gi, "&gt;")
				.replace(/\\/gi, "&#92;");
		}
	}
	else {
		text = text
			.replace(/\</gi, "&lt;")
			.replace(/\>/gi, "&gt;")
			.replace(/\\/gi, "&#92;");
	}





	return text;
}








function unAuth(socket, user) {
	socket.emit("status", {
		show: true,
		message: "Failed to authenticate account information.",
		unauth: true
	});
	socket.emit("unauthorizedd", user.id);

	// USER INCORRECT DETAILS!!
}





function getUserInfo(user_id, token) {
	
	return new Promise((resolve, reject) => {
		request.post('https://animedelta.net/@/verify.php', {
			form: {
				loginToken: token,
				userId: user_id,
				code: "87y83hndn338nddnof84hj34o9fh98hfdhfhw43fh984fhj4hf4hfojchj"
			}
			}, (error, res, body) => {
				if (error) {
					console.error(error)
				return;
			}

			try {
				resolve(JSON.parse(body));
			} catch (e) {
				resolve(false);
			}
		});
	})
	
}







app.get("/", (req, res) => {

  res.render("../client/index.pug");

});


app.use(express.static('client'))


app.listen(port, () => console.log(`Example app listening on port ${port}!`))