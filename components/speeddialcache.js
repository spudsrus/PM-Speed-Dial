const nsISupports = Components.interfaces.nsISupports;
const nsIDOMEventTarget = Components.interfaces.nsIDOMEventTarget;

// You can change these if you like
const CLASS_ID = Components.ID("{7a44e0ce-757a-4f65-93aa-b05a377558a7}");
const CLASS_NAME = "c-speeddial";
const CONTRACT_ID = "@uworks.net/speeddialcache;1";
const INTERFACE = Components.interfaces.nsISpeedDialCache;

// Firefox 4
var generatedQI = function(aIID) {
    // add any other interfaces you support here
    if (!aIID.equals(INTERFACE) && !aIID.equals(nsISupports))
        throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
};

try {
  Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
  generatedQI = XPCOMUtils.generateQI([INTERFACE]);
  Components.utils.import("resource://gre/modules/osfile.jsm");
} catch (e) { }  


/*
// This is your constructor.
// You can do stuff here.
function SpeedDialCache() {
  // you can cheat and use this
  // while testing without
  // writing your own interface
  this.wrappedJSObject = this;
  
  try {
    // Load cache mode preference
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.speeddial.");
    this.cacheMode = prefs.getIntPref("cacheMode");
  } catch (e) {
    Components.utils.reportError("Error reading preference: " + e);
  }
}
*/
function SpeedDialCache() {
  try {
    // Load cache mode preference
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.speeddial.");
    this.cacheMode = prefs.getIntPref("cacheMode");
  } catch (e) {
    Components.utils.reportError("Error reading preference: " + e);
  }
}

// This is the implementation of your component.
SpeedDialCache.prototype = {
  classDescription: "Speed Dial cache",
  classID: CLASS_ID,
  contractID: CONTRACT_ID,
  imageArray: new Array(),
  hiddenWindow: null,
  currentInstances: 0,
  cacheMode: 1,
  logService: null,

  // for nsISupports
  QueryInterface: generatedQI,

  base64ArrayBuffer: function (arrayBuffer) {
	  var base64    = ''
	  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

	  var bytes         = new Uint8Array(arrayBuffer)
	  var byteLength    = bytes.byteLength
	  var byteRemainder = byteLength % 3
	  var mainLength    = byteLength - byteRemainder

	  var a, b, c, d
	  var chunk

	  // Main loop deals with bytes in chunks of 3
	  for (var i = 0; i < mainLength; i = i + 3) {
		// Combine the three bytes into a single integer
		chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

		// Use bitmasks to extract 6-bit segments from the triplet
		a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
		b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
		c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
		d = chunk & 63               // 63       = 2^6 - 1

		// Convert the raw binary segments to the appropriate ASCII encoding
		base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
	  }

	  // Deal with the remaining bytes and padding
	  if (byteRemainder == 1) {
		chunk = bytes[mainLength]

		a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

		// Set the 4 least significant bits to zero
		b = (chunk & 3)   << 4 // 3   = 2^2 - 1

		base64 += encodings[a] + encodings[b] + '=='
	  } else if (byteRemainder == 2) {
		chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

		a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
		b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

		// Set the 2 least significant bits to zero
		c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

		base64 += encodings[a] + encodings[b] + encodings[c] + '='
	  }
	  
	  return base64
	},
  getImage: function(targetDial)
  {
    if ((targetDial >= this.imageArray.length) || (!this.imageArray[targetDial])) {
      return null;
    } else {
      return this.imageArray[targetDial];
    }
  },
  
  hasImage: function(targetDial)
  {
    return ((targetDial < this.imageArray.length) && (this.imageArray[targetDial]));
  },

  setImage: function(targetImageURL, targetDial) {
	  var thisInstance = this;
	  
    if ((this.cacheMode == 0) && (this.currentInstances == 0)) return;
    
    if (targetImageURL == null) {
      this.imageArray[targetDial] = null;
    } else {
      if (this.hiddenWindow == null) {
        this.hiddenWindow = Components.classes["@mozilla.org/appshell/appShellService;1"]
           .getService(Components.interfaces.nsIAppShellService)
           .hiddenDOMWindow;
         if ( (typeof this.hiddenWindow.Components != 'undefined')
           && (typeof this.hiddenWindow.Components.classes != 'undefined' ) ) {
           this.hiddenWindow.Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
             .getService(Components.interfaces.mozIJSSubScriptLoader)
             .loadSubScript("chrome://speeddial/content/hiddenWindow.js");
         }
      }
      var newImage;
      try {
        newImage = this.hiddenWindow.speedDialCreateImage();
      } catch (e) {
        newImage = new this.hiddenWindow.Image();
      }
      newImage.imageLoaded = false;
      newImage.addEventListener("load", function(event) {
        if (event.currentTarget.notifyDials != null) {
          for (var c=0; c<event.currentTarget.notifyDials.length; c++) {
            try {
              event.currentTarget.notifyDials[c].imageLoadComplete(event);
            } catch (e) {
              Components.utils.reportError("Error calling imageLoadComplete: " + e);
            }
          }
          event.currentTarget.notifyDials.length = 0;
          event.currentTarget.notifyDials = null;
        }
        event.currentTarget.imageLoaded = true;
      }, true);
      
      if (this.imageArray[targetDial]) {
        if (this.imageArray[targetDial].notifyDials) {
          newImage.notifyDials = this.imageArray[targetDial].notifyDials;
          this.imageArray[targetDial].notifyDials = null;
        }
        if ((this.imageArray[targetDial].imageLoaded) ||
            (this.imageArray[targetDial].width != 0)) {
          newImage.prevWidth = this.imageArray[targetDial].width;
          newImage.prevHeight = this.imageArray[targetDial].height;
        } else {
          newImage.prevWidth = this.imageArray[targetDial].prevWidth;
          newImage.prevHeight = this.imageArray[targetDial].prevHeight;
        }
      } else {
        newImage.prevWidth = 0;
        newImage.prevHeight = 0;
      }
      
	  /*
	  try {
		// Get path for URL
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
					  .getService(Components.interfaces.nsIIOService);
		var url = ios.newURI(targetImageURL, null, null); // url is a nsIURI

		// file is a nsIFile    
		var file = url.QueryInterface(Components.interfaces.nsIFileURL).file;
		
		let promise = OS.File.read(file.path); // Read the complete file as an array
		promise = promise.then(
		  function onSuccess(array) {
			  newImage.src = 'data:image;base64,' + thisInstance.base64ArrayBuffer(array);
			return array;
		  }
		);
	  } catch (e) {
        Components.utils.reportError("Error reading image file, trying alternative method: " + e);
	  }
		*/
		newImage.src = targetImageURL;
      
      this.imageArray[targetDial] = newImage;
    }
  },

  setImageObject: function(targetImage, targetDial) {
    if ((this.cacheMode == 0) && (this.currentInstances == 0)) return;
    this.imageArray[targetDial] = targetImage;
  },

  getNumberInstances: function() {
    return this.currentInstances;
  },

  addInstance: function() {
    this.currentInstances++;
  },

  removeInstance: function() {
    this.currentInstances--;
    if (this.currentInstances == 0) {
      if (this.cacheMode == 0) {
        this.imageArray = new Array();
      } else if (this.cacheMode == 2) {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.speeddial.");
        var screenRows;
        var screenColumns;

        if (prefs.prefHasUserValue("group-" + targetGroup + "-rows")) {
          screenRows = prefs.getIntPref("group-" + targetGroup + "-rows");
        } else {
          screenRows = prefs.getIntPref("rows");
        }
        if (prefs.prefHasUserValue("group-" + targetGroup + "-columns")) {
          screenColumns = prefs.getIntPref("group-" + targetGroup + "-columns");
        } else {
          screenColumns = prefs.getIntPref("columns");
        }
        this.imageArray.length = screenRows * screenColumns;
      }
    }
  },
  
  log: function(message) {
    try {
      if (this.logService == null) {
        this.logService = Components.classes["@mozilla.org/consoleservice;1"].
          getService(Components.interfaces.nsIConsoleService);
      }
      this.logService.logStringMessage(message);
    } catch (e) { }
  }
}

//=================================================
// Note: You probably don't want to edit anything
// below this unless you know what you're doing.
//
// Factory
var SpeedDialCacheFactory = {
  singleton: null,
  createInstance: function (aOuter, aIID)
  {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    if (this.singleton == null)
      this.singleton = new SpeedDialCache();
    return this.singleton.QueryInterface(aIID);
  }
};

// Module
var SpeedDialCacheModule = {
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType)
  {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType)
  {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID)
  {
    if (!aIID.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    if (aCID.equals(CLASS_ID))
      return SpeedDialCacheFactory;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};

//module initialization
function NSGetModule(aCompMgr, aFileSpec) { return SpeedDialCacheModule; }

// Firefox 4
try {
  // The following line is what XPCOM uses to create components. Each component prototype
  // must have a .classID which is used to create it.
  var components = [SpeedDialCache];
  if ("generateNSGetFactory" in XPCOMUtils)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);  // Firefox 4.0 and higher
  else
    var NSGetModule = XPCOMUtils.generateNSGetModule(components);    // Firefox 3.x
} catch (e) { }