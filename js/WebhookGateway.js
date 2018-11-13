function OnNewEvent(objevent)
{
    var strS4WebhookURL = "https://connect.signl4.com/webhook/";
    var strS4TeamSecret = "";

    var strXml = objevent.GetXml();
    EAScriptHost.LogDebug("XML");
    EAScriptHost.LogDebug(strXml);

    var objXML = new ActiveXObject("Msxml2.DOMDocument.3.0");
    if (!objXML.loadXML(strXml))
    {
        EAScriptHost.LogError("Error parsing the folling XML: " + strXml);
    }
    

    var strServiceFrom = objXML.selectSingleNode("//mm_message/mm_header").getAttribute("service_from");
    
    EAScriptHost.LogDebug("Service_from brefore trim end: " + strServiceFrom);
    strServiceFrom = strServiceFrom.replace(/\/async$/g, "");
    EAScriptHost.LogDebug("Service_from after trim end: " + strServiceFrom);

    var arraySrvFromParts = strServiceFrom.split("/");

    for (var i=0; i < arraySrvFromParts.length; i++) 
    {
        if (arraySrvFromParts[i].indexOf("SIGNL4_") == -1)
        {
            continue;
        }

        // Found the name of the REST API client
        //
        arraySrvNameParts = strServiceFrom.split('_');
        if (arraySrvNameParts.length != 3)
        {
            EAScriptHost.LogDebug("REST API Client Source has wrong name format. Expected format is SIGNL4_AnyTeamName_<S4TeamSecret in Base64>. Example: SIGNL4_Finance_dsdA7ds==. Detected name: " + strServiceFrom);
        }

        strS4TeamSecret = decodeBase64String(arraySrvNameParts[2]);
        EAScriptHost.LogDebug("Decoded S4 Team Secret: " + strS4TeamSecret);
        break;
    }



    //
    // Build nice JSON
    //
    var nodeEvent = objXML.selectSingleNode("//mm_message/mm_event");
    var strJSON = "{";
    var arrayParametersToRemove = ["EAEventIsNew"];

    for (var i=0; i < nodeEvent.childNodes.length; i++) 
    {
        var nodeEventParam = nodeEvent.childNodes.item(i);
        var nodeParamToInclude = nodeEventParam;

        // Remove internal EA params
        //
        for (var j=0; j < arrayParametersToRemove.length; j++) 
        {
            if (arrayParametersToRemove[j] == nodeEventParam.getAttribute("name"))
            {
                nodeParamToInclude = null;
                break;
            }
        }

        if (nodeParamToInclude == null)
        {
            continue;
        }

        if (strJSON.length > 1)
        {
            strJSON += ", ";   
        }

        strParamName = nodeParamToInclude.getAttribute("name");

        strJSON += "\"" + strParamName + "\": \"" + nodeParamToInclude.text + "\"";
    }

    strJSON += "}";

    EAScriptHost.LogDebug("Sending folloing JSON to S4 team: " + strS4TeamSecret);
    EAScriptHost.LogDebug(strJSON);


    // Send the stuff
    //
    var objXmlHTTP = new ActiveXObject("Msxml2.XMLHTTP.6.0");
    objXmlHTTP.open("POST", strS4WebhookURL+ strS4TeamSecret, false);
    objXmlHTTP.setRequestHeader("Content-Type", "application/json");  
    objXmlHTTP.send(strJSON);

    EAScriptHost.LogDebug("Response text: "+ objXmlHTTP.responseText);
    EAScriptHost.LogDebug("Response status code: " + objXmlHTTP.status);


    delete objXML;
    objXML = null;
    delete objXmlHTTP;
    objXmlHTTP = null;
    
}



function decodeBase64String(strBase64String)
{
    var objXML = new ActiveXObject("Msxml2.DOMDocument.3.0");
    var objDocElem = objXML.createElement("Base64Data");
    objDocElem.dataType = "bin.base64";
    
    objDocElem.text = strBase64String;
    
    var objStream = new ActiveXObject("ADODB.Stream");
    objStream.Type = 1; //Specify stream type - we want To save binary data.
    // Open the stream And write binary data To the object
    objStream.Open();
    objStream.Write(objDocElem.nodeTypedValue);

    //Change stream type To text/string
    objStream.Position = 0;
    objStream.Type = 2;
    objStream.Charset = "us-ascii"

    //'Open the stream And get text/string data from the object
    var strText = objStream.ReadText();

    delete objXML;
    objXML = null;
    delete objStream;
    objStream = null;

    return strText;
}