---
title: Common Hooks 
date: "2019-04-20T22:12:03.284Z"
author: Ben Ebsworth
description: 'Collection of common hook usage examples as well as custom implementations'
labels: technology,react
keywords:
release: true
---
From the first watching of Reactconf 2018 keynote, where [Hooks]([link here](https://reactjs.org/docs/hooks-intro.html)) were first introduced I was taken aback by the simplicity of the approach but the far reaching applicability to solving common problems within design and build of react applications. It was very reminicent of quote from Albert Einstein:

> Everything should be made as simple as possible, but not simpler

Which is funny in light of Dan Ambramov's comment about Hooks being the electron in Reacts Atom logo.
This article will serve as a library of ramblings about personally developed, as well as externally discovered hook use-cases for future project usage and reference.

## Principles

The fundamental tenants of React Hooks seems to be to enable a cleaner and more functional mechanism for accessing the underlying core react tools, including: state, [context](https://reactjs.org/docs/context.html),lifecycle, and refs. With this new API, we can go about implementing a simpler, lighter, and likely more modular approach to problems we'd normally seek Redux/Redux-sagas to solve. I would like to see how hooks compare when building out a larger app, in comparison to experiences with Redux. To validate the excitement felt about the future of React.

The primary hooks available are the following:

* **useState** - provides getter/setter pair for managing a localised state
* **useEffect** - accepts a function that will possibly __effectuate__ aspects of a component. Example could be to do some kind of mutation, logging, delayed action or timer and other side effects within this hook. By default effects run on every complete render, but more granular firing can be controled via the second argumement.
* **useContext** - Takes a context object and returns the current value of the given context. If the given context changes, the component will re-render.
* **useReducer** - Alternative to the **useState** hook, accepts a reducer of type `(state, action) => newState`, very similar to model to how `Redux` operates. Returns the current state, paired with a `dispatch` method.

There are a number of more advanced hooks which we'll cover in more detail over time.

## Examples

Here we define common hook usages across the number of fundamental categories.

### useState

#### counter

```jsx
function Example() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    document.title = `You clicked ${count} times`;
  });
  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

### useEffect

##### useResizerObserver

Provides a mechanism to fetch window size using the [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

>useResizerObserver.tsx

```jsx
import { useEffect, useState, useRef } from 'react';
import ResizeObserver from 'resize-observer-polyfill';

export default function() {
  const isClient = typeof window === 'object';
  const ref = useRef();
  const [width, changeWidth] = useState(1);
  const [height, changeHeight] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element || !isClient) {
      return;
    }

    const resizeObserver = new ResizeObserver(entries => {
      if (!Array.isArray(entries)) {
        return;
      }
      if (!entries.length) {
        return;
      }
      const entry = entries[0];
      changeWidth(entry.contentRect.width);
      changeHeight(entry.contentRect.height);
    });
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [width, isClient]);

  return [ref, width, height];
}

```