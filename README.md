[![NPM version](https://img.shields.io/npm/v/react-lazy-data.svg)](https://www.npmjs.com/package/react-lazy-data)
[![Build Status](https://img.shields.io/travis/overlookmotel/react-lazy-data/master.svg)](http://travis-ci.org/overlookmotel/react-lazy-data)
[![Dependency Status](https://img.shields.io/david/overlookmotel/react-lazy-data.svg)](https://david-dm.org/overlookmotel/react-lazy-data)
[![Dev dependency Status](https://img.shields.io/david/dev/overlookmotel/react-lazy-data.svg)](https://david-dm.org/overlookmotel/react-lazy-data)
[![Greenkeeper badge](https://badges.greenkeeper.io/overlookmotel/react-lazy-data.svg)](https://greenkeeper.io/)
[![Coverage Status](https://img.shields.io/coveralls/overlookmotel/react-lazy-data/master.svg)](https://coveralls.io/r/overlookmotel/react-lazy-data)

# Lazy-load data with React Suspense

## What's it for?

React does not officially support using Suspense for data fetching. This package makes that possible.

NB Does **not** require experimental builds of React, or "concurrent mode". Tested and working on all versions of React 16.8.0+.

## Usage

There are two APIs:

1. [Event-based](#event-based-api)
2. [Hooks](#hooks-api)

### The moving parts

#### Resource Factory

A Resource Factory defines the method for fetching data.

You call the Factory's `.create()` or `.use()` method to initiate fetching data and create a Resource.

```js
import { createResourceFactory } from 'react-lazy-data';

// Create Resource Factory
const PokemonResource = createResourceFactory(
  id =>
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}/`)
      .then(res => res.json())
);
```

```js
// Create Resource
const pokemonResource = PokemonResource.create( 1 );
```

#### Resource

A Resource represents data being fetched. It can be pending, complete, or errored - much like a Promise.

Resources have a `.read()` method which a component can call to get the underlying data.

If the data is loaded, `.read()` returns the data. If the data is not ready yet, `.read()` throws a Promise which bails out of rendering the component and "suspends" the Suspense boundary above it. When the data is loaded, the Promise resolves which causes React to re-render the component. `.read()` will then return the data. If data-loading fails, `.read()` will throw the error that the fetch promise rejected with.

This may sound odd, but it's how Suspense works. `React.lazy()` works the same way - if the lazy component is not loaded yet, it throws a Promise which resolves when it is loaded.

So you can write a component that uses async data in a synchronous style:

```jsx
function Pokemon( { pokemonResource } ) {
  // Read the resource
  const pokemon = pokemonResource.read();

  // This will only run once the data is ready
  return <div>My name is {pokemon.name}.</div>;
}
```

### Event-based API

This is the approach [recommended by React](https://reactjs.org/blog/2019/11/06/building-great-user-experiences-with-concurrent-mode-and-suspense.html) - load data in event handlers.

```jsx
import { createResourceFactory } from 'react-lazy-data';

const PokemonResource = createResourceFactory(
  id =>
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}/`)
      .then(res => res.json())
);

function App() {
  const [id, setId] = useState( 1 );

  const resourceRef = useRef();
  const resource = resourceRef.current || createResource( id );

  function createResource( id ) {
    const resource = PokemonResource.create( id );
    resourceRef.current = resource;
    return resource;
  }

  const next = useCallback( () => {
    const previousResource = resourceRef.current;
    if ( previousResource ) previousResource.dispose();

    setId( id => {
      const newId = id + 1;
      createResource( newId );
      return newId;
    } );
  }, [] );

  return (
    <div>
      <Suspense fallback={ <div>Loading...</div> }>
        <Pokemon resource={ resource } />
      </Suspense>
      <button onClick={ next }>Next Pokemon!</button>
    </div>
  );
}

function Pokemon( { resource } ) {
  const pokemon = resource.read();
  return <div>My name is {pokemon.name}.</div>;
}
```

As you can see, it's not very ergonomic. You have to manually take care of disposing of the old resource when you're done with it, in the event handler.

### Hooks API

(requires React 16.8.0+)

```jsx
import { createResourceFactory } from 'react-lazy-data';

const PokemonResource = createResourceFactory(
  id =>
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}/`)
      .then(res => res.json())
);

function App() {
  const [id, setId] = useState( 1 );
  const resource = PokemonResource.use( id );

  return (
    <div>
      <Suspense fallback={ <div>Loading...</div> }>
        <Pokemon resource={ resource } />
      </Suspense>
      <button onClick={ setId( id => id + 1 ) }>Next Pokemon!</button>
    </div>
  );
}

function Pokemon( { resource } ) {
  const pokemon = resource.read();
  return <div>My name is {pokemon.name}.</div>;
}
```

`.use()` is a [React hook](https://reactjs.org/docs/hooks-intro.html).

The hooks-based API takes care of disposing old resources automatically.

Whenever the argument passed to `.use()` changes, it disposes the old resource and creates a new one, triggering loading the new data. If the component which called `.use()` is unmounted, the resource is disposed.

Note that the `Pokemon` component is exactly the same with either the event-based or hooks-based APIs. The difference is in how the Resource is *created*, not how it's *used*.

#### IMPORTANT: The one rule

Due to how React works, you **must not** call `.use()` and `.read()` in the same component. One component must create the resource with `.use()`, and then pass the resource to a 2nd component to render it.

```jsx
// DON'T DO THIS - IT WON'T WORK
function Pokemon( { id } ) {
  const resource = PokemonResource.use( id );
  const pokemon = resource.read();
  return <div>My name is {pokemon.name}.</div>;
}
```

```jsx
// This works
function Pokemon( { id } ) {
  const resource = PokemonResource.use( id );
  return <PokemonDisplay resource={ resource } />;
}

function PokemonDisplay( { resource } ) {
  const pokemon = resource.read();
  return <div>My name is {pokemon.name}.</div>;
}
```

You can use [`withResources()`](#withResources) to remove some of the boilerplate code.

#### Wait a second! You're not meant to perform effects in the render phase.

Quite right!

It looks like `.use()` is doing this, but actually it's not. Internally, `.use()` calls `useEffect()` and performs the data loading inside the `useEffect()` hook. This is what allows it to automatically dispose of defunct resources.

### Aborting data fetching

If you are changing the data you load frequently, you may want to abort fetch requests in flight if their results are no longer required.

If the promise returned by the fetch function has an `.abort()` method, it will be called when the resource is disposed.

e.g. Using `fetch()` and `AbortController`:

```js
function abortableFetchJson( url ) {
  const abortController = new AbortController();

  const promise = fetch(
    url,
    { signal: abortController.signal }
  ).then( res => res.json() );

  promise.abort = () => abortController.abort();

  return promise;
}

// Create Resource Factory
const PokemonResource = createResourceFactory(
  id => abortableFetchJson(`https://pokeapi.co/api/v2/pokemon/${id}/`)
);

// Create resource - fetching begins
const resource = PokemonResource.create( 1 );

// Dispose resource - fetch request is aborted
resource.dispose();
```

NB `.dispose()` does not call the Promise's `.abort()` method if the Promise has already resolved.

If you're using the hooks-based API, `.use()` takes care of disposal for you. All you need to do is make sure the promises returned by the `createResourceFactory()` fetch function have an `.abort()` method.

```jsx
const PokemonResource = createResourceFactory(
  id => abortableFetchJson(`https://pokeapi.co/api/v2/pokemon/${id}/`)
);

function App() {
  const [id, setId] = useState( 1 );
  const resource = PokemonResource.use( id );

  return (
    <div>
      <Suspense fallback={ <div>Loading...</div> }>
        <Pokemon resource={ resource } />
      </Suspense>
      <button onClick={ setId( id => id + 1 ) }>Next Pokemon!</button>
    </div>
  );
}

function Pokemon( { resource } ) {
  const pokemon = resource.read();
  return <div>My name is {pokemon.name}.</div>;
}
```

If you click "Next Pokemon!" before the previous data has finished loading, the old fetch is aborted before the next fetch commences. So you're not using bandwidth for data which won't be used.

NB The only thing which has changed from previous `.use()` example is in the fetch function passed to `createResourceFactory()`. Everything else is unchanged.

### `withResources()`

To avoid having to call `.read()`, you can instead wrap components which use Resources in `withResources()`.

When a wrapped component is rendered, it checks if any of its props are Resources. If they are, it calls `.read()` on the Resources before rendering the original component. So then you can just use the data directly, rather than having to call `.read()` yourself.

Same example as above, but using `withResources()`:

```jsx
import { withResources } from 'react-lazy-data';

const PokemonDisplay = withResources(
  ( { pokemon } ) => <div>My name is {pokemon.name}.</div>
};

function Pokemon( { id } ) {
  const pokemonResource = PokemonResource.use( id );
  return <PokemonDisplay pokemon={ pokemonResource } />;
}
```

NB `withResources()` only does a shallow search of props for Resources. i.e. if props are `{ pokemon: resource }`, the resource will be found and read. But if props are `{ myStuff: { pokemon: resource } }`, it won't.

#### Usage with `React.lazy()`

`withResources()` should be used to wrap a component *before* it is wrapped with `React.lazy()`.

```js
// DON'T DO THIS
// It will work, but it'll delay loading the Lazy component
// until after data loads.
const Pokemon = withResources(
  React.lazy( () => import( './Pokemon.js' ) )
);
```

```js
// This works better - Lazy component and data load concurrently

// App.js
const Pokemon = React.lazy( () => import( './Pokemon.js' ) );

// Pokemon.js
export default withResources(
  ( { pokemon } ) => <div>My name is {pokemon.name}.</div>
);
```

### `isResource()`

Utility function to determine if a value is a Resource.

```js
import { isResource } from 'react-lazy-data';

const resource = PokemonResource.create( 1 );

isResource( resource ) // => `true`
isResource( { foo: 'bar' } ) // => `false`
```

## Versioning

This module follows [semver](https://semver.org/). Breaking changes will only be made in major version updates.

## Tests

Use `npm test` to run the tests. Use `npm run cover` to check coverage.

## Changelog

See [changelog.md](https://github.com/overlookmotel/react-lazy-data/blob/master/changelog.md)

## Issues

If you discover a bug, please raise an issue on Github. https://github.com/overlookmotel/react-lazy-data/issues

## Contribution

Pull requests are very welcome. Please:

* ensure all tests pass before submitting PR
* add tests for new features
* document new functionality/API additions in README
* do not add an entry to Changelog (Changelog is created when cutting releases)
