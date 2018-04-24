![](https://cdn.rawgit.com/colxi/parallel-function/f693ac1b/logo.png)

# ParallelFunction
![](https://img.shields.io/badge/cdn-cdn.rawgit-green.svg)
![](https://img.shields.io/badge/Javascript-ES6-orange.svg)
![](https://img.shields.io/badge/powered-webWorkers-blue.svg)

**Create a new thread with your function**, and keep it ready to be called as many times you need, **asynchronously** in the background, **without blocking your main thread event loop**.

#### Features
- [x] Generate/Destroy threaded functions on demmand.
- [x] Execute your functions as a regular async function call.
- [x] Unlsease the power of multithreading keeping your code clean.
- [x] Compatible with Promise.race() & Promise.all()
- [x] Availability to use the power of Transfereable Objects and sharedArrayBuffers.
- [x] Browser support : Firefox 59,  Edge 41, Chrome 65
- [ ] Node support... ¿Soon? 



## Syntax


> let myParallelFunction = new ParallelFunction( myFunction );

#### Parameters
- **myFunction**  *function,required* :
    Function to be executed in the worker. It will automatically become an async function.


#### Constructor Returns
The ParallelFunction Constructor returns an interface-function, wich handles the async calls to your function.

> async myParallelFunction( ...args ); // ...will execute your function

It's a regular function, but contains some suga, like a method to Destroy the thread, when is not anymore required.

> myParallelFunction.**destroy()**;

Finally provides some methods to perform advanced implementations, combining the simple interface provided by ParallelFunction and the native Worker API. This methods, expose the worker API. For more infomation about them, check the [Mozilla documentation](https://developer.mozilla.org/en-US/docs/Web/API/Worker)

> myParallelFunction.**postMessage( message, transferList )**;
>
> myParallelFunction.**onMessage( handler )**;
>


## Usage

A minimal example, to interact with a ParallelFunction :
```javascript
    // Generate a ParallelFunction to calculate Pi,
    // with customizable precision. The bigger
    // is n, the  longuer is going to take
    let calculatePi = new ParallelFunction( function(n){
        var v = 0;
        for(let i=1; i<=n; i+=4) v += ( 1/i ) - ( 1/(i+2) );
        return 4*v;
    });
    
    // perform the calculation, with different precisions
    calculatePi(1000000).then( r=> console.log(r) );
    calculatePi(1000000000).then( r=> console.log(r) );

    // use the Promise await keyword inside async functions
    (async function(){
        let pi = await calculatePi(1000000000);
	    console.log( pi );
        // done! destroy the reference
        calculatePi.destroy();
    })()
```

## Installation
Use any of the following distribution channels:
- Global **CDN**
```
<script src="https://cdn.rawgit.com/colxi/parallel-function/814e4698/parallel-function.js"></script>
```

- Use **npm**
```
$ npm -i parallel-function
```

- Clone from **github**
```
https://github.com/colxi/parallel-function
```


## Details
- Because each request needs to be messaged to the worker, and its result, messaged back, all interactions with the function are **ASYNCHRONOUS**.

- **Your Parallel Function doesn't run in the same scope where  was declared , but in an isolate scope inside a worker**, this means, it cannot reach any variable declared in the main thread. However has acces to all the methods of the [Web Worker API](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope)

- Only those values wich can be handled by the  [Structure Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) are candidates to be passed/retrieved through the function calls.

> All primitive types, *Except symbols* -- Boolean object -- String object -- Date -- RegExp, *The lastIndex field is not preserved* -- Blob -- File -- FileList -- ArrayBuffer -- ArrayBufferView, *All typed arrays (like Int32Array etc.)* -- ImageData -- Array -- Object, *Just plain objects (e.g. from object literals)* -- Map -- Set

- Because the worker allows natively **powerfull interactions throught the standard Messages**, this library lets you use them, in order to unlease the real power of workers (and make use of trafereable objects, sharedArrayBuffers...)


## Node support
Until Workers API isn't available in Node, this library is exclusive for Browsers.
Threads to track:

Worker support
https://github.com/nodejs/node/issues/13143

Implement createObjectURL/Blob from File API
https://github.com/nodejs/node/issues/16167


## Implementation overview
The mechanism is pretty simple and straight forward.
> ParallelFunction = **Blobs + Workers + Promises**

The library injects into a new Worker, a Blob containing the code of the communication layer, and the provided function, and handles each function call adding it to the messages queue, using a unique index ID.
When a call is returned, it resolves the Promise associated with the call ID.