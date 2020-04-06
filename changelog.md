# Changelog

## 0.2.1

Docs:

* README update

## 0.2.0

Features:

* Server-side rendering

Refactor:

* Split long lines

Dev:

* Update dev dependencies
* Define `__DEV__` in tests [fix]

## 0.1.5

Bug fixes:

* ESM export production/dev build depending on `NODE_ENV`

Dependencies:

* Update `is-class-component` dependency

Dev:

* Update dev dependencies
* Remove `npm-debug.log` from `.gitignore`
* Tab width 2 in `.editorconfig`
* Jest config code comment [nocode]

Docs:

* README examples tweak

## 0.1.4

Features:

* ESM export for Node.js

Refactor:

* Replace utils with `is-it-type` + `is-class-component` packages

Deps:

* Update `@babel/runtime` dependency

Dev:

* Update dev dependencies
* Run tests on ESM build
* Add React 16.13.0 to CI matrix

## 0.1.3

Docs:

* README fix mistakes in code examples

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
