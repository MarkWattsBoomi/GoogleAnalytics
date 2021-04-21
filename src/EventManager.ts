declare const manywho: any;
declare const culture: any;

if (!(manywho as any).eventManager) {
    (manywho as any).eventManager = {};
    (manywho as any).eventManager.beforeSendListeners = {};
    (manywho as any).eventManager.doneListeners = {};
    (manywho as any).eventManager.initializedListeners = {};
    (manywho as any).eventManager.joinListeners = {};
    (manywho as any).eventManager.failListeners = {};
    (manywho as any).eventManager.outcomeBeingTriggered;
    (manywho as any).eventManager.history = [];

    (manywho as any).eventManager.beforeSend = (xhr: XMLHttpRequest, request: any) => {
        //(manywho as any).eventManager.beforeSendListeners.forEach((listener: any) => listener(xhr, request));
        if(xhr) {
            if(window.hasOwnProperty("culture") && culture.length > 0) {
                xhr.setRequestHeader("Culture", culture); //"Brand=XL&Country=XL&Language=ES&Variant=XL");
            }
        }
        for(const key in (manywho as any).eventManager.beforeSendListeners )
        {
            (manywho as any).eventManager.beforeSendListeners[key](xhr, request);
        }
    };

    (manywho as any).eventManager.done = (xhr: XMLHttpRequest, request: any) => {
        //(manywho as any).eventManager.doneListeners.forEach((listener: any) => listener(xhr, request));
        for(const key in (manywho as any).eventManager.doneListeners )
        {
            (manywho as any).eventManager.doneListeners[key](xhr, request);
        }
    };

    (manywho as any).eventManager.join = (xhr: XMLHttpRequest, request: any) => {
        //(manywho as any).eventManager.doneListeners.forEach((listener: any) => listener(xhr, request));
        for(const key in (manywho as any).eventManager.joinListeners )
        {
            (manywho as any).eventManager.joinListeners[key](xhr, request);
        }
    };

    (manywho as any).eventManager.initialized = (xhr: XMLHttpRequest, request: any) => {
        //(manywho as any).eventManager.doneListeners.forEach((listener: any) => listener(xhr, request));
        for(const key in (manywho as any).eventManager.initializedListeners )
        {
            (manywho as any).eventManager.initializedListeners[key](xhr, request);
        }
    };

    (manywho as any).eventManager.fail = (xhr: XMLHttpRequest, request: any) => {
        //(manywho as any).eventManager.failListeners.forEach((listener: any) => listener(xhr, request));
        for(const key in (manywho as any).eventManager.failListeners )
        {
            (manywho as any).eventManager.failListeners[key](xhr, request);
        }
    };

    (manywho as any).eventManager.addBeforeSendListener = (handler: (xhr: XMLHttpRequest, request: any) => void, componentId: string) => {
        (manywho as any).eventManager.beforeSendListeners[componentId] = handler;
    };

    (manywho as any).eventManager.removeBeforeSendListener = (componentId: string) => {
        delete (manywho as any).eventManager.beforeSendListeners[componentId];
    };

    (manywho as any).eventManager.addInitializedListener = (handler: (xhr: XMLHttpRequest, request: any) => void, componentId: string) => {
        (manywho as any).eventManager.initializedListeners[componentId] = handler;
    };

    (manywho as any).eventManager.removeInitializedListener = (componentId: string) => {
        delete (manywho as any).eventManager.initializedListeners[componentId];
    };
    
    (manywho as any).eventManager.addJoinListener = (handler: (xhr: XMLHttpRequest, request: any) => void, componentId: string) => {
        (manywho as any).eventManager.joinListeners[componentId] = handler;
    };

    (manywho as any).eventManager.removeJoinListener = (componentId: string) => {
        delete (manywho as any).eventManager.joinListeners[componentId];
    };

    (manywho as any).eventManager.addDoneListener = (handler: (xhr: XMLHttpRequest, request: any) => void, componentId: string) => {
        (manywho as any).eventManager.doneListeners[componentId] = handler;
    };

    (manywho as any).eventManager.removeDoneListener = (componentId: string) => {
        delete (manywho as any).eventManager.doneListeners[componentId];
    };

    (manywho as any).eventManager.addFailListener = (handler: (xhr: XMLHttpRequest, request: any) => void, componentId: string) => {
        (manywho as any).eventManager.failListeners[componentId] = handler;
    };

    (manywho as any).eventManager.removeFailListener = (componentId: string) => {
        delete (manywho as any).eventManager.failListeners[componentId];
    };

    manywho.settings.initialize(null, {
        invoke: {
            beforeSend: (manywho as any).eventManager.beforeSend,
            done: (manywho as any).eventManager.done,
            fail: (manywho as any).eventManager.fail,
        },
        initialization: {
            beforeSend: (manywho as any).eventManager.beforeSend,
            done: (manywho as any).eventManager.initialized,
            fail: (manywho as any).eventManager.fail,
        },
        join: {
            beforeSend: (manywho as any).eventManager.beforeSend,
            done: (manywho as any).eventManager.join,
            fail: (manywho as any).eventManager.fail,
        },
    });
}

export{};