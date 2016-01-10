/**
 * OpenShare generates a single share link
 */
module.exports = class Count {

	constructor(type, url) {

		// throw error if no url provided
		if (!url) {
			throw new Error(`Open Share: no url provided for count`);
		}

		// if type is comma separate list create array
		if (type.includes(',')) {
			type = type.split(',');
			this.countData = [];

			// check each type supplied is valid
			type.forEach((t) => {
				if (!this[t]) {
					throw new Error(`Open Share: ${type} is an invalid count type`);
				}

				this.countData.push(this[t](url));
			});

		// throw error if invalid type provided
		} else if (!this[type]) {
			throw new Error(`Open Share: ${type} is an invalid count type`);

		// single count
		// store count URL and transform function
		} else {
			this.type = type;
			this.countData = this[type](url);
		}
	}

	// handle calling getCount / getCounts
	// depending on number of types
	count(os) {
		if (!Array.isArray(this.countData)) {
			this.getCount(os);
		} else {
			this.getCounts(os);
		}
	}

	// fetch count either AJAX or JSONP
	getCount(os) {
		var count = this.storeGet(this.type);

		if (count) {
			os.innerHTML = count;
		}

		this[this.countData.type](os);
	}

	// fetch multiple counts and aggregate
	getCounts(os) {
		console.log('Aggregate multiple counts now');

		let total = 0;

		this.countData.forEach((countData) => {
			var count = this.storeGet(this.type);

			if (count) {
				total += count;
			} else {
				this[this.countData.type]((num) => {
					total += num;
				});
			}
		});

		os.innerHTML = total;
	}

	// handle JSONP requests
	jsonp(os) {
		// define random callback and assign transform function
		let callback = `jsonp_${Math.random().toString().substr(-10)}`;
		window[callback] = (data) => {
			let count = this.countData.transform(data);
			os.innerHTML = count;
		};

		// append JSONP script tag to page
		let script = document.createElement('script');
		script.src = this.countData.url.replace('callback=?', `callback=${callback}`);
		document.getElementsByTagName('head')[0].appendChild(script);

		return;
	}

	// handle AJAX GET request
	get(os) {
		let xhr = new XMLHttpRequest();

		// on success pass response to transform function
		xhr.onreadystatechange = () => {
			if (xhr.readyState !== XMLHttpRequest.DONE ||
				xhr.status !== 200) {
				return;
			}

			let count = this.countData.transform(xhr);

			if (count) {
				os.innerHTML = count;
			}
		};

		xhr.open('GET', this.countData.url);
		xhr.send();
	}

	// handle AJAX POST request
	post(os) {
		let xhr = new XMLHttpRequest();

		// on success pass response to transform function
		xhr.onreadystatechange = () => {
			if (xhr.readyState !== XMLHttpRequest.DONE ||
				xhr.status !== 200) {
				return;
			}

			let count = this.countData.transform(xhr);

			if (count) {
				os.innerHTML = count;
			}
		};

		xhr.open('POST', this.countData.url);
		xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
		xhr.send(JSON.stringify(this.countData.data));
	}

	storeSet(type, count = 0) {
		if (!window.localStorage || !type) {
			return;
		}

		localStorage.setItem(`OpenShare-${type}`, count);
	}

	storeGet(type) {
		if (!window.localStorage || !type) {
			return;
		}

		return localStorage.getItem(`OpenShare-${type}`);
	}

	// facebook count data
	facebook(url) {
		return {
			type: 'get',
			url: `http://graph.facebook.com/?id=${url}`,
			transform: (xhr) => {
				let count = JSON.parse(xhr.responseText).shares;
				this.storeSet(this.type, count);
				return count;
			}
		};
	}

	// pinterest count data
	pinterest(url) {
		return {
			type: 'jsonp',
			url: `http://api.pinterest.com/v1/urls/count.json?callback=?&url=${url}`,
			transform: (data) => {
				let count = data.count;
				this.storeSet(this.type, count);
				return count;
			}
		};
	}

	// linkedin count data
	linkedin(url) {
		return {
			type: 'jsonp',
			url: `http://www.linkedin.com/countserv/count/share?url=${url}&format=jsonp&callback=?`,
			transform: (data) => {
				let count = data.count;
				this.storeSet(this.type, count);
				return count;
			}
		};
	}

	// reddit count data
	reddit(url) {
		return {
			type: 'get',
			url: `https://www.reddit.com/api/info.json?url=${url}`,
			transform: (xhr) => {
				let posts = JSON.parse(xhr.responseText).data.children,
					ups = 0;

				posts.forEach((post) => {
					ups += Number(post.data.ups);
				});

				this.storeSet(this.type, ups);

				return ups;
			}
		};
	}

	// linkedin count data
	google(url) {
		return {
			type: 'post',
			data: {
				method: 'pos.plusones.get',
				id: 'p',
				params: {
					nolog: true,
					id: url,
					source: 'widget',
					userId: '@viewer',
					groupId: '@self'
				},
				jsonrpc: '2.0',
				key: 'p',
				apiVersion: 'v1'
			},
			url: `https://clients6.google.com/rpc`,
			transform: (xhr) => {
				let count = JSON.parse(xhr.responseText).result.metadata.globalCounts.count;
				this.storeSet(this.type, count);
				return count;
			}
		};
	}

};
