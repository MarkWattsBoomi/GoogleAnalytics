
This module delivers audit events to to a specific REST api.



## Functionality

The module attaches itself to the beforeSend and done event handlers of the manywho.settings.initialize() call in the player.

Once attached it captures every leaving and arriving at page events.

It captures the flow state at both points and on leaving compares the original state values to the ones being delivered back to Flow and traps any changes.

The state data, page details, outcome and changes are collected and delivered to a known endpoint REST api for loggin to a database using a fetch() directly from the client.






## Configuration

To configure the module we simply include the output JavaScript file from this module in the customResources[] tag in the player and add a configuration element to the script section of the player at the begining.

```
<script>
    
        var audit = {
            security: "BASIC" / "OAUTH",
            uri: "https://eu.connect.boomi.com/ws/rest/AddAuditEntry",
            debug: true / false,
            logDone: true,
            culture: "Brand=XL&Country=XL&Language=ES&Variant=XL",

            //for basic authentication
            user: "flow@XXXXXXXXXXX.FB69IH",
            password: "xxxxxxxxxxxxxxx-4db9-a1d4-0d8eb59f9d4a",

            //for oAuth authentication
            oAuthUri: "https://apigtwb2cnp.us.dell.com/test/oauth/test123/Oauth",
            clientID: "xxxxxxxxxxxxxxxxxxxxxx",
            clientSecret: "xxxxxxxxxxxxxxx",
        };
        
        
        
        var manywho = {
            cdnUrl: 'https://assets.manywho.com',
            requires: ['core', 'bootstrap3'],
            customResources: [
                'https://files-manywho-com.s3.amazonaws.com/e5b74eba-b103-4e05-b767-xxxxxxxxxx/audit.js'
            ],

            .......
            // this allows us to pass in extra values - needed when SSO is enabled to avoid the loss of query params after the sso redirect
            var options = {
                   ........
                    annotations: {
                        "Blob": queryParameters['Blob'] != null ? queryParameters['Blob'] : 'Flow needs a Blob',
                        "FlowId": queryParameters['flow-id'] != null ? queryParameters['flow-id'] : 'Flow needs a flow id',
                    },
                    ..........
                };
.....

</script>
```

## Audit Service

The audit service will be delivered a specific JSON payload like this: -

```
{
  "stateId": "xxxxxx-52e0-41f5-9cc1-4a8ab082caee",
  "parentFlowId": "xxx",
  "parentFlowVersion": "xxx",
  "parentFlowName": "dev name",
  "flowId": "xxx",
  "flowVersion": "xxx",
  "flowName": "dev name",
  "joinUri": "https:// ......",
  "userId": "admin@manywho.com",
  "eventDate": "2021-03-24T10:11:13.528Z",
  "eventDateUTC": "2021-03-24T10:11:13.528Z",
  "pageName": "9002.12 Perform a hard reset, reconnect Mouse batteries, Wireless/BT Receivers and test",
  "pageLabel": "9002.12 Perform a hard reset, reconnect Mouse batteries, Wireless/BT Receivers and test",
  "questionLabel": "Is the issue resolved after performing Hard reset?",
  "outcomeName": "Is the issue resolved after performing Hard reset?: No",
  "outcomeLabel": "No",
  "fields": [
    {
      "fieldName": "",
      "fieldLabel": "",
      "oldValue": "",
      "newValue": ""
    }
  ],
  <annotations>
}

Note: any annotations passed to the flow will be added and attributes using their exact name and value e.g. Blob=xxxx
```

Ensure it is accessible from the client and has CORS permissions as appropriate.

How the data is then stored is optional.

There is an example Boomi API process available which writes one row per changed field, or just one row if nothing chaged, to a postgres table.


