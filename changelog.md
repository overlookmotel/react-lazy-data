# Changelog

## 0.1.2

Features:

* Caching

Refactor:

* `Resource` class constructor change order of args
* `isFunction` + `isObject` utils

Dependencies

* Update `@babel/runtime` dependency

Dev:

* Run tests on CI against latest React version
* Update dev dependencies

Tests:

* Tests for `use` returning same resource if called with same request
* Tests for auto-dispose when component calling `.use` is unmounted
* Tests for auto-dispose leaving 1st promise forever pending
* Tests for `.read` throws same promise if called multiple times
* `withResources` more tests
* Simplify tests using `act`
* All `.use` tests share same `beforeEach` set-up [refactor]
* Code style [refactor]

No code:

* Code comments

Docs:

* README update

## 0.1.1

Docs:

* README update

## 0.1.0

* Initial release
