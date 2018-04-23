/*
* @Author: colxi
* @Date:   2018-04-23 06:35:19
* @Last Modified by:   colxi
* @Last Modified time: 2018-04-23 17:51:23
*/

const ParallelFunction = (function(){
    'use strict';

    // private WORKER ID counter
    let __identifierCounter__ = 0;

    return function(func, onMessageHandler = function(){} , __DEBUG__ = true){
        // constructor must be calld using 'new'
        if( !(this instanceof ParallelFunction) ) throw new Error('Calling ParallelFunction constructor without new is forbidden');

        if(typeof func !== 'function') throw new Error('First argument must be a function.')
        if(typeof onMessageHandler !== 'function') throw new Error('If Second argument is setted, it must be a function.')

        const debug = function(...args){
            if( __DEBUG__ ) return console.log(...args);
            else return false;
        };



        // internal counter, used to assign an ID to each message send to
        // the worker, to properly handle the responses
        let __UID__ = 0;
        // object containing all the RESOLVE references, required to
        // return the control after each worker call is completed.
        let __RESOLVE__ = [];

        // -----------------------------------------------------------------
        // GENERATE THE WORKER
        // -----------------------------------------------------------------
        // The worker will require a minimal comunication layer code
        // to load the provided function and route and handle each call...

        // covert the function into something transfereable...
        const funcEncoded = JSON.stringify( func.toString() );
        // Convert the communication layer code, into a blob, and attach
        // the stringified function
        const blob = new Blob([ '(' + loader.toString() + ')("'+func.name+'",'+funcEncoded+','+__DEBUG__+');']);
        // convert the blob into a Object Url
        const blobURL = URL.createObjectURL( blob, {
            type: 'application/javascript; charset=utf-8'
        });
        // generate the worker!
        const workerReference = new Worker( blobURL );


        // -----------------------------------------------------------------
        // PROCESS SIGNAL (on message evenet handler)
        // -----------------------------------------------------------------
        // handle the recieved messages from worker, and proces the internal
        // ones, or redrect the custom messages to he provided handler
        let _ParallelFunction = function(...args){
            __UID__++;
            debug('>>', '#'+__UID__, args);
            return new Promise( ( resolve )=>{
                __RESOLVE__[__UID__] = resolve;
                workerReference.postMessage({
                    __parallel_function__ : true,
                    id:__UID__ ,
                    data : args
                });
            });
        };
        _ParallelFunction.onMessage = onMessageHandler;
        _ParallelFunction.postMessage = function(...args){ return workerReference.postMessage(...args) };
        _ParallelFunction.terminate = function(){
            workerReference.terminate();
            _ParallelFunction = null;
            __RESOLVE__ = null;
            __UID__ = null;
            return true;
        };
        _ParallelFunction.destroy = _ParallelFunction.terminate;

        // HANDLED return signals
        function onMessage(m){
            const msg = m.data;
            // if message is an object and contains the private signature
            // proccess as an internal library signal
            if( typeof msg === 'object' && msg.hasOwnProperty('__parallel_function__') ){
                debug('<< #'+ msg.id, msg.data);
                // resolve the promise returning the result
                // and clear the promise reference
                __RESOLVE__[ msg.id ]( msg.data );
                return __RESOLVE__[ msg.id ] = null;
            }
            // if no signature is found, let the user manage the message
            else return _ParallelFunction.onMessage(m); // USER CUSTOM SIGNALS
        }

        // Set incoming messages handler
        workerReference.addEventListener('message', onMessage);

        return _ParallelFunction;
    };
})();



/*******************************************************************************
 *
 *
 * INJECTED WORKER EXPORTS HANDLER
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
