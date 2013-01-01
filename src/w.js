(function() {
	'use strict';

	function identity(a) { return a; }

	function combineArgs(array, args) {
		for (var i = 0; i < args.length; ++i) {
			var arg = args[i];
			if (Array.isArray(arg)) {
				array = array.concat(arg);
			} else {
				array.push(arg);
			}
		}

		return array;
	}

	function combine(array, maybeArray) {
		if (Array.isArray(maybeArray)) {
			array = this._doneCbs.concat(maybeArray);
		} else if (maybeArray != null) {
			array.push(maybeArray);
		}

		return array;
	}

	function createPublicInterface(object) {
		var iface = {};
		for (var key in object) {
			var val = object[key];
			if (typeof val === 'function' && key[0] !== '_') {
				iface[key] = val.bind(object);
			}
		}

		return iface;
	}

	function Promise() {
		this._progressCbs = [];
		this._doneCbs = [];
		this._failCbs = [];

		this._doneFilter = identity;
		this._failFilter = identity;

		this._state = 'pending';
	}

	Promise.prototype = {
		then: function(doneBacks, failBacks, progressBacks) {
			this._doneCbs = combine(this._doneCbs, doneBacks);
			this._failCbs = combine(this._failCbs, failBacks);
			this._progressCbs = combine(this._progressCbs, progressBacks);
		},

		done: function() {
			if (this._state === 'resolved') {
				this._callLateArrivals(arguments);
			} else if (this._state === 'pending') {
				this._doneCbs = combineArgs(this._doneCbs, arguments);
			}
		},

		fail: function() {
			if (this._state === 'rejected') {
				this._callLateArrivals(arguments);
			} else if (this._state === 'pending') {
				this._failCbs = combineArgs(this._failCbs, arguments);
			}
		},

		always: function() {
			this.done.apply(this, arguments);
			this.fail.apply(this, arguments);
		},

		progress: function() {
			if (this._state === 'pending') {
				this._progressCbs = combineArgs(this._progressCbs, arguments);
			}
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

	function LinkedList() {
		this._head = null;
		this._tail = null;
		this._size = 0;
	}

	LinkedList.prototype = {
		pushBack: function(value) {
			++this._size;
			var node = {
				value: value,
				next: null,
				prev: null
			};
			if (this._head == null) {
				this._head = this._tail = node;
			} else {
				this._tail.next = node;
				node.prev = this._tail;
				this._tail = node;
			}

			return node;
		},

		popBack: function() {
			--this._size;
			var node = this._tail;
			this._tail = this._tail.prev;
			if (this._tail != null)
				this._tail.next = null;
			return node;
		},

		popFront: function() {
			--this._size;
			var node = this._head;
			this._head = this._head.next;
			this._head.prev = null;
			return node;
		},

		pushFront: function(value) {
			++this._size;
			var node = {
				value: value,
				next: null,
				prev: null
			};
			if (this._head == null) {
				this._head = this._tail = node;
			} else {
				this._head.prev = node;
				node.next = this._head;
				this._head = node;
			}

			return node;
		},

		removeWithNode: function(node) {
			if (node == null) throw 'Null node';

			--this._size;

			var prevNode = node.prev;
			var nextNode = node.next;
			if (prevNode != null) {
				prevNode.next = node.next;
			}

			if (nextNode != null) {
				nextNode.prev = node.prev;
			}

			node.next = node.prev = null;
		},

		add: function(value) {
			return this.pushFront(value);
		},

		remove: function() {
			return this.popBack();
		},

		forEach: function(func, ctx) {
			var crsr = this._head;
			while (crsr != null) {
				func.call(ctx, crsr.value);
				crsr = crsr.next;
			}
		},

		clear: function() {
			this._head = this._tail = null;
			this._size = 0;
		},

		size: function() { return this._size; }
	};


	function Queue(maxSize) {
		this._maxSize = (maxSize == null) ? -1 : maxSize;
		this._list = new LinkedList();
	}

	Queue.prototype = {
		add: function(value) {
			this._list.pushFront(value);
		},

		remove: function() {
			return this._list.popBack();
		},

		clear: function() {
			this._list.clear();
		},

		full: function() {
			if (this._maxSize < 0) return false;

			return this._list.size() >= this._maxSize;
		},

		size: function() { return this._list.size(); }
	};

	var workerFactory = {
		_cfg: {
			baseUrl: '.'
		},

		config: function(cfg) {
			for (var p in cfg) {
				if (cfg.hasOwnProperty(p))
					this._cfg[p] = cfg[p];
			}
		},

		newFixedWorkerPool: function(numWorkers, queueCap) {
			var queue = new Queue(queueCap);
			return new FixedWorkerPool(queue, numWorkers);
		},

		newCachedWorkerPool: function() {

		},

		newScheduledWorkerPool: function() {

		},

		newWorker: function() {
			// Make a worker whose postMessage methods return promises?
			// it is the user's worker...
			// so we'll need to modify onMessage somehow so it returns
			// something that can set the state of the promise.

			// Maybe instead of overriding postMessage provide a new method:
			// promiseMessage since promises are going to have to be cached
			// and looked up by some id.  So if the other side never fulfills
			// the promise it'll leak.

			// Allow promiseMessage(msg, timeout)?
			// to expire the promises?
		}
	};

	function normalizeArgs(args, context, func, id) {
		if (typeof args === 'function') {
			func = args;
			id = context;
			context = null;
			args = null;
		} else if (!Array.isArray(args) && typeof args === 'object') {
			id = func;
			func = context;
			context = args;
			args = null;
		} else if (Array.isArray(args) && typeof context === 'function') {
			id = func;
			func = context;
			context = null;
		}

		return {
			args: args,
			context: context,
			func: func,
			id: id
		};
	}

	function WorkerWrapper(worker) {
		this.worker = worker;
	}

	WorkerWrapper.prototype = {
		postMessage: function(m) {
			this.worker.postMessage(m);
		},

		onMessage: function(handler) {
			// TODO: addEventListener
			this.worker.onmessage = handler;
		},

		terminate: function() {
			this.worker.terminate();
		},

		_workCompleted: function(data) {
			var state;
			if (data.type === 'failed') {
				state = 'rejected';
			} else {
				state = 'resolved';
			}

			this.currentTask._setState(state, data.result);
		},

		_progressMade: function(data) {
			this.currentTask._progressMade(data);
		}
	};

	function TaskWrapper(task) {
		this.task = task;
		this._promise = new Promise();
		this._publicPromise = createPublicInterface(this._promise);
	}

	TaskWrapper.prototype = {
		promise: function() {
			return this._publicPromise;
		},

		_setState: function(state, result) {
			this._promise._setState(state, result);
		},

		_progressMade: function(data) {
			this._promise._progressMade(data);
		}
	}

	function AbstractWorkerPool(taskQueue, minWorkers, maxWorkers) {
		this._queue = taskQueue;
		this._minWorkers = minWorkers;
		this._maxWorkers = maxWorkers;
		this._runningWorkers = new LinkedList();
		this._idleWorkers = new LinkedList();

		this._receiveWorkerMessage = this._receiveWorkerMessage.bind(this);

		for (var i = 0; i < minWorkers; ++i) {
			var worker = this._createWorker();
			this._idleWorkers.add(worker);
		}
	}

	AbstractWorkerPool.prototype = {
		submit: function(args, context, func, id) {
			var normalizedArgs = normalizeArgs(args, context, func, id);
			var wrappedTask = new TaskWrapper(normalizedArgs);

			if (this._idleWorkers.size() > 0) {
				var worker = this._idleWorkers.remove().value;
				this._dispatchToWorker(worker, wrappedTask);
			} else if (this._runningWorkers.size() < this._maxWorkers) {
				var worker = this._createWorker();
				this._dispatchToWorker(worker, wrappedTask);
			} else {
				if (this._queue.full()) {
					throw 'Task queue has reached its limit';
				}

				this._queue.add(wrappedTask);
			}

			return wrappedTask.promise();
		},

		numWorkers: function() {
			return this._idleWorkers.size() + this._runningWorkers.size();
		},

		queueSize: function() {
			return this._queue.size();
		},

		_dispatchToWorker: function(worker, wrappedTask) {
			// TODO: check function cache
			wrappedTask.task.func = wrappedTask.task.func.toString();

			worker.runningNode = this._runningWorkers.add(worker);
			worker.currentTask = wrappedTask;
			worker.postMessage(wrappedTask.task);
		},

		_createWorker: function() {
			var worker = new WorkerWrapper(this._createActualWorker());
			var self = this;
			worker.onMessage(function(e) {
				self._receiveWorkerMessage(worker, e);
			});

			return worker;
		},

		terminate: function() {
			this._queue.clear();
			this._runningWorkers.forEach(function(worker) {
				worker.terminate();
			}, this);

			this._idleWorkers.forEach(function(worker) {
				worker.terminate();
			}, this);
		},

		_receiveWorkerMessage: function(worker, e) {
			switch (e.data.type) {
				case 'completed':
				case 'failed':
					try {
						worker._workCompleted(e.data);
					} catch (e) {
						console.log(e);
					}

					if (this._queue.size() > 0) {
						this._dispatchToWorker(worker, this._queue.remove().value);
					} else {
						this._runningWorkers.removeWithNode(worker.runningNode);
						worker.runningNode = null;
						this._idleWorkers.add(worker);
					}
				break;
				case 'progress':
					worker._progressMade(e.data.data);
				break;
			}
		}
	};

	function FixedWorkerPool(taskQueue, numWorkers) {
		AbstractWorkerPool.call(this, taskQueue, numWorkers, numWorkers);
	};

	var proto = FixedWorkerPool.prototype = Object.create(AbstractWorkerPool.prototype);
	proto._createActualWorker = function() {
		return new Worker(workerFactory._cfg.baseUrl + '/worker.js');
	};
	

	function CachedWorkerPool() {
		AbstractWorkerPool.apply(this, arguments);
	};

	proto = CachedWorkerPool.prototype = Object.create(AbstractWorkerPool.prototype);
	proto._createActualWorker = function() {
		return new Worker(workerFactory._cfg.baseUrl + '/scheduledWorker.js');
	};


	window.Workers = workerFactory;

	if (typeof define !== 'undefined') {
		define(function() {
			return workerFactory;
		});
	}
})();