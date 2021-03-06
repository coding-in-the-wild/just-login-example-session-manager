var test = require('tap').test
var Jlesm = require('./')
var level = require('level-mem')

function noop() {}

function createFakeCore(t) {
	return { //sid gets bound
		isAuthenticated: function(sId, sessionId) {
			t.equal(sId, sessionId, "session ID is correct")
		},
		beginAuthentication: function(sId, sessionId, addr) {
			t.equal(sId, sessionId, "session ID matches")
			t.equal(typeof addr, "string", "the contact address is a string :)")
		},
		unauthenticate: function(sId, sessionId) {
			t.equal(sId, sessionId, "session ID is correct")
		}
	}
}

test('test for new session', function(t) {
	t.plan(6)
	var database = level('hello this is a test')
	var sessionId = "the session"
	var fakeCore = createFakeCore(t, sessionId)
	var jlesm = new Jlesm(fakeCore, database)

	jlesm.createSession(function(err, api, sid) {
		t.notOk(err, (err && err.message) || 'no error')
		t.ok(api, 'api came back')
		if (api) {
			api.isAuthenticated(sid)
			api.beginAuthentication(sid, "I am a string")
			api.unauthenticate(sid)
		}
		t.end()
	})
})

test('test for continued sesssion giving error on bad session', function(t) {
	t.plan(2)
	var database = level('hello this is a test')
	var fakeCore = createFakeCore(t)
	var jlesm = new Jlesm(fakeCore, database)

	jlesm.continueSession("this is not correct", function(err, api, sid) {
		t.equal((err && err.message), 'Invalid Session Id', 'correct error')
		t.notOk(api)
		t.end()
	})
})

test('test for continued sesssion', function(t) {
	t.plan(6)
	var database = level('hello this is a test')
	var sessionId = "the session"
	database.put(sessionId, true)
	var fakeCore = createFakeCore(t, sessionId)
	var jlesm = new Jlesm(fakeCore, database)

	jlesm.continueSession(sessionId, function(err, api, sid) {
		t.notOk(err, (err && err.message) || 'no error')
		t.ok(api, 'api came back')
		if (api) {
			api.isAuthenticated(sid)
			api.beginAuthentication(sid, "I am a string")
			api.unauthenticate(sid)
		}
		t.end()
	})
})

test('session expiration', function(t) {
	t.plan(4)
	var database = level('hello this is a test')
	var sessionId = "the session"
	var opts = {
		timeoutMs: 100,
		checkIntervalMs: 10
	}
	var fakeCore = {
		isAuthenticated: noop,
		beginAuthentication: noop,
		unauthenticate: noop
	}
	var jlesm = new Jlesm(fakeCore, database, opts)

	jlesm.createSession(function (err, api, sid1) {
		t.notOk(err, (err && err.message) || 'successful session creation')
		setTimeout(function () {
			jlesm.continueSession(sid1, function (err, api, sid2) {
				t.notOk(err, (err && err.message) || 'successful session continuation')
				setTimeout(function () {
					jlesm.continueSession(sid1, function (err, api, sid3) {
						t.ok(err, 'unsuccessful session continuation...')
						t.equal((err && err.message), 'Invalid Session Id', '... due to the non-existent session id (it expired)')
						t.end()
					})
				}, 120)
			})
		}, 80)
	})
})
