
declare const manywho: any;
declare const analytics: any;

// a set of static methods to aid in the interaction with Flow and to call the auditing api
export default class Services {

    // generic request util to hit the flow API and return the JSON output 
    static async callRequest(tenantId: string, stateId: string, url: string, method: string, data: any): Promise<any> {
        let results: any;
        const request: RequestInit = {};
        let flowKey: string = manywho.utils.getFlowKey(tenantId, "","",stateId);
        const token: string = manywho.state.getAuthenticationToken(flowKey);

        request.method = method;  
        request.headers = {
            "Content-Type": "application/json",
            "ManyWhoTenant": tenantId
        };
        if(token) {
            request.headers.Authorization = token;
        }
        request.credentials= "same-origin";

        if(method === "POST" || method === "PUT") {
            request.body = JSON.stringify(data);
        }
            
        let response = await fetch(url, request);
        //let body: string =  await this.getResultBodyTextxx(response);
        if(response.status === 200) {
            results = await response.json();
        }
        else {
            const errorText = await response.text();
            console.log("Fetch Failed - " + errorText);
        }

        return results;
    }

    // method to get current Flow state for a given state id
    static async getModel(tenantId: string, stateId: string) : Promise<any> {
        //return new Promise(async (resolve) => {
        let flowKey: string = manywho.utils.getFlowKey(tenantId, "","",stateId);
        const token: string = manywho.state.getAuthenticationToken(flowKey);

        let baseUrl: string = "";
        if((!manywho.settings.global('platform.uri')) && (manywho.settings.global('platform.uri').length <= 0)) {
            baseUrl = window.location.origin || 'https://flow.manywho.com';
        }
        else {
            baseUrl = manywho.settings.global('platform.uri');
        }
        
        let url = `${baseUrl}/api/run/1/state/${stateId}`;
        let results: any = await Services.callRequest(tenantId,stateId,url,"GET",undefined);
                
        return results;
    }

    // method to get current Flow state for a given state id
    static async getFlowDetails(tenantId: string, stateId: string, flowId: string) : Promise<any> {
        //return new Promise(async (resolve) => {
        let flowKey: string = manywho.utils.getFlowKey(tenantId, "","",stateId);
        const token: string = manywho.state.getAuthenticationToken(flowKey);

        let baseUrl: string = "";
        if((!manywho.settings.global('platform.uri')) && (manywho.settings.global('platform.uri').length <= 0)) {
            baseUrl = window.location.origin || 'https://flow.manywho.com';
        }
        else {
            baseUrl = manywho.settings.global('platform.uri');
        }
        let url = `${baseUrl}/api/run/1/flow/${flowId}`;
        let results: any = await Services.callRequest(tenantId,stateId,url,"GET",undefined);
                
        return results;
    }

    // method to get the current user from the flow state
    static async getUser(tenantId: string, stateId: string) : Promise<any> {
        //return new Promise(async (resolve) => {
        let flowKey: string = manywho.utils.getFlowKey(tenantId, "","",stateId);
        const token: string = manywho.state.getAuthenticationToken(flowKey);

        let baseUrl: string = "";
        if((!manywho.settings.global('platform.uri')) && (manywho.settings.global('platform.uri').length <= 0)) {
            baseUrl = window.location.origin || 'https://flow.manywho.com';
        }
        else {
            baseUrl = manywho.settings.global('platform.uri');
        }

        let url = `${baseUrl}/api/run/1/state/${stateId}/values/03dc41dd-1c6b-4b33-bf61-cbd1d0778fff`;
        
        let results: any = await Services.callRequest(tenantId,stateId,url,"GET",undefined);
                
        return results;
    }

}