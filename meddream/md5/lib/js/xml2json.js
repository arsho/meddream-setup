/*
 Copyright 2011 Abdulla Abdurakhmanov
 Original sources are available at https://code.google.com/p/x2js/

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

function X2JS() {

	var DOMNodeTypes = {
		ELEMENT_NODE : 1,
		TEXT_NODE    : 3,
		DOCUMENT_NODE : 9
	}
	
	function getNodeLocalName( node ) {
		var nodeLocalName = node.localName;			
		if(nodeLocalName == null) // Yeah, this is IE!! 
			nodeLocalName = node.baseName;
		if(nodeLocalName == null || nodeLocalName=="") // =="" is IE too
			nodeLocalName = node.nodeName;
		return nodeLocalName;
	}
	
	function getNodePrefix(node) {
		return node.prefix;
	}

	function parseDOMChildren( node ) {
		if(node.nodeType == DOMNodeTypes.DOCUMENT_NODE) {
			var result = new Object;
			var child = node.firstChild; 
			var childName = getNodeLocalName(child);
			result[childName] = parseDOMChildren(child);
			return result;
		}
		else
		if(node.nodeType == DOMNodeTypes.ELEMENT_NODE) {
			var result = new Object;
			result.__cnt=0;
			
			var nodeChildren = node.childNodes;
			
			// Children nodes
			for(var cidx=0; cidx <nodeChildren.length; cidx++) {
				var child = nodeChildren.item(cidx); // nodeChildren[cidx];
				var childName = getNodeLocalName(child);
				
				result.__cnt++;
				if(result[childName] == null) {
					result[childName] = parseDOMChildren(child);
					result[childName+"_asArray"] = new Array(1);
					result[childName+"_asArray"][0] = result[childName];
				}
				else {
					if(result[childName] != null) {
						if( !(result[childName] instanceof Array)) {
							var tmpObj = result[childName];
							result[childName] = new Array(nodeChildren.length);
							result[childName][0] = tmpObj;
							
							result[childName+"_asArray"] = result[childName];
						}
					}
					var aridx = 0;
					while(result[childName][aridx]!=null) aridx++;
					(result[childName])[aridx] = parseDOMChildren(child);
				}			
			}
			
			// Attributes
			for(var aidx=0; aidx <node.attributes.length; aidx++) {
				var attr = node.attributes.item(aidx); // [aidx];
				result.__cnt++;
				result["_"+attr.name]=attr.value;
			}
			
			// Node namespace prefix
			var nodePrefix = getNodePrefix(node);
			if(nodePrefix!=null && nodePrefix!="") {
				result.__cnt++;
				result.__prefix=nodePrefix;
			}
			
			if( result.__cnt == 1 && result["#text"]!=null  ) {
				result = result["#text"];
			} 
			
			if(result["#text"]!=null) {
				result.__text = result["#text"];
				result["#text"] = null;
				result.toString = function() {
					return this.__text;
				}
			}
			return result;
		}
		else
		if(node.nodeType == DOMNodeTypes.TEXT_NODE) {
			return node.nodeValue;
		}	
	}
	
	function startTag(jsonObj, element, attrList, closed) {
		var resultStr = "<"+ (jsonObj.__prefix!=null? (jsonObj.__prefix+":"):"") + element;
		if(attrList!=null) {
			for(var aidx = 0; aidx < attrList.length; aidx++) {
				var attrName = attrList[aidx];
				var attrVal = jsonObj[attrName];
				resultStr+=" "+attrName.substr(1)+"='"+attrVal+"'";
			}
		}
		if(!closed)
			resultStr+=">";
		else
			resultStr+="/>";
		return resultStr;
	}
	
	function endTag(jsonObj,elementName) {
		return "</"+ (jsonObj.__prefix!=null? (jsonObj.__prefix+":"):"")+elementName+">";
	}
	
	function endsWith(str, suffix) {
	    return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}
	
	function parseJSONTextObject ( jsonTxtObj ) {
		var result ="";
		if(jsonTxtObj.__text!=null) {
			result+=jsonTxtObj.__text;
		}
		else {
			result+=jsonTxtObj;
		}
		return result;
	}
	
	function parseJSONObject ( jsonObj ) {
		var result = "";	
		
		for( var it in jsonObj  ) {
						
			if(endsWith(it.toString(),("_asArray")) || it.toString()[0]=="_")
				continue;
			
			var subObj = jsonObj[it];						
			
			var attrList = [];
			for( var ait in subObj  ) {
				if(ait.toString()[0]=="_" && ait.toString()[1]!="_") {
					attrList.push(ait);
				}
			}
			
			if(subObj!=null && subObj instanceof Object && subObj.__text==null) {
				
				if(subObj instanceof Array) {
					var arrayOfObjects = true;
					if(subObj.length > 0) {
						arrayOfObjects = subObj[0] instanceof Object;
					}
					else {
						result+=startTag(subObj, it, attrList, true);
					}
						
					for(var arIdx = 0; arIdx < subObj.length; arIdx++) {						
						if(arrayOfObjects)
							result+=parseJSONObject(subObj[arIdx]);
						else {
							result+=startTag(subObj, it, attrList, false);
							result+=parseJSONTextObject(subObj[arIdx]);
							result+=endTag(subObj,it);
						}
					}
				}
				else {
					result+=startTag(subObj, it, attrList, false);
					result+=parseJSONObject(subObj);
					result+=endTag(subObj,it);
				}
			}
			else {
				result+=startTag(subObj, it, attrList, false);
				result+=parseJSONTextObject(subObj);
				result+=endTag(subObj,it);
			}						
		}
		
		return result;
	}
	
	this.parseXmlString = function(xmlDocStr) {
		var xmlDoc;
		if (window.DOMParser) {
			var parser=new DOMParser();			
			xmlDoc = parser.parseFromString( xmlDocStr, "text/xml" );
		}
		else {
			// IE :(
			xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
			xmlDoc.async="false";
			xmlDoc.loadXML(xmlDocStr);
		}
		return xmlDoc;
	}

	this.xml2json = function (xmlDoc) {
		return parseDOMChildren ( xmlDoc );
	}
	
	this.xml_str2json = function (xmlDocStr) {
		var xmlDoc = this.parseXmlString(xmlDocStr);	
		return this.xml2json(xmlDoc);
	}

	this.json2xml_str = function (jsonObj) {
		return parseJSONObject ( jsonObj );
	}

	this.json2xml = function (jsonObj) {
		var xmlDocStr = this.json2xml_str (jsonObj);
		return this.parseXmlString(xmlDocStr);
	}
}

var x2js = new X2JS();