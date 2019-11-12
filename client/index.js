
window.docLoaded = new Promise((resolve, reject) => {
	document.addEventListener("DOMContentLoaded", e => {
		resolve();
	});
});


(async $ => {
	
	window.getCookie = (name) => {
	    function escape(s) { return s.replace(/([.*+?\^${}()|\[\]\/\\])/g, '\\$1'); };
	    var match = document.cookie.match(RegExp('(?:^|;\\s*)' + escape(name) + '=([^;]*)'));
	    return match ? match[1] : null;
	}



	(await window.docLoaded);

	const f = {
		user: Promise,
		messages: {},
		area: document
			.querySelector(".ui .textarea"),
		room: document
			.querySelector(".room-content"),
		channel: "General",
		authLevel: 0,
		channels: {
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
		},
		switchChannel: channel => {
			f.fixArea(channel);
			f.messages = {};
			f.clearRoom();
			f.socket.emit("switchChannel", channel);


			f.channel = channel;
			if (document
				.querySelector(`.active-menu-item`))
				document
					.querySelector(`.active-menu-item`)
				.classList
				.remove("active-menu-item");
			document
				.querySelector(`.chat-menu-item[xid='${f.slug(f.channel)}']`)
				.classList
				.add("active-menu-item")

			document
				.body
				.classList
				.remove("channels-menu-open")
		},
		sendMessage: e => {
			e.preventDefault();

			const val = f.area.innerHTML
				.replace(/\<br\>|\<br\\\>/gi, "%BR_OBJECT%");
			const token = getCookie("token");
			const id = getCookie("user_id");

			if (f.auth === false) {
				window.location.href = "https://animedelta.net/@/login/?red=" + encodeURI(window.location.href);
				retunr;
			}
			if (f.auth === undefined) {
				setStatus({
					show: true,
					message: "Please wait until we've verified your account."
				});
				return;
			}

			if (val.length > 2000) {
				setStatus({
					show: true,
					message: "You cannot send more than 2000 characters."
				});
 
				return;
			}
			val && f.socket &&
			f.socket.emit("message", {
				channel: f.channel,
				text: val
			}) && (f.area.innerHTML = "");
		},
		socket: io(`wss://chat.animedelta.net`), //`ws://localhost:80/`
		input: e => {
			const which = e.which || e.keyCode;
			const shift = e.shiftKey || e.shift
			// is enter and not shift enter ? 

			if (which === 13 && !shift) {
				f.sendMessage(e);
			}

			// is enter and shift
			else if (which === 13 && shift) {

			}
		},
		slug: t => {
			return encodeURI(t);
		},
		deSlug: t => {
			return decodeURI(t);
		},
		clearRoom: () => {
			f
				.room
				.innerHTML = "";
		},
		receiveBulkMessages: messages => {
			f.clearRoom();
			displayMessage(messages);
			f.toBottom();
		},
		addChannels: channels => {
			Object.keys(channels)
				.forEach((v, i) => {
					if (f.authLevel >= channels[v].auth && !document.querySelector(`.chat-menu-item[xid='${f.slug(v)}']`))
						document
							.querySelector(".chat-menu-inner")
							.insertAdjacentHTML("beforeend", `
								<div style="--it: ${i * 5};--base: 43;" xid="${f.slug(v)}" class="chat-menu-item">
									${v}
								</div>
								`)
				});
		},
		fixArea: channel => {
			const channelMeta = f.channels[channel];
			if (!channelMeta)
				return;
			if (channelMeta.readonly) {
				f.area.setAttribute("disabled", true);
				f.area.setAttribute("placeholder", `${channel} is read only`);
			} else {
				f.area.removeAttribute("disabled");
				f.area.setAttribute("placeholder", `Message in #${channel}`);
			}

		},
		toBottom: () => {
			f.room.scrollTop = f.room.getBoundingClientRect().height + 100
		}
	}
	f.area.focus();
	f.addChannels(f.channels);
	
	connectChannel(f.channel);

	window.addEventListener("click", e => {
		if (e.target.classList.contains("chat-menu-item")) {
			const id = e.target.getAttribute("xid");
			f.switchChannel(f.deSlug(id));
		}
	});




	async function connectChannel(channel) {


		const token = getCookie("token");
		const id = getCookie("user_id");

		const gateway = new Promise((resolve, reject) => {
			f.socket.on("connect", socket => {
				f.switchChannel(f.channel);
				resolve(true);
			});
		});


		f.socket.on("login", d => {
			const token = getCookie("token");
			const id = getCookie("user_id");
			f.socket.emit("login", {
				id: id,
				token: token
			});
		});

		f.socket.on("messages", messages => {
			f.receiveBulkMessages(messages);
			//f.switchChannel(f.channel);
		});


		f.socket.on("status", status => {
			setStatus(status);
		});

		f.socket.on("unauthorizedd", id => {
			f.auth = false;
		});

		f.socket.on("authorized", user => {
			f.auth = true;
			f.authLevel = user.auth;
			f.user.resolve(user);
			f.addChannels(f.channels);
		});

		f.socket.on("message", message => {
			displayMessage([message]);
			f.toBottom();
		});
	}

	// hook message 

	const form = document
		.querySelector(".ui");

	form
		.addEventListener("submit", f.sendMessage);

	form
		.addEventListener("keydown", f.input);


	// status

	function setStatus(status) {
		document
			.body
			.classList[(status.show?"add":"add")]("status-show");

		document
			.querySelector(".status .text")
			.innerText = status.message;

		window.statusTimer = setTimeout(() => {
			document
			.body
			.classList.remove("status-show");
		}, 3000);
	}

	function displayMessage(messages) {
	messages.forEach((message, i) => {
		!f.messages[message.channel] &&
		(f.messages[message.channel] = []);

		console.log(message);

		const prev = f.messages
			[message.channel]
			.slice(0)
			.shift();

		const isBlock = prev ? prev.author.id !== message.author.id : true;
		const gMessage = genMessage(message, isBlock);

		f.messages[message.channel].unshift(message);

		if (isBlock)
			f.room.insertAdjacentHTML("beforeend", gMessage);
		else
			f
				.room
				.querySelector(`.block[author='${prev.author.id}']:last-child .messages`)
				.insertAdjacentHTML("beforeend", gMessage);

	});


	window.genContext = (origin, user, admin) => {
		const id = Date.now();
		return {html: `
			<div class="context-menu" xid="${id}" tabindex="-1">
				<div class="context-menu-inner">
					<div class="context-menu-item">Copy text</div>
					<div class="context-menu-item">Report user</div>
					<div class="context-menu-item">Copy user id</div>
					<div class="context-menu-item">Ban user</div>
					<div class="context-menu-item">Mute user</div>
				</div>
			</div>
		`,
		id: id,
		origin: origin,
		user: user,
		admin: admin};
	}



	
	window.messageContext = async e => {
		const user = e.target.closest(".block").getAttribute("author");

		const admin = await f.user;

		const ctx = genContext(e.target, user, admin);

		displayCtx(ctx);
	}
	window.displayCtx = (ctx) => {
		const prev = document.querySelector(".context-menu");

		prev && (prev.outerHTML = "");

		document.body.insertAdjacentHTML("beforeend", ctx.html);

		const added = document.querySelector(`.context-menu[xid='${ctx.id}']`);

		added.focus();

		const pos = ctx.origin.getBoundingClientRect();

		const dim = added.getBoundingClientRect();

		added.style.top = `${window.innerHeight - pos.top - dim.height <= dim.height ? window.innerHeight - dim.height : pos.top + dim.height}px`

		added.style.left = pos.left - 5 - dim.width + "px";
	
		added.addEventListener("blur", e => {
			e.target.outerHTML = "";
		});
	}


}
document.querySelector(".channel-menu-btn")
		.addEventListener("click", e => {
			document.body.classList.toggle("channels-menu-open");
			
		});
})(jQuery);








var md = markdownit("default", {
	  linkify: true,
	  breaks: true
});

function genMessage(message, isBlock) {

	let text = message.message
		

	while (text.match(/%BR_OBJECT%$/)) {
		text = text.substr(0, text.length - "%BR_OBJECT%".length);
	}

	text = md
		.render(text)
		.replace(new RegExp("%BR_OBJECT%", "g"), "<br>")
		

	const smsg = `<div class="message-wrapper"><div time="${message.id}" author="${message.author.id}" class="message-text">${text}</div><div class="message-context" onclick="messageContext(event)"><i class="fas fa-ellipsis-v"></i></div></div>`;
	const block = `
		<div class="block" time="${message.id}" author="${message.author.id}">
			<div class="pfp-column">
				<div class="pfp" style="background-image: url('${message.author.pfp || `https://animedelta.net/no-pfp/logo${message.author.id.toString().substr(-1)}.png?hi=Yumi`}')"></div>
			</div>
			<div class="block-meta">
				<div class="block-title">
					<span>${message.author.username}</span>
				</div>
				<div class="messages">
					<div class="message">
						${smsg}
					</div>
				</div>
			</div>
		</div>
	`;

	const msg = smsg;

	return isBlock ? block : msg;
}
