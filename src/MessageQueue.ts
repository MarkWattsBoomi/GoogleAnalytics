import { AnalyticsEvent, eAuditEventType } from "./Model";
import ReactGA from'react-ga';


// This class functions as a simple queue for Audit Messages which need to be sent
// It also incorporates pesistence of the queue into local storage in case of sending issues or browser refresh while messages are still outstanding
export default class MessgeQueue {
    messages: Array<AnalyticsEvent> = [];
    isProcessing: boolean = false;
    failureCount: number=0;

    tenantId: string;
    trackingCode: string;

    emmitMessage: (message: string) => any;
    emmitWarning: (message: string) => any;
    emmitError: (message: string) => any;

    debug: boolean = false;


    // load existing  messages from storage
    constructor(
        tenantId: string,
        trackingCode: string,
        messageCallback: any,
        warningCallback: any,
        errorCallback: any,
        debug: boolean

    ) {
        this.tenantId = tenantId;
        this.trackingCode=trackingCode;
        this.emmitMessage = messageCallback;
        this.emmitWarning = warningCallback;
        this.emmitError = errorCallback;
        this.debug = debug;

        // load from storage
        this.messages = JSON.parse(localStorage.getItem("gaEvents-" + this.tenantId) || "[]");

        // bind to context
        this.auditEvent = this.auditEvent.bind(this);
        this.processMessages = this.processMessages.bind(this);

        let options: any = {};
        if(this.debug===true) {
            options.debug = true;
        }

        ReactGA.initialize(this.trackingCode,options);

        this.processMessages();
    }

    // adds an event to the queue
    add(event: AnalyticsEvent) {
        this.messages.push(event);
        localStorage.setItem("gaEvents-" + this.tenantId, JSON.stringify(this.messages));
        this.processMessages();
    }

    // removes first event to the queue
    pop()  {
        this.messages.splice(0,1);
        localStorage.setItem("gaEvents-" + this.tenantId, JSON.stringify(this.messages))
    }

    // get queue length
    get length() : number {
        return this.messages.length;
    }

    // get's first item from queue
    get() : AnalyticsEvent {
        return this.messages[0];
    }

    // an async process to try to run the message queue down to 0 length
    // isProcessing flag prevents simultaneous calls
    // any errors or fails will result in up to 5 retries before an error is emmitted and retrying stops.
    async processMessages() {
        if(this.isProcessing === true) {
            //already processing, set callback
            setTimeout(this.processMessages, 300);
            this.emmitMessage?.("processing - callback");
        }
        else {
            this.isProcessing=true;
            this.emmitMessage("Prcessing " + this.messages.length + " messages");

            while(this.messages.length > 0) {
                let result: boolean = await this.auditEvent(this.get());
                if(result === true) {
                    this.pop();
                    this.failureCount = 0;
                    this.emmitMessage?.("processing - message delivered");
                }
                else {
                    if(this.failureCount < 5) {
                        this.failureCount++;
                        setTimeout(this.processMessages, 300); 
                        this.emmitWarning?.("processing - message failed - callback - retry=" + this.failureCount);
                    }
                    else {
                        this.emmitError?.("Message delivery has failed too many times");
                    }
                    break;
                }
            }
            this.isProcessing=false;
            
        }
    }

    private async auditEvent(event: AnalyticsEvent) : Promise<any>{
        
        let path: string = "/";
        if(event.parentFlowId && (event.parentFlowId !== event.flowId)) {
            path += event.parentFlowName + "/" +event.flowName;
        }
        else {
            path += event.flowName
        }
        path += "/" + event.stepLabel + " (" + event.stepName + ")";
        try {
            switch(event.eventType) {
                case eAuditEventType.pageView:
                    ReactGA.pageview(path);
                    ReactGA.event({
                        category: "FlowEvent",
                        action: "Page Arrived " + path ,
                        label: "Arrived on page " + path ,
                    });
                    break;

                case eAuditEventType.flowEnd:
                    ReactGA.event({
                        category: "FlowEvent",
                        action: "Flow Ended",
                        label: "Flow reached the end",
                    });
                    break;

                case eAuditEventType.pageLeave:
                    ReactGA.event({
                        category: "FlowEvent",
                        action: "Page Left " + path + " on outcome " + event.outcomeLabel,
                        label: "Left page " + path + " on outcome " + event.outcomeLabel,
                    });
                    break;
            }
            
            return true;
        }
        catch(error) {
            this.emmitError(error);
            return false;
        }

    }

}