const utils = require('../modules/utils.js');

//utils.testFunc();

const defaultSettings = { modifiers: ["none"], default: "tdk", searchSelectedTextOnPopupShow: false };

let settings = defaultSettings;

async function loadSettings() {
    settings = await browser.storage.local.get();

    checkSettings();
}

loadSettings();

let waitingForbrowserActionToSendAWord = false;
let objectToSendToBrowserAction = null;

//browserAction portu
let portbA = null;

//Sends meaning of the word that came from context menu.
async function sendWordToTab(info, tab) {
    let searchFrom = settings["default"];

    if (searchFrom === "tdk") {
        SearchFromTDK({ message: info.selectionText, isContextMenu: true }, { tab: tab });
    } else if (searchFrom === "google") {
        let text = await SearchFromGoogle(info.selectionText);

        browser.tabs.sendMessage(tab.id, { type: "response_from_google", doc: text, isContextMenu: true });

        text = null;
    }

    searchFrom = null;
}

//async olursa browserAction açılmıyor.
function ContextMenuClicked(info, tab) {
    //Content script'e kutucuğu kapatmasını söylüyor.
    browser.tabs.sendMessage(tab.id, { type: "SearchFromContextMenu" });

    if (info.menuItemId == "cm_onpopup") {
        waitingForbrowserActionToSendAWord = true;

        objectToSendToBrowserAction = { message: { modifiers: info.modifiers, word: info.selectionText.trim() }, type: "SearchFromContextMenu", searchEngine: settings["default"] };

        browser.browserAction.openPopup();

    } else if (info.menuItemId == "cm_onpage") {
        sendWordToTab(info, tab);
    }
}

try {
    browser.contextMenus.create({
        id: "ContextMenuParent",
        title: "Seçili kelimeyi çevir",
        contexts: ["selection"],
        // throws error in chrome.
        // icons: { "32": browser.runtime.getURL("icons/32/icon.png") }
    });

    browser.contextMenus.create({
        id: "cm_onpage",
        parentId: "ContextMenuParent",
        title: "Sayfa üzerinde",
        contexts: ["selection"]
    });

    browser.contextMenus.create({
        id: "cm_onpopup",
        parentId: "ContextMenuParent",
        title: "Uzantı üzerinde",
        contexts: ["selection"]
    });

    browser.contextMenus.onClicked.addListener(ContextMenuClicked);
} catch (hata) { console.error(hata); }

function sendMessageToTab(message, sender) {
    browser.tabs.sendMessage(sender.tab.id, message);
}

// function makeSettingsDefault() {
//     browser.storage.local.set(defaultSettings);
//     settings = defaultSettings;
//     return defaultSettings;
// }

function makeSettingsDefault(...properties) {
    if (properties.length === 0) {
        settings = defaultSettings;
        browser.storage.local.set(defaultSettings);
        return defaultSettings;
    }

    for (property of properties) {
        if (defaultSettings[property] == null)
            continue;

        settings[property] = defaultSettings[property];

        let propertyObj = {};
        propertyObj[property] = defaultSettings[property];

        browser.storage.local.set(propertyObj);
    }

    return settings;
}

function updateSettings(e) {
    let _settings = e;

    //browser.storage.local.onChanged sadece değişen key ve value'yu verdiğinden varsayılan üstüne yazıyoruz.

    for (key in _settings) {
        settings[key] = _settings[key].newValue;
    }

    _settings = null;
}

function checkSettings() {
    if (!settings) {
        settings = makeSettingsDefault();
        console.debug("Settings, nesne boş olduğundan varsayılana ayarlandı.");
        return;
    }
    
    if (!(settings.default === "tdk" || settings.default === "google")) {
        settings = makeSettingsDefault("default");
        console.debug("'default' değeri boş olduğundan varsayılana ayarlandı.");
    }

    if ((Array.isArray(settings.modifiers)) ? settings.modifiers.length === 0 : true) {
        settings = makeSettingsDefault("modifiers");
        console.debug("'modifiers' dizisi boş olduğundan varsayılana ayarlandı.");
    }
    
    if (typeof settings.searchSelectedTextOnPopupShow !== "boolean") {
        settings = makeSettingsDefault("searchSelectedTextOnPopupShow");
        console.debug("'searchSelectedTextOnPopupShow' değeri boş olduğundan varsayılana ayarlandı.");
    }
}

function SearchFromTDK(message, sender) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState != XMLHttpRequest.DONE || !(xhr.status == 0 || (xhr.status >= 200 && xhr.status < 400)))
            return;

        var list = JSON.parse(xhr.responseText);

        //Hata oluştuysa bitir.
        if (!list) {
            console.error("list -> undefined");
            return;
        }
        else if (list.error) {
            console.error("Sonuç bulunamadı");
            return;
        }

        list = list[0];
        //Anlam var ise devam et.
        if (parseInt(list.anlam_say) < 1) {
            return;
        }

        var anlamlarListe = [];
        var orneklerListe = [];

        list.anlamlarListe.forEach(a => {
            anlamlarListe.push({
                anlam: (a.anlam) ? a.anlam : "",
                fiil: (a.fiil) ? a.fiil : "",
                isim: (a.ozelliklerListe) ? (a.ozelliklerListe[0]) ? (a.ozelliklerListe[0].tam_adi) ? a.ozelliklerListe[0].tam_adi : "" : "" : ""
            });
            if (a.orneklerListe) {
                a.orneklerListe.forEach(b => {
                    orneklerListe.push({
                        ornek: (b.ornek) ? b.ornek : "",
                        yazar: (b.yazar) ? (b.yazar[0]) ? (b.yazar[0].tam_adi) ? b.yazar[0].tam_adi : "" : "" : ""
                    });
                });
            }
        });

        list = null;

        sendMessageToTab({
            type: "response_from_tdk",
            anlamlarListe: anlamlarListe,
            orneklerListe: orneklerListe,
            x: message.x,
            y: message.y,
            word: message.message,
            isContextMenu: message.isContextMenu
        }, sender);

        //xhr null yapınca null diye hata veriyor.
        //xhr = null;
    }
    xhr.open("GET", "https://sozluk.gov.tr/gts?ara=" + message.message);
    xhr.send();
}

//Sadece 2 cümleye ulaşabiliyoruz.
function SearchFromGoogle(word) {
    //"https://www.google.com/search?q=" + word + "+ne+demek"

    try {
        return fetch("https://www.google.com/search?q=" + word + "+ne+demek", {
            method: 'GET',
            credentials: 'omit'
        })
            .then((response) => response.text())
            .then((text) => {
                //Klonlanamaz hatası verdiğinden kapattım
                //const _document = new DOMParser().parseFromString(text, 'text/html');
                //return _document;

                return text;
            }).catch(hata => {
                console.error(hata);
            });
    } catch (error) {
        console.error(error);
    }
}

async function onMessage(message, sender) {
    /*
    tdk -> message -> {
        message: "kazı",
        x: 15,
        y: 50,
        type: "search_from_tdk"
    }

    google -> message -> {
        message: "kazı",
        x: 15,
        y: 50,
        type: "response_from_google",
        doc: string HTMLDocument
    }
    */

    if (message.type === "search_from_tdk") {
        SearchFromTDK(message, sender);
    } else if (message.type === "search_from_google") {
        let text = await SearchFromGoogle(message.message);

        sendMessageToTab({ type: "response_from_google", doc: text, x: message.x, y: message.y }, sender);
    }

    return Promise.resolve();
}

function onConnect(port) {
    //browserAction
    if (port.sender.envType == "addon_child") {
        if (portbA) {
            portbA.disconnect();
            portbA = null;
        }

        //console.debug(port, "browserAction portu bağlandı.");

        portbA = port;

        portbA.name = "bA";

        if (waitingForbrowserActionToSendAWord && objectToSendToBrowserAction) {
            portbA.postMessage(objectToSendToBrowserAction);

            //console.debug(objectToSendToBrowserAction, "mesajı browserAction'a gönderildi.");

            waitingForbrowserActionToSendAWord = false;
            objectToSendToBrowserAction = null;
        }

        portbA.onDisconnect.addListener(onDisconnect);

        return;
    }
}

function onDisconnect(port) {
    //console.log(port, "browserAction portunda bağlantı koptu.", "Hata : " + ((port.error) ? port.error : "Yok"));

    console.log(port, "'" + port.name + "' portuyla bağlantı koptu.", (port.error) ? "Error: " + port.error : "");

    if (port.name === "bA") {
        portbA = null;
        return;
    }
}

browser.runtime.onConnect.addListener(onConnect);

browser.runtime.onMessage.addListener(onMessage);

browser.storage.onChanged.addListener(updateSettings);