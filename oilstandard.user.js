// ==UserScript==
// @name			Oil Standard
// @namespace		http://www.turbulence.org/Works/oilstandard
// @description		Converts all USD currency information into barrels of crude oil
// @version        	0.2.2
// @date           	2007-10-18
// @creator        	Michael Mandiberg (Michael [at] Mandiberg [dot] com)
// @include			*
// @exclude			http://mail.google.com/*
// ==/UserScript==
//
// --------------------------------------------------------------------
//
// This is a Greasemonkey user script.
//
// To install, you need Greasemonkey: http://greasemonkey.mozdev.org/
// Then restart Firefox and revisit this script.
// Under Tools, there will be a new menu item to "Install User Script".
// Accept the default configuration and install.
//
// To uninstall, go to Tools/Manage User Scripts,
// select "Oil Standard", and click Uninstall.
//
// --------------------------------------------------------------------


/*

#################
Oil Standard v0.2
#################

XPI GUID {5a4f2051-20a2-42ad-a8bf-d2a23abe24e8}

This is a Greasemonkey script that changes all prices on a web page 
into the equivalent value in barrels of crude oil.

A Play on words: Gold Standard... Standard Oil... 

Written by Michael Mandiberg (Michael [at] Mandiberg [dot] com)

Lives at http://www.turbulence.org/Works/oilstandard

Oil Standard is a 2006 commission of New Radio and Performing Arts, Inc., 
(aka Ether-Ore) for its Turbulence web site. It was made possible with 
funding from the Jerome Foundation and New York City Department of Cultural
Affairs.

###################
BARRELS AND GALLONS
###################

1 Barrel = 42 Gallons

############
INSTRUCTIONS
############

0. Read the entire instructions before installing

1. If you do not have the Firefox browser, you will need to download and 
install it from: http://www.mozilla.com/firefox/

2. If you do not have the Greasemonkey extension installed, you will need 
to download and install it from here: http://greasemonkey.mozdev.org/

What is Greasemonkey? Greasemonkey is an official extension for Mozilla 
Firefox that allows the user to change the look, content, or function of 
a webpage, by writing client side DHTML into a page. The Greasemonkey 
extension makes Oil Standard possible. You can find out more here

2.5 Restart Firefox (Quit the application and open it again)

3. Click on the link below to go to the Oil Standard script. You should 
see an "Install" button on the upper right of your browser window. Click 
install.

Oil Standard Script: http://turbulence.org/Works/oilstandard/oilstandard.user.js

3.5 Browsing pages other than Oil Standard: Pages with prices on them!
For Mac OS X, you may need to refresh the pages you are browsing 
(sometimes you need to do this twice) For Win XP, and Linux you may also 
need to restart Firefox (again!)

4. The first page you browse after installing the script will ask you 
whether you want to see prices in Dollars-and-Oil, or Oil-Only. Click 
"cancel" for Oil-Only, otherwise, click "OK" or hit enter for Dollars-and-Oil.

Reset Preferences:

Too reset the Dollars-and-Oil, or Oil-Only preference, please visit the 
Reset Preferences page, where you will be prompted again to choose.

Disable the script temporarily:

Disable the script via the Greasemonkey menu in the bottom right corner 
of your browser. See the little Greasemonkey: clicking on the monkey once 
will disable Greasemonkey (clicking again, will re-enable it.)

De-Installation Instructions:

Remove the script by right-clicking (mac or pc)/control-clicking (mac) on 
the little monkey, and selecting "Manage User Scripts." From here you can 
remove the script.

###########
Change Log:
###########

v0.2	Oil price data source went offline; switched to different source
		Added new month calculation to make sure the script is using the 
			60-90 futures price

#############
Known Issues:
#############

When there are mulitple Million/Billion prices in succession, it ignores 
every other million suffix.


####################
Future Improvements:
####################

Set up the data retreivals to pull every hour, rather than every page load

Add other currencies in addition to USD


*/


(function () {


oilEntriesArray = new Array()
oilLinksArray = new Array()

// set the styles
addGlobalStyle('.oillink { color: #996633 ! important; }');
addGlobalStyle('.updown1 { color: #009900 ! important; }');
addGlobalStyle('.updown0 { color: #CC3300 ! important; }');


addGlobalStyle('body div#toolTip { position:absolute;z-index:1000;width:220px;background:#000;border:2px double #fff;text-align:left;padding:5px;min-height:1em;-moz-border-radius:5px; }');
addGlobalStyle('body div#toolTip p { margin:0;padding:0;color:#fff;font:11px/12px verdana,arial,sans-serif; }');
addGlobalStyle('body div#toolTip p em { display:block;margin-top:3px;color:#f60;font-style:normal;font-weight:bold; }');
addGlobalStyle('body div#toolTip p em span { font-weight:bold;color:#fff; }');

	getOnlyOil()
	getOilPrices();

	getEachNews(0,3,'http://rss.news.yahoo.com/rss/energy');
	getEachNews(1,3,'http://www.rigzone.com/news/rss/rigzone_latest.aspx');
	getEachNews(2,3,'http://app.feeddigest.com/digest3/NGHRPHO7FS.rss');

    const HundredsRegex = /\$\d\d?d?\,\d\d\d\.?\d?\d?\b/ig;
    const CurrencyRegex = /\$\d+\,?\d*\.?\d* ?.?i?l?l?i?o?n?\b/ig;
    const MillionsRegex = /million/ig;
    const BillionsRegex = /\$\d\d?d?\.?\d?\d? billion\b/ig;


   // tags to scan for currency values
   var allowedParents = [
       "abbr","a", "acronym", "address", "applet", "b", "bdo", "big", "blockquote", "body",
       "caption", "center", "cite", "code", "dd", "del", "div", "dfn", "dt", "em",
       "fieldset", "font", "form", "h1", "h2", "h3", "h4", "h5", "h6", "i", "iframe",
       "ins", "kdb", "li", "object", "pre", "p", "q", "samp", "small", "span", "strike",
       "s", "strong", "sub", "sup", "td", "th", "tt", "u", "var"
       ];

   var xpath = "//text()[(parent::" + allowedParents.join(" or parent::") + ")" +
                               //" and contains(translate(., 'HTTP', 'http'), 'http')" +
                               "]";

   var candidates = document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
   var loopcounter = 0;
   for (var cand = null, i = 0; (cand = candidates.snapshotItem(i)); i++) {

       // Find and replace all instances of currency
       if (CurrencyRegex.test(cand.nodeValue)) {
           var span = document.createElement("span");
           var source = cand.nodeValue;
           cand.parentNode.replaceChild(span, cand);

           CurrencyRegex.lastIndex = 0;
           for (var match = null, lastLastIndex = 0; (match = CurrencyRegex.exec(source)); ) {
           //    alert(match);
               if (MillionsRegex.test(match)) {
               		var type = 1;
               		findAndReplace(type, match)
               
               } else if (BillionsRegex.test(match)) {
               		var type = 2;
               		findAndReplace(type, match)
               
               
               } else if (HundredsRegex.test(match)) {
               		var type = 0;
               		findAndReplace(type, match)
               
               } else {
               		var type = 0;
               		findAndReplace(type, match)
                              
               }
           }
           span.appendChild(document.createTextNode(source.substring(lastLastIndex)));
           span.normalize();
           loopcounter++;
      }

   }


function findAndReplace(type, match) 
{	//1

       // Find and replace all instances of currency
               span.appendChild(document.createTextNode(source.substring(lastLastIndex, match.index)));

			   //assign gallon units e.g. millions billions
			   var units=new Array(" Barrels Oil"," Million Barrels Oil"," Billion Barrels Oil");
			   var updownarray =new Array("data:image/gif,GIF89a%0A%00%0E%00%91%03%00%CC%88r%99%00%00%CC3%00%FF%FF%FF!%F9%04%01%00%00%03%00%2C%00%00%00%00%0A%00%0E%00%00%02%1A%9C%8F%A9%CB%0B%01%15%10%22Hj%D3%AC%97%9BM%85%1C%18f%03i~%98%93%16%00%3B","data:image/gif,GIF89a%0A%00%0E%00%A2%00%00%00%99%00%00f%003%993%CC%FF%CC%C0%C0%C0%00%00%00%00%00%00%00%00%00!%F9%04%01%00%00%04%00%2C%00%00%00%00%0A%00%0E%00%40%03%1FH%BA%BC%03%204%F2%84l%23%E8%C9)%FC%16%F3D%5D%99M%23%10z%1Fx%B1%AF%03%C5e%02%00%3B");
			   //var units = ' Gallons Crude Oil)';

			   var totalrate = GM_getValue("barrelprice");
  			   var rate = totalrate;
			   var totalchange = GM_getValue("changebarrel");
				totalchange = totalchange.replace ("(", "");
				totalchange = totalchange.replace (/\)/g,"");
				totalchange = totalchange.replace (/\+/g,"");
				totalchange = totalchange.replace (/\-/g,"");
 			   totalchange = parseFloat(totalchange);

			   var ratechange = totalchange;
			   var updown = GM_getValue("increase");
			   var amt = match[0].replace ("$", "");
			   var amt = amt.replace (",", "");
			   var converted = parseInt(parseFloat(amt)/rate*100)/100; //approximation to have 2 digits after the .
			   var change = parseInt(ratechange*converted*100)/100; //approximation to have 2 digits after the .
               change += "";
               var txtchange = change.replace ("0.",".");
               var updownstyle = "updown" + updown;
               var url = GM_getValue("linkkey" +loopcounter);
               var title = GM_getValue("entkey" +loopcounter);
               var origtext = match[0] +' ';
               var linktext = converted + units[type];
               var orig = document.createElement("span");
               var onlyOil = GM_getValue('onlyOil');
               
			if (onlyOil != "yes"){
               orig.appendChild(document.createTextNode(origtext));
               span.appendChild(orig);

               var a = document.createElement("a");
               a.setAttribute("class", "oillink");
                a.setAttribute("href", url);
               a.setAttribute("title", title);
               a.appendChild(document.createTextNode('('));
               span.appendChild(a);
            }

              var drop = document.createElement("img");
               drop.setAttribute("src", "data:image/gif,GIF89a%06%00%0D%00%C4%1F%00%9Bu%25%C2%AAz%B4%97%5C%8Fd%0B%C6%B0%83%B7%9Cc%C0%A9w%BF%A7u%9Cv(%E1%D6%BE%F4%F0%E7%F8%F6%F0%90f%0E%F0%EA%DF%D7%C8%A9%9As%22%E8%DF%CD%C8%B2%86%A1%7D3%BA%9Fh%B8%9De%97o%1D%CF%BC%95%98q%1F%BA%A0i%EF%E9%DC%FE%FD%FC%BB%A1l%C5%AF%81%8C%60%05%FF%FF%FF%FF%FF%FF!%F9%04%01%00%00%1F%00%2C%00%00%00%00%06%00%0D%00%00%055%E0%F7%25%99(Z%8E%F9%15%81%FAH%26%D4u%E5%87!%1D%F6-%14%D7%0D%8AHc33%14%3C%C4%CE%C5%E0%F1u%18%13%8Fc%86%20%08%003%8B%E6P%B9p4!%00%3B");
               drop.setAttribute("border", 0);
               span.appendChild(drop);

               var a = document.createElement("a");
               a.setAttribute("class", "oillink");
               a.setAttribute("href", url);
               a.setAttribute("title", title);
               a.appendChild(document.createTextNode(linktext));
               span.appendChild(a);

/*               var arrow = document.createElement("img");
               arrow.setAttribute("src", updownarray[updown]);
               arrow.setAttribute("border", 0);
               span.appendChild(arrow);

               var a = document.createElement("a");
               a.setAttribute("class", updownstyle);
               a.setAttribute("href", url);
               a.setAttribute("title", title);
               a.appendChild(document.createTextNode(txtchange));
               span.appendChild(a);
*/
			if (onlyOil != "yes"){
               var a = document.createElement("a");
               a.setAttribute("class", "oillink");
               a.setAttribute("href", url);
               a.setAttribute("title", title);
               a.appendChild(document.createTextNode(') '));
               span.appendChild(a);
            }


               lastLastIndex = CurrencyRegex.lastIndex;

}	//1
//end find and replace subroutine

addTooltip()

})();

//end main function




// turn the links into an oil color

function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}


function getOilPrices() {
// get oil price from rss feed of yahoo finance prices 
// removed july 28 06, as xanadb.com went offline. 
/*
GM_xmlhttpRequest({
    method: 'GET',
    url: 'http://www.xanadb.com/ticker/SCJ06.NYM',
    headers: {
        'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey/0.3',
        'Accept': 'application/atom+xml,application/xml,text/xml',
    },
    onload: function(responseDetails) {
        var parser = new DOMParser();
        var dom = parser.parseFromString(responseDetails.responseText,
            "application/xml");
        var entries = dom.getElementsByTagName('item');
        var title;
        entriesArray = new Array()
        for (var i = 0; i < entries.length; i++) {
            entriesArray[i] = entries[i].getElementsByTagName('title')[0].textContent;
            var str = entriesArray[0];
            //var company = "Digital";
        	pricearray = new Array()
			pricearray = str.split(/ /)
			if (!GM_xmlhttpRequest) {
    			alert('Please upgrade to the latest version of Greasemonkey.');
    			return;
			} else {
				GM_setValue("barrelprice", pricearray[1]);
				GM_setValue("changebarrel", pricearray[2]);
				var rawratechange = pricearray[2].replace ("(", "");
		//		alert(rawratechange);
				rawratechange = rawratechange.replace (/\)/g,"");
				if (rawratechange[0] == '+') {
					var increase = 0;
					GM_setValue("increase", increase);
					rawratechange = parseFloat(rawratechange.replace ("+", ""));
					
				} else {
					increase = 1;
					GM_setValue("increase", increase);
					rawratechange = parseFloat(rawratechange.replace ("-", ""));
				}	
		//		GM_setValue("changebarrel", rawratechange);
		//		alert('get feed' + rawratechange);
 		//		alert(rawratechange);
		//		GM_setValue("barrelpricechange", rawratechange);
		//		 var testchange = GM_getValue("barrelpricechange");
		//		 alert(testchange);

			}
        }
    }
});
*/

// attempt to get oil prices directly from yahoo finance
var monthCode = new Array;
monthCode[0] = "F";
monthCode[1] = "G";
monthCode[2] = "H";
monthCode[3] = "J";
monthCode[4] = "K";
monthCode[5] = "M";
monthCode[6] = "N";
monthCode[7] = "Q";
monthCode[8] = "U";
monthCode[9] = "V";
monthCode[10] = "X";
monthCode[11] = "Z";

var mmyy = new Date();
var mm = mmyy.getMonth();
var yy = mmyy.getFullYear();
yy -= 2000;

if(mm >= 9){
	yy++;
}

/*
//old code that needed to deal with months 
if(mm == 10){
	mm = 0;
	yy++;
}else if(mm == 11){
	mm = 1;
	yy++;
}else if(mm == 12){
	yy++;
}else {	
	mm+=2;
	alert(yy);
}
*/

/*if(mm.length == 1){
	mm = "0"+mm;
	alert(mm);
}*/

var m = monthCode[mm];
//alert(m + ' ' + yy);
GM_xmlhttpRequest({
    method: 'GET',
// in 2010 change code so that it removes the added zero
//url is http://finance.yahoo.com/q?s=CLN07.NYM
	url: 'http://download.finance.yahoo.com/d/quotes.csv?s=CLN'+yy+'.NYM&f=sl1d1t1c1ohgv&e=.csv',
//	url: 'http://download.finance.yahoo.com/d/quotes.csv?s=CLN0'+m+'.'+yy+'.NYM&f=sl1d1t1c1ohgv&e=.csv',
//    url: 'http://download.finance.yahoo.com/d/quotes.csv?s=CLN07.NYM&f=sl1d1t1c1ohgv&e=.csv',
    headers: {
        'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey/0.3',
  //      'Accept': 'application/atom+xml,application/xml,text/xml',
    },
    onload: function(responseDetails) {
//				alert(responseDetails.responseText);
		responsearray = new Array();
		responsearray = responseDetails.responseText.split(/,/);
			if (!GM_xmlhttpRequest) {
    			alert('Please upgrade to the latest version of Greasemonkey.');
    			return;
			} else {
			//	alert(responsearray[4]);
				GM_setValue("barrelprice", responsearray[1]);
				GM_setValue("changebarrel", responsearray[4]);
				var rawratechange = responsearray[4].replace ("(", "");
				rawratechange = rawratechange.replace (/\)/g,"");
				if (rawratechange[0] == '+') {
					var increase = 0;
					GM_setValue("increase", increase);
					rawratechange = parseFloat(rawratechange.replace ("+", ""));
					
				} else {
					increase = 1;
					GM_setValue("increase", increase);
					rawratechange = parseFloat(rawratechange.replace ("-", ""));
				}	

			}
    
    }
    
});



}


// get oil news RSS feed

function getEachNews(startnumber, numberFeeds, feedlocation){
//get yahoo news yahoo will start at 0, 3, 6, etc
GM_xmlhttpRequest({
    method: 'GET',
    url: feedlocation,
    headers: {
        'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey/0.3',
        'Accept': 'application/atom+xml,application/xml,text/xml',
    },
    onload: function(responseDetails) {
        var parser = new DOMParser();
        var dom = parser.parseFromString(responseDetails.responseText,
            "application/xml");
        var entries = dom.getElementsByTagName('item');
        var title;
        var link;
        var keeptrack = startnumber;
        for (var i = 0; i < entries.length; i++) {
            oilEntriesArray[i] = entries[i].getElementsByTagName('title')[0].textContent;
            oilLinksArray[i] = entries[i].getElementsByTagName('link')[0].textContent;
			var linkkey = 'linkkey' + keeptrack;
			GM_setValue(linkkey, oilLinksArray[i]);
			var entkey = 'entkey' + keeptrack;
			GM_setValue(entkey, oilEntriesArray[i]);
			keeptrack = keeptrack + numberFeeds;

        }
    }
});

}//end getEachNews





function getOnlyOil(){

		var reset = window.location.host;
		var reset = reset.replace ("www.", "");
		var reset = reset.replace (" ", "");
		var reset = reset.replace ("/", "");
		var resetPage = 'oilstandard.therealcosts.com';
		
		var onlyOil;
		var onlyPrompt = 'Do you want to see only prices in Oil? \n \nThe default setting is to display the original price, followed by the price in Oil. \n \nIf you want to see ONLY prices in oil, please type "yes." \n\n Leave this empty to default to Dollars and Barrels of Oil.\n \n After clicking, please refresh!';
 //    	var response = confirm(onlyPrompt);
     		// OR var response = window.confirm('Confirm Test: Continue?');
		
/*		if (!(onlyOil = GM_getValue('onlyOil'))) {
     		if (response) {
				alert('response if');
				GM_setValue('onlyOil', "yes");
			}else{
				alert('response else');
				GM_setValue('onlyOil', "no");
			}			
*/

			if (!(onlyOil = GM_getValue('onlyOil')) || reset == resetPage){
			//if (!(onlyOil = GM_getValue('onlyOil')) || resetTitle == pageTitle) {
				respConfirm ();

/*
				onlyOil = prompt(onlyPrompt);
				onlyOil = onlyOil.replace("YES","yes");
				onlyOil = onlyOil.replace("Yes","yes");
				if(onlyOil == 'yes'){
					GM_setValue('onlyOil', onlyOil);
				} else {
					onlyOil = 'no';
					GM_setValue('onlyOil', onlyOil);
					
				}
*/

}
			
//			return onlyOil;
}
function respConfirm () {
     var response = confirm('Do you want to see only prices in Oil? \n \nThe default setting is to display the original price, followed by the price in Oil. \n \nIf you want to see ONLY prices in oil, please click "Cancel" \n\n Click "OK" or hit Return for Dollars and Barrels of Oil.\n \n After clicking, please refresh! \n\n To reset this preference, click "Reset Preferences" from the Oil Standard homepage');
     // OR var response = window.confirm('Confirm Test: Continue?');

     if (response) GM_setValue('onlyOil', 'no');
     else GM_setValue('onlyOil', 'yes');
}




function addTooltip(){

/*
Sweet Titles (c) Creative Commons 2005
http://creativecommons.org/licenses/by-sa/2.5/
Author: Dustin Diaz | http://www.dustindiaz.com
*/

	var newevent = "Array.prototype.inArray = function (value) {var i;for (i=0; i < this.length; i++) {if (this[i] === value) {return true;} }; return false;}; function addEvent( obj, type, fn ) { if (obj.addEventListener) {  obj.addEventListener( type, fn, false );  EventCache.add(obj, type, fn);} else if (obj.attachEvent) {  obj['e'+type+fn] = fn;  obj[type+fn] = function() { obj['e'+type+fn]( window.event ); };  obj.attachEvent( 'on'+type, obj[type+fn] ); EventCache.add(obj, type, fn);} else { obj['on'+type] = obj['e'+type+fn];}} var EventCache = function(){  var listEvents = [];  return {   listEvents : listEvents,   add : function(node, EventName, fHandler){    listEvents.push(arguments);   },   flush : function(){    var i, item;    for(i = listEvents.length - 1; i >= 0; i = i - 1){     item = listEvents[i];     if(item[0].removeEventListener){ item[0].removeEventListener(item[1], item[2], item[3]); }; if(item[1].substring(0, 2) != 'on'){ item[1] = 'on' + item[1];  };  if(item[0].detachEvent){      item[0].detachEvent(item[1], item[2]);     }; item[0][item[1]] = null; }; } }; }(); addEvent(window,'unload',EventCache.flush);";
	var sweettitles = "var sweetTitles = { xCord : 0,yCord : 0,tipElements : ['a'],obj : Object,tip : Object,active : 0,init : function() {if ( !document.getElementById ||!document.createElement ||!document.getElementsByTagName ) {return;}var i,j;this.tip = document.createElement('div');this.tip.id = 'toolTip';document.getElementsByTagName('body')[0].appendChild(this.tip);this.tip.style.top = '0';this.tip.style.visibility = 'hidden';var tipLen = this.tipElements.length;for ( i=0; i<tipLen; i++ ) {var current = document.getElementsByTagName(this.tipElements[i]);var curLen = current.length;for ( j=0; j<curLen; j++ ) {addEvent(current[j],'mouseover',this.tipOver);addEvent(current[j],'mouseout',this.tipOut);current[j].setAttribute('tip',current[j].title);current[j].removeAttribute('title');}}},updateXY : function(e) {if ( document.captureEvents ) {sweetTitles.xCord = e.pageX;sweetTitles.yCord = e.pageY;} else if ( window.event.clientX ) {sweetTitles.xCord = window.event.clientX+document.documentElement.scrollLeft;sweetTitles.yCord = window.event.clientY+document.documentElement.scrollTop;}},tipOut: function() {if ( window.tID ) {clearTimeout(tID);}if ( window.opacityID ) {clearTimeout(opacityID);}sweetTitles.tip.style.visibility = 'hidden';},checkNode : function() {var trueObj = this.obj;if ( this.tipElements.inArray(trueObj.nodeName.toLowerCase()) ) {return trueObj;} else {return trueObj.parentNode;}},tipOver : function(e) {sweetTitles.obj = this;tID = window.setTimeout('sweetTitles.tipShow()',001);sweetTitles.updateXY(e);},tipShow : function() {var scrX = Number(this.xCord);var scrY = Number(this.yCord);var tp = parseInt(scrY+15);var lt = parseInt(scrX+10);var anch = this.checkNode();var addy = '';var access = '';var tipTest = anch.getAttribute('class'); if (tipTest == 'oillink'){this.tip.innerHTML = '<p>'+anch.getAttribute('tip')+'<em>'+access+addy+'</em></p>';if ( parseInt(document.documentElement.clientWidth+document.documentElement.scrollLeft) < parseInt(this.tip.offsetWidth+lt) ) {this.tip.style.left = parseInt(lt-(this.tip.offsetWidth+10))+'px';} else {this.tip.style.left = lt+'px';}if ( parseInt(document.documentElement.clientHeight+document.documentElement.scrollTop) < parseInt(this.tip.offsetHeight+tp) ) {this.tip.style.top = parseInt(tp-(this.tip.offsetHeight+10))+'px';} else {this.tip.style.top = tp+'px';}this.tip.style.visibility = 'visible';this.tip.style.opacity = '.1';this.tipFade(10);}},tipFade: function(opac) {var passed = parseInt(opac);var newOpac = parseInt(passed+10);if ( newOpac < 80 )  { this.tip.style.opacity = '.80';this.tip.style.filter = 'alpha(opacity:80)';}}};function pageLoader() {sweetTitles.init();}addEvent(window,'load',pageLoader);";

	addScript(newevent);
	addScript(sweettitles);


}

// adds a script to the head of the document
function addScript(scriptText){
		var head = document.getElementsByTagName('head')[0];
		if (!head) { return; }
		var addScript = document.createElement("script");
		addScript.innerHTML = scriptText;
		head.appendChild(addScript);
}
