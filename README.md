## parallel-function 
![](https://img.shields.io/badge/cdn-cdn.rawgit-green.svg)
![](https://img.shields.io/badge/Javascript-ES6-orange.svg)
![](https://img.shields.io/badge/powered-webWorkers-blue.svg)

Create a new thread with your function, ready to be called as many times you need, asynchronously in the background, without blocking your main thread execution loop.



## Syntax 


> let myParallelFunction = new ParallelFunction( myFunction [ ,onMessageHandler ] );

#### Parameters
- **myFunction**  ~function,required~
    Function to be executed in the worker
- **onMessageHandler** ~function~
    Function to handle the messages sent from the worker using postMessage

## Return
The ParallelFunction Constructor returns an interface function, to perform the async calls. Each call will return a Promise :

> myParallelFunction( ...args );

A method for destroying the instance :

> myParallelFunction.**destroy()**;

And it also provides some methods to perform some Worker related tasks, wich behave as the starndard describes. For more infomation about them, check the [ Mozilla documentation](https://developer.mozilla.org/en-US/docs/Web/API/Worker)

> myParallelFunction.**postMessage( message, transferList )**;
> myParallelFunction.**onMessage( handler **);
> myParallelFunction.**terminate()**;


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
    // perform the calculation in the background, with different
    // precision , and in consecuence calculation speeds
    calculatePi(1000000).then( r=> console.log(r) );
    calculatePi(1000000000).then( r=> console.log(r) );
    
    // if you preffer you can use the Promise await keyword
    // insid async functions
    (async function(){
	    console.log( await calculatePi(1000000000) );
        // destroy the ParallelFunction
        calculatePi.destroy();
    })()
   
    


```

## How it works 
The mechanism is pretty simple and straight forward.
The library injects into a new Worker, a Blob containing the code of the communication layer, and the provided function, and handles each function call adding it to the messages queue, using a unique index Id.
When a call is returned, it resolves thePpromise associated with the call Id.


## Notes :
- Because each request (getset/apply) needs to be messaged to the worker, and its result, messaged back, all interactions with the function are **ASYNC**.

- **ParallelFunction doesn't run in the same scope where  was declared , but in an isolate scope inside a worker**, this means, it cannot reach any variable declared in the main thread. However has acces to all the methods of the [Web Worker Api](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope)

- Only those values wich can be handled by the browser [Structure Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) are candidates to be passed/retrieved through the function calls.


> All primitive types	- **However not symbols**
> Boolean object	 
> String object	 
> Date	 
> RegExp	- **The lastIndex field is not preserved**
> Blob	 
> File	 
> FileList	 
> ArrayBuffer	 
> ArrayBufferView	- **All typed arrays like (Int32Array etc.)**
> ImageData	 
> Array	 
> Object	- **Just plain objects (e.g. from object literals)**
> Map	 
> Set	 

- Because the worker allows natively **powerfull interactions throught the standard Messages**, this library lets you use them, in order to unlease the real power of workers (and make use of trafereable objects, sharedArrayBuffers...)