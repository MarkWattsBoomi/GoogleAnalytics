
This module delivers page moves to google analytics.



## Functionality




## Configuration

To configure the module we simply include the output JavaScript file from this module in the customResources[] tag in the player and add a configuration element to the script section of the player at the begining.

```
<script>
        var culture = "Brand=XL&Country=XL&Language=ES&Variant=XL";
        var analytics = {
            trackingCode: "UA-xxxxxxx-1",
            logDone: true,
            debug: true
        };
        
        
        
        var manywho = {
            cdnUrl: 'https://assets.manywho.com',
            requires: ['core', 'bootstrap3'],
            customResources: [
                'https://files-manywho-com.s3.amazonaws.com/e5b74eba-b103-4e05-b767-xxxxxxxxxx/ga.js'
            ],

            
.....

</script>
```


