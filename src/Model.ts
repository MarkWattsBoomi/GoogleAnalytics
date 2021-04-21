export class RootFlow {
    flowId: string;
    flowVersion: string;
    flowName: string;

    static parseResponseXHR(xhr: any) : RootFlow {
        let root: RootFlow = undefined;
        if(xhr) {
            root = new RootFlow();
            root.flowId = xhr.id.id;
            root.flowVersion = xhr.id.versionId;
            root.flowName = xhr.developerName;
        }
        return root;
    }

}

// root Model class to parse and handle the model data from Flow
export class Model {
    stateId: string;
    joinUri: string;
    parentFlowId: string;
    parentFlowVersion: string;
    parentFlowName: string;

    flowId: string;
    flowVersion: string;
    flowName: string;
    
    mapElement: MapElement;
    page: Page;
    outcomes: Map<string,Outcome>;
    components: Map<string,Component>;
    componentsByName: Map<string,string>;
    selectedOutcomeId: string;
    annotations: Map<string,any>;

    // This reads an original model delivered by flow
    // It builds up all the page details and components and original values
    static parseResponseXHR(xhr: any) : Model {
        let model: Model = new Model;  

        model.stateId = xhr.stateId;
        model.joinUri = xhr.joinFlowUri;
        model.flowId = xhr.flowId;
        model.flowName = xhr.flowName;
        model.flowVersion = xhr.flowVersion;

        model.mapElement = MapElement.parseModel(xhr.mapElementInvokeResponses[0]);

        model.page = Page.parseModel(xhr.mapElementInvokeResponses[0].pageResponse);

        model.outcomes = new Map();
        xhr.mapElementInvokeResponses[0].outcomeResponses?.forEach((outcome: any) => {
            model.outcomes.set(outcome.id,Outcome.parseModel(outcome));
        });

        model.components = new Map();
        model.componentsByName = new Map();
        xhr.mapElementInvokeResponses[0].pageResponse?.pageComponentResponses?.forEach((component: any) => {
            model.components.set(component.id,Component.parseModel(component));
            model.componentsByName.set(component.developerName,component.id);
        });

        xhr.mapElementInvokeResponses[0].pageResponse?.pageComponentDataResponses?.forEach((component: any) => {
            let comp: Component = model.components.get(component.pageComponentId);
            comp.setInitialValue(component);
        });

        model.annotations = new Map();
        if(xhr.annotations) {
            Object.keys(xhr.annotations).forEach((key: string) => {
                switch(key) {
                    case "FlowId":
                        model.parentFlowId = xhr.annotations[key];
                        break;
                        
                    case "FlowVersion":
                        model.parentFlowVersion = xhr.annotations[key];
                        break;

                    default:
                        model.annotations.set(key, xhr.annotations[key]);
                        break;
                }
                
            });
        }
        return model;
    }

    // The adds all the final component values before a post back to the engine
    parseRequestXHR(xhr: any) {
        this.selectedOutcomeId = xhr.mapElementInvokeRequest.selectedOutcomeId;
        xhr.mapElementInvokeRequest.pageRequest.pageComponentInputResponses?.forEach((component: any) => {
            this.components.get(component.pageComponentId).setFinalValue(component);
        });
    }

    // checks for any changes between the initial vale of each field and the final value and gets the changes.
    getChanges() : any[] {
        let changes: ComponentChange[] = []
        this.components.forEach((component: Component) => {
            if(component.hasChanged() === true) {
                changes.push(component.getChange());
            }
        });
        return changes;
    }

    // gets the inner text of a presentation page element by name.
    // allows sending 1-many component names
    getComponentLabel(componentNames: string[]) : string {

        let id: string;
        for(let pos = 0 ; pos < componentNames.length ; pos++) {
            id=this.componentsByName.get(componentNames[pos]);
            if(id) {
                break;
            }
        } 
        
        let label: string;
        if(id) {
            label = this.components.get(id).initialValue;
            var span = document.createElement('span');
            span.innerHTML = label;
            label = span.textContent || span.innerText;
        }
        return label;
    }
}

// represents the page of the model
export class Page {
    
    label: string;

    static parseModel(model: any) : Page{
        let page: Page = new Page();
        page.label = model.label;
        return page;
    }
}

// represents the Flow map element
export class MapElement {
    id: string;
    developerName: string;
    label: string;

    static parseModel(model: any) : MapElement{
        let mapElement: MapElement = new MapElement();
        mapElement.id = model.mapElementId;
        mapElement.developerName = model.developerName;
        mapElement.label = model.label;
        return mapElement;
    }
}

// represents an outcome for the map element
export class Outcome {
    id: string;
    developerName: string;
    label: string;
    isBulkAction: boolean;
    isOut: boolean;
    pageActionBindingType: string;
    order: number;

    static parseModel(model: any) : Outcome{
        let outcome: Outcome = new Outcome();
        outcome.id = model.id;
        outcome.developerName = model.developerName;
        outcome.label = model.label;
        outcome.isBulkAction = model.isBulkAction;
        outcome.isOut = model.isOut;
        outcome.pageActionBindingType = model.pageActionBindingType;
        outcome.order = model.order;

        return outcome;
    }
}

// a wrapper to hold a component / field and its old and new value
export class ComponentChange {
    id: string;
    developerName: string;
    label: string;
    oldValue: any;
    newValue: any;

    constructor(id: string, developerName: string, label: string, oldValue: any, newValue: any) {
        this.id = id;
        this.developerName = developerName;
        this.label = label;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
}

// represents a page component and it's associated value, old and new
export class Component {
    type: string;
    id: string;
    developerName: string;
    label: string;
    initialValue: any;
    finalValue: any;
    contentType: string;
    componentType: string;
    

    static parseModel(model: any) : Component {
        let component: Component = new Component();
        component.type = model.componentType;
        component.id = model.id;
        component.developerName = model.developerName;
        component.label = model.label;
        component.contentType = model.contentType;
        component.componentType = model.componentType;
        return component;
    }

    // based on the component type we get the value from a different part of the provided xhr JSON
    calculateValue(model: any) : any {
        switch(this.componentType) {
            case "input":
                switch (this.contentType) {
                    case "ContentString":
                    case "ContentDateTime":
                    case "ContentNumber":
                        return model.contentValue;
                    
                    default: 
                        return model.contentValue;
                }


            case "presentation" :
                return model.content;

            case "select":
            case "radio":
                let val: any;
                model.objectData.forEach((option: any) => {
                    if(option.isSelected === true) {
                        val = option.properties[0].contentValue;
                    }
                });
                return val;
            
            case "checkbox":
            case "toggle":
                if(!model.contentValue) {
                    return "False";
                }
                else {
                    return (model.contentValue.toString().toLowerCase() === "true" ? "True" : "False");
                }
                
            
            case "textarea":
                return model.contentValue;
                
        }
    }

    // sets the old value
    setInitialValue(model: any) {
        this.initialValue = this.calculateValue(model);
    }

    // sets the new value
    setFinalValue(model: any) {
        this.finalValue = this.calculateValue(model);
    }

    // has this component's value changed?
    hasChanged() : boolean {
        switch(this.componentType) {
            case "input":
            case "select":
            case "radio":
            case "checkbox":
            case "toggle":
            case "textarea":
                if((this.initialValue || "") !== (this.finalValue || "")) {
                    return true;
                }
                else {
                    return false;
                } 
            
            default:
                return false;
        }
        
    }
    
    // get the component's value change
    getChange() : ComponentChange {
        let oldVal: any = this.initialValue || "";
        let newVal: any= this.finalValue || "";
        return new ComponentChange(this.id, this.developerName, this.label, oldVal, newVal);
    }
}

// represents the current user in flow
export class User {
    brand: string;
    country: string;
    directoryId: string;
    directoryName: string;
    email: string;
    firstName: string;
    groups: string[];
    id: string;
    ipAddress: string;
    language: string;
    lastName: string;
    location: string;
    primaryGroupId: string;
    primaryGroupName: string;
    roleId: string;
    roleName: string;
    status: string;
    userName: string;

    // constructs the user object from the REST api call JSON
    static parseModel(model: any) : User {
        let user: User = new User();
        let props: Map<string,any> = new Map();
        model.properties.forEach((prop: any) => {
            props.set(prop.developerName,prop.contentValue);
        });

        user.brand = props.get("Brand");
        user.country = props.get("Country");
        user.directoryId = props.get("Directory Id");
        user.directoryName = props.get("Directory Name");
        user.email = props.get("Email");
        user.firstName = props.get("First Name");
        //user.groups = props.get("Directory Id");
        user.id = props.get("User ID");
        user.ipAddress = props.get("IP Address");
        user.language = props.get("Language");
        user.lastName = props.get("Last Name");
        user.location = props.get("Location");
        user.primaryGroupId = props.get("Primary Group Id");
        user.primaryGroupName = props.get("Primary Group Name");
        user.roleId = props.get("Role Id");
        user.roleName = props.get("Role Name");
        user.status = props.get("Status");
        user.userName = props.get("Username");
        return user;
    }
}


// the class used to pass to the audit api
export enum eAuditEventType {
    pageView,
    pageLeave,
    flowEnd,
    flowJoined
}

export class AnalyticsEvent {
    userEmail: string;
    userName: string;
    userFirstName: string;
    userLastName: string;
    stateId: string;
    joinUri: string;
    flowId: string;
    flowVersion: string;
    flowName: string;
    parentFlowId: string;
    parentFlowVersion: string;
    parentFlowName: string;
    eventType: eAuditEventType;
    eventDate: Date;
    eventDateUTC: Date;
    pageName: string;
    pageLabel: string;
    stepName: string;
    stepLabel: string;
    questionLabel: string
    outcomeName: string;
    outcomeLabel: string;
    
} 



