declare const manywho: any;
declare const analytics: any;

import "./EventManager";
import MessageQueue from "./MessageQueue";

import { Model, ComponentChange, User, AnalyticsEvent,  RootFlow, eAuditEventType } from "./Model";
import Services from "./Services";



export default class Audit {
    version: string="1.0.0";
    context: any;
    tenantId: string;
    stateId: string;
    stateToken: string;
    topLevelFlowId: string;

    //oAuthToken: oAuthToken;

    queryParams: Map<string,string> = new Map();

    // holds the current model data
    model: Model;
    
    // holds flow user details 
    user: User;

    //holds the parent flow details
    parentFlow: RootFlow;

    // buffer to hold audit messages needing sending
    messageQueue: MessageQueue;

    // counter for failures
    failureCount: number = 0;

    
    // called by module level method on load
    // passes in the current tenant id and any url parameters 
    constructor(tenantId: string, queryParams: any) {

        this.debug("loaded tenant=" + tenantId);
        this.tenantId = tenantId;

        if(queryParams) {
            Object.keys(queryParams).forEach((key: string) => {
                this.queryParams.set(key,queryParams[key]);
            });
        }

        //bind event handlers to context
        this.initializing=this.initializing.bind(this);
        this.checkCoreElements=this.checkCoreElements.bind(this);
        this.leaving=this.leaving.bind(this);
        this.arriving=this.arriving.bind(this);
        this.joining=this.joining.bind(this);
        this.viewing=this.viewing.bind(this);
        this.ending=this.ending.bind(this);
        //this.processMessages=this.processMessages.bind(this);

        //attach flow event listeners
        (manywho as any).eventManager.addBeforeSendListener(this.leaving, "audit_trail");
        (manywho as any).eventManager.addDoneListener(this.arriving, "audit_trail");
        (manywho as any).eventManager.addJoinListener(this.joining, "audit_trail");
        
        (manywho as any).eventManager.addBeforeSendListener(this.checkCoreElements, "audit_trail_async");
        (manywho as any).eventManager.addInitializedListener(this.initializing, "audit_trail_async");
        (manywho as any).eventManager.addDoneListener(this.checkCoreElements, "audit_trail_async");
        (manywho as any).eventManager.addJoinListener(this.checkCoreElements, "audit_trail_async");

        this.messageQueue = new MessageQueue(
            this.tenantId,
            analytics.trackingCode,
            this.debug,
            this.debug,
            this.error,
            analytics.debug
        )
    }

    
    debug(message: any) {
        if(analytics.debug === true) {
            console.log(message);
        }
    }

    error(message: any) {
        console.log(message);
        alert(message);
    }

     // triggered when a flow is being created
     async initializing(xhr: any, request: any) {
        await this.checkCoreElements(xhr, request);
        if(xhr && analytics.logInit===true) {
            // might need to log something
        }

    }

    // this async method is called from the events to maintain the required supporting info
    // it's async since the stuff it does is. We can't let it happen in the non-async event methods since that breaks the leave / arrive chaining
    async checkCoreElements(xhr: any, request: any) {
        try{

            // make sure we have the user
            if(((this.user === undefined) || (this.user.id === "PUBLIC_USER")) && (this.stateId)) {
                // if not call flow rest api to get the user state value
                let uxhr: any = await Services.getUser(this.tenantId, this.stateId);
                // use the User class to parse the returned value
                if(uxhr){
                    this.user = User.parseModel(uxhr.objectData[0]);
                }
            }

            // make sure we know the root / parent flow
            if((this.parentFlow === undefined) && (this.stateId) && (this.model) && (this.model.parentFlowId)) {
                //if we don't have parent flow details then get them
                let pxhr: any = await Services.getFlowDetails(this.tenantId, this.stateId, this.model.parentFlowId);
                if(pxhr){
                    this.parentFlow = RootFlow.parseResponseXHR(pxhr);
                }
            }

        }
        catch(e) {
            this.error(e);
        }
        finally{
        }      
    }

     // triggered by flow's onDone event
     arriving(xhr: any, request: any) {
        
        try{
            // only run if there's an xhr
            if(xhr) {
                this.debug("arriving with xhr");
                // save state values
                this.stateId = xhr.stateId;
                this.stateToken = xhr.stateToken;

                this.debug("arrived");
                switch(xhr.invokeType) {
                    case "FORWARD" :
                        this.model = Model.parseResponseXHR(xhr);
                        this.debug("arrive read model " + JSON.stringify(this.model.outcomes));
                        this.viewing(xhr);
                        break;

                    case "DONE":
                        this.model = Model.parseResponseXHR(xhr);
                        this.ending(xhr);
                        break;

                    default:
                        this.debug("other invoke type = " + xhr.invokeType);
                        break;
                }
            }
            else {
                this.debug("arriving no xhr");
            }
        }
        catch(e) {
            this.error(e);
        }
        finally{
        }
    }

    joining(xhr: any, request: any) {
        
        try{
            // only run if there's an xhr
            if(xhr) {
                this.debug("joining with xhr");
                // save state values
                this.stateId = xhr.stateId;
                this.stateToken = xhr.stateToken;
                // set flag
                //this.isArriving = true;
                this.debug("joined");
                if(xhr.invokeType==="FORWARD") {
                    // use the Model class to parse the XHR to get the components, outcomes, initial values etc.
                    this.model = Model.parseResponseXHR(xhr);
                    this.debug("join read model " + JSON.stringify(this.model.outcomes));
                    this.viewing(xhr);
                }
            }
            else {
                this.debug("join no xhr");
            }
        }
        catch(e) {
            this.error(e);
        }
        finally{
        }
    }

    // triggered by flow's onBeforeSend event
    leaving(request: any, xhr: any) {
        if(xhr) {
            this.debug("leaving");
            this.stateId = xhr.stateId;
            this.stateToken = xhr.stateToken;
            
            try {
                // only process if it's a FORWARD and there's an outcome selected to avoid the create then join state events on new state
                if(xhr.invokeType==="FORWARD" && xhr.mapElementInvokeRequest.selectedOutcomeId) {
                    // now parse the outgoing xhr to capture any value changes 
                    this.model.parseRequestXHR(xhr);
                
                    if(!this.model.selectedOutcomeId) {
                        this.debug("lost outcomeId");
                    }

                    // make sure the outcome being triggered exists in the model
                    if(!this.model.outcomes.has(this.model.selectedOutcomeId)) {
                        this.debug("model doesn't have outcomeId:" + this.model.selectedOutcomeId);
                    }
                    else {
                        
                        // build a change class to send to the logger api
                        let event: AnalyticsEvent = new AnalyticsEvent();
                        event.stateId = this.stateId;
                        event.joinUri = this.model.joinUri;
                        event.parentFlowId = this.parentFlow?.flowId; 
                        event.parentFlowVersion = this.parentFlow?.flowVersion; 
                        event.parentFlowName = this.parentFlow?.flowName;
                        event.flowId = this.model.flowId;
                        event.flowVersion = this.model.flowVersion;
                        event.flowName = this.model.flowName;
                        event.userEmail = this.user.email;
                        event.userName = this.user.userName;
                        event.userFirstName = this.user.firstName;
                        event.userLastName = this.user.lastName;
                        event.eventDate = new Date();
                        event.eventDateUTC = new Date();
                        event.pageName = this.model.mapElement.developerName;
                        event.pageLabel = this.model.page.label;
                        event.stepName = this.model.mapElement.developerName;
                        event.stepLabel = this.model.mapElement.label;
                        event.outcomeName = this.model.outcomes.get(this.model.selectedOutcomeId).developerName;
                        event.outcomeLabel = this.model.outcomes.get(this.model.selectedOutcomeId).label;
                        event.eventType = eAuditEventType.pageLeave;

                        // send the audit event to the logger api
                        this.debug("evt=" + JSON.stringify(event));
                        // add message to buffer
                        this.messageQueue.add(event);
                        //this.processMessages();
                        //Services.auditEvent(event, this.oAuthToken);
                                            }
                }
            }
            catch(e) {
                this.error(e);
            }
            finally {

            }
        }
    }

    // fired when a flow has been delivered but there are no outcomes
    viewing(xhr: any) {
        
        this.debug("pageView");
        // might need to log something
        //but possible that user doesn't exist yet so do a callback if it's null
        if(!this.user) {
            this.debug("ending callback for user");
            let txhr: any = JSON.parse(JSON.stringify(xhr));
            setTimeout(() => {this.viewing(txhr)},100);
        }
        else {                       
            // build a change class to send to the logger api
            let event: AnalyticsEvent = new AnalyticsEvent();
            event.stateId = this.stateId;
            event.joinUri = this.model.joinUri;
            event.parentFlowId = this.parentFlow?.flowId; 
            event.parentFlowVersion = this.parentFlow?.flowVersion; 
            event.parentFlowName = this.parentFlow?.flowName;
            event.flowId = this.model.flowId;
            event.flowVersion = this.model.flowVersion;
            event.flowName = this.model.flowName;
            event.userEmail = this.user.email;
            event.userName = this.user.userName;
            event.userFirstName = this.user.firstName;
            event.userLastName = this.user.lastName;
            event.eventDate = new Date();
            event.eventDateUTC = new Date();
            event.pageName = this.model.mapElement.developerName;
            event.pageLabel = this.model.page.label;
            event.stepName = this.model.mapElement.developerName;
            event.stepLabel = this.model.mapElement.label;
            event.outcomeName = "";
            event.outcomeLabel = "";
            event.eventType = eAuditEventType.pageView;

            
            // send the audit event to the logger api
            this.debug("evt=" + JSON.stringify(event));
            this.messageQueue.add(event);
            //this.processMessages();
            //Services.auditEvent(event, this.oAuthToken);
            
        }
    }

    // fired when a flow has been delivered but there are no outcomes
    ending(xhr: any) {
        if(xhr && analytics.logDone===true) {
            this.debug("ending");
            // might need to log something
            //but possible that user doesn't exist yet so do a callback if it's null
            if(!this.user) {
                this.debug("ending callback for user");
                let txhr: any = JSON.parse(JSON.stringify(xhr));
                setTimeout(() => {this.ending(txhr)},100);
            }
            else {                       
                // build a change class to send to the logger api
                let event: AnalyticsEvent = new AnalyticsEvent();
                event.stateId = this.stateId;
                event.joinUri = this.model.joinUri;
                event.parentFlowId = this.parentFlow?.flowId; 
                event.parentFlowVersion = this.parentFlow?.flowVersion; 
                event.parentFlowName = this.parentFlow?.flowName;
                event.flowId = this.model.flowId;
                event.flowVersion = this.model.flowVersion;
                event.flowName = this.model.flowName;
                event.userEmail = this.user.email;
                event.userName = this.user.userName;
                event.userFirstName = this.user.firstName;
                event.userLastName = this.user.lastName;
                event.eventDate = new Date();
                event.eventDateUTC = new Date();
                event.pageName = this.model.mapElement.developerName;
                event.pageLabel = this.model.page.label;
                event.stepName = this.model.mapElement.developerName;
                event.stepLabel = this.model.mapElement.label;
                event.outcomeName = "isDone";
                event.outcomeLabel = "Flow Complete";
                event.eventType = eAuditEventType.flowEnd;

                // send the audit event to the logger api
                this.debug("evt=" + JSON.stringify(event));
                this.messageQueue.add(event);
            }
        }

        
        
    }
}

// code running at file load to create Audit class and begin the process
// adds an "audit_trail" object to the manywho object
// we expect an objerct to be created in the player to hold the audit api endopint details: -
/*
var analytics = {
    trackingCode: "G-DRKYB81C87"
    logDone: true,
    debug: true
};

var manywho = {
    cdnUrl: 'https://assets.manywho.com',
    requires: ['core', 'bootstrap3'],
    customResources: [
        'https://files-manywho-com.s3.amazonaws.com/e5b74eba-b103-4e05-b767-cdc2ab679116/audit.js' // !!!!!!! This includes the component
    ],
*/
let tenant: string = analytics.tenantId;
(manywho as any).audit_trail = new Audit(
    tenant,
    manywho.utils.parseQueryString(window.location.search.substring(1))
    );
