/*
* @Author: colxi
* @Date:   2018-04-23 06:35:19
* @Last Modified by:   colxi
* @Last Modified time: 2018-04-24 00:56:27
*/

const ParallelFunction = (function(){
    'use strict';

    if( typeof Worker !== 'function' ||
        typeof Blob !== 'function'   ||
        typeof Promise !== 'function'){
        throw new Error('Aborted: Some o the required APIS are not available (WebWorkers, Blobs,Promises)' );
    }

    // private WORKER ID counter
    let __identifierCounter__ = 1;

    return function(func, onMessageHandler = function(){} , __DEBUG__ = false){
        // constructor must be calld using 'new'
        if( !(this instanceof ParallelFunction) ) throw new Error('Calling ParallelFunction constructor without new is forbidden');

        // filter arguments
        if(typeof func !== 'function') throw new Error('First argument must be a function.');
        if(typeof onMessageHandler !== 'function') throw new Error('If Second argument is setted, it must be a function.');

        const debug = function(...args){
            if( __DEBUG__ ) return console.log(...args);
            else return false;
        };

        // current instance id
        let __INSTANCE_ID__ = __identifierCounter__++;
        // current worker reference
        let __WORKER__;
        // internal counter, used to assign an ID to each message send to
        // the worker, to properly handle the responses
        let __CALL_ID__ = 0;
        // object containing all the RESOLVE references, required to
        // return the control after each worker call is completed.
        let __RESOLVE__ = [];

        // -----------------------------------------------------------------
        // GENERATE THE WORKER
        // -----------------------------------------------------------------
        // The worker will require a minimal comunication layer code
        // to load the provided function and route and handle each call...

        // covert the function into something transfereable...
        let funcEncoded = JSON.stringify( func.toString() );
        // Convert the communication layer code, into a blob, and attach
        // the stringified function
        let blob = new Blob([ '(' + loader.toString() + ')("'+func.name+'",'+funcEncoded+','+__DEBUG__+');']);
        // convert the blob into a Object Url
        let blobURL = URL.createObjectURL( blob, {
            type: 'application/javascript; charset=utf-8'
        });
        // generate the worker!
        __WORKER__ = new Worker( blobURL );

        // -----------------------------------------------------------------
        // PROCESS SIGNAL (on message evenet handler)
        // -----------------------------------------------------------------
        // handle the recieved messages from worker, and proces the internal
        // ones, or redrect the custom messages to he provided handler
        let _ParallelFunction = function(...args){
            if(__WORKER__ === null) throw new Error('This ParallelFunction instance does not exist anymore.');
            // increase call counter
            __CALL_ID__++;
            debug('[WORKER-'+ __INSTANCE_ID__ + '] >>', '#'+__CALL_ID__, args);
            return new Promise( resolve =>{
                // store the resolve function
                __RESOLVE__[__CALL_ID__] = resolve;
                // send the message
                __WORKER__.postMessage({
                    __parallel_function__ : true,
                    id:__CALL_ID__,
                    data : args
                });
            });
        };
        _ParallelFunction.onMessage = onMessageHandler;
        _ParallelFunction.id = __INSTANCE_ID__;
        _ParallelFunction.postMessage = function(...args){
            if(__WORKER__ === null) throw new Error('This ParallelFunction instance does not exist anymore.');
            return __WORKER__.postMessage(...args);
        };
        _ParallelFunction.terminate = function(){
            if(__WORKER__ === null) return false;

            __WORKER__.terminate();
            _ParallelFunction.postMessage = null;
            _ParallelFunction.id          = null;
            _ParallelFunction.onMessage   = null;
            _ParallelFunction             = null;

            __WORKER__  = null;
            __RESOLVE__ = null;
            __CALL_ID__ = null;
            return true;
        };
        _ParallelFunction.destroy = _ParallelFunction.terminate;

        // HANDLED return signals
        function onMessage(m){
            if(__WORKER__ === null){
                console.warn('Message recieved, but ParallelFunction instance does not exist anymore. Discarding.');
                return false;
            }

            const msg = m.data;
            // if message is an object and contains the private signature
            // proccess as an internal library signal
            if( typeof msg === 'object' && msg.hasOwnProperty('__parallel_function__') ){
                debug('[WORKER-'+__INSTANCE_ID__ + '] << #'+ msg.id, msg.data);
                // resolve the promise returning the result
                // and clear the promise reference
                __RESOLVE__[ msg.id ]( msg.data );
                return __RESOLVE__[ msg.id ] = null;
            }
            // if no signature is found, let the user manage the message
            else return _ParallelFunction.onMessage(m); // USER CUSTOM SIGNALS
        }

        // Set incoming messages handler
        __WORKER__.addEventListener('message', onMessage);

        func, onMessageHandler, funcEncoded, blob, blobURL = null;

        return _ParallelFunction;
    };
})();



/*******************************************************************************
 *
 *
 * INJECTED WORKER HANDLER
 * -------------------------------
 *
 *
 ******************************************************************************/
function loader( funcName, func ){
    const postMessage = function(o){
        let msg = {
            __parallel_function__ : true,
            id : o.id || 0,
            data : o.data
        };
        self.postMessage(msg);
    };

    self.addEventListener( 'message',  async function (e) {
        // if message doens't have private signature, asume is a user custom
        // message, abort communication layer message handling, and let the user
        // catch the message
        if( !e.data.hasOwnProperty('__parallel_function__') ) return;

        // the message is an internal message1 prevent the message
        // to reach any user onmessage event listener, declared in he function
        e.stopImmediatePropagation();

        // prepare & analize the message
        let msg = e.data;
        let args = Array.isArray( msg.data ) ? msg.data : [];
        // allow async functions to be called using await
        let result = await self[funcName]( ...args );
        postMessage({
            id : msg.id,
            data : result
        });
    }, false );

    // communucation layer eady. insert user function
    funcName = funcName ? funcName : '_parallelFunction';
    self[funcName] = new Function( 'return ' + func.toString() )();

    // DONE !
}
