var Promise = (function() {
	function Promise(interruptListener) {
		this._progressCbs = [];
		this._doneCbs = [];
		this._failCbs = [];
		this._interruptCbs = [];

		if (interruptListener)
			this._interruptCbs.push(interruptListener);

		this._doneFilter = identity;
		this._failFilter = identity;

		this._state = 'pending';
	}

	Promise.prototype = {
		then: function(doneBacks, failBacks, progressBacks) {
			this._doneCbs = combine(this._doneCbs, doneBacks);
			this._failCbs = combine(this._failCbs, failBacks);
			this._progressCbs = combine(this._progressCbs, progressBacks);

			return this;
		},

		done: function() {
			if (this._state === 'resolved') {
				this._callLateArrivals(arguments);
			} else if (this._state === 'pending') {
				this._doneCbs = combineArgs(this._doneCbs, arguments);
			}

			return this;
		},

		fail: function() {
			if (this._state === 'rejected') {
				this._callLateArrivals(arguments);
			} else if (this._state === 'pending') {
				this._failCbs = combineArgs(this._failCbs, arguments);
			}

			return this;
		},

		always: function() {
			this.done.apply(this, arguments);
			this.fail.apply(this, arguments);

			return this;
		},

		progress: function() {
			if (this._state === 'pending') {
				this._progressCbs = combineArgs(this._progressCbs, arguments);
			}

			return this;
		},

		pipe: function(doneFilter, failFilter) {
			this._doneFilter = doneFilter || identity;
			this._failFilter = failFilter || identity;

			switch (this._state) {
				case 'rejected':
					this._result = this._failFilter(this._result);
				break;
				case 'resolved':
					this._result = this._doneFilter(this._result);
				break;
			}

			return this;
		},

		interrupt: function(cb) {
			if (!cb) {
				this._interruptCbs.forEach(function(cb) {
					try {
						cb();
					} catch (e) {
						console.log(e);
						console.log(e.stack);
					}
				});
			} else {
				this._interruptCbs = combineArgs(this._interruptCbs, arguments);
			}

			return this;
		},

		state: function() {
			return this._state;
		},

		_callLateArrivals: function(args) {
			for (var i = 0; i < args.length; ++i) {
				var arg = args[i];
				if (Array.isArray(arg)) {
					arg.forEach(function(f) {
						f(this._result);
					}, this)
				} else {
					arg(this._result);
				}
			}
		},

		_setState: function(state, result) {
			if (this._state !== 'pending')
				throw 'Illegal state transition';

			this._state = state;
			switch (state) {
				case 'rejected':
					this._result = this._failFilter(result);
					this._callFailbacks();
				break;
				case 'resolved':
					this._result = this._doneFilter(result);
					this._callDonebacks();
				break;
				default:
					throw 'Illegal state transition';
			}

			this._failCbs = [];
			this._doneCbs = [];
			this._failFilter = this._doneFilter = identity;
		},

		_callFailbacks: function() {
			this._failCbs.forEach(function(fcb) {
				try {
					fcb(this._result);
				} catch (e) {
					console.log(e);
				}
			}, this);
		},

		_callDonebacks: function() {
			this._doneCbs.forEach(function(dcb) {
				try {
					dcb(this._result);
				} catch (e) {
					console.log(e);
				}
			}, this);
		},

		_progressMade: function(data) {
			this._progressCbs.forEach(function(pcb) {
				try {
					pcb(data);
				} catch (e) {
					console.log(e);
				}
			}, this);
		}
	};

	return Promise;
})();