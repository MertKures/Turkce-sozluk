import { getDefaultSettings, initializeSettings, searchEngineList } from 'modules/utils.js';

let settings = getDefaultSettings();

//#region TEST
initializeSettings()
    .then(_settings => settings = _settings)
    // TEST: [Search after popup open]: Select appropriate settings to true.
    .then(async () => {
        await browser.storage.local.set({ "searchSelectedTextOnPopupShow": true });
        settings.searchSelectedTextOnPopupShow = true;
    });
//#endregion

let isWaitingForThePopupToLoadToSendAWord = false;
let objectToBeSentToPopupWhenLoaded = null;
let popupPort = null;

//Sends meaning of the word that came from context menu.
function sendContextMenuSelectedTextToTab(info, tab) {
    browser.tabs.sendMessage(tab.id, { type: "search_from_context_menu", word: info.selectionText.trim().toLocaleLowerCase(), isContextMenu: true });
}

//async olursa browserAction acilmiyor.
function contextMenuClicked(info, tab) {
    if (info.menuItemId == "cm_onpopup") {
        isWaitingForThePopupToLoadToSendAWord = true;

        objectToBeSentToPopupWhenLoaded = { word: info.selectionText.trim(), type: "search_from_context_menu", searchEngine: settings["default"] };

        browser.browserAction.openPopup();
    } else if (info.menuItemId == "cm_onpage")
        sendContextMenuSelectedTextToTab(info, tab);
}

function createContextMenuEntries() {
    let parentContextMenuOptions = {
        id: "ContextMenuParent",
        title: "Seçili kelimeyi çevir",
        contexts: ["selection"],
        // throws error in chrome. "Unexpected property: 'icons'."
        icons: { "32": browser.runtime.getURL("icons/32/icon.png") }
    };

    try {
        browser.contextMenus.create(parentContextMenuOptions);
    } catch (hata) {
        delete parentContextMenuOptions.icons;

        try {
            browser.contextMenus.create(parentContextMenuOptions);

            console.debug("Successfully created context menu !");
        } catch (error) {
            console.error(error);
        }
    }

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
}

function updateSettings(e) {
    for (const key in e)
        settings[key] = e[key].newValue;
}

async function searchFromTDK(message) {
    let word = message.word ?? message;

    let response = await fetch("https://sozluk.gov.tr/gts?ara=" + word, {
        method: 'GET',
        credentials: 'omit'
    }).catch(error => console.error(error));

    if (!response)
        return;
    else if (!response.ok) {
        console.error(response.status, response.statusText);
        return;
    }

    let list;

    try {
        list = await response.json();
    } catch (error) {
        console.error(error);
    }

    //Hata oluştuysa bitir.
    if (!list) {
        console.error("list -> undefined");
        return;
    }
    else if (list.error) {
        console.error(list.error);
        return;
    }

    list = list[0];

    //Anlam var ise devam et.
    if (parseInt(list.anlam_say) < 1) {
        console.error("Anlam listesi boştu.");
        return;
    }

    let anlamlarListe = [];
    let orneklerListe = [];

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

    return {
        type: "response_from_tdk",
        anlamlarListe: anlamlarListe,
        orneklerListe: orneklerListe,
        word: word,
    };
}

//Sadece 2 cumleye ulasabiliyoruz.
async function searchFromGoogle(word) {
    //"https://www.google.com/search?q=" + word + "+ne+demek"

    let response = await fetch("https://www.google.com/search?q=" + word + "+ne+demek", {
        method: 'GET',
        credentials: 'omit'
    }).catch(err => { console.error(err) });

    if (!response)
        return;
    else if (!response.ok) {
        console.error("Word: " + word, "Result: " + response.status + " " + response.statusText);
        return;
    }

    return { type: "response_from_google", doc: await response.text() };
}

function getInformationIfTheWordHasBeenSearchedBefore(word) {
    if (!word)
        return;
    
    let index = 0;
    for (const obj of settings.storedWords) {
        if (obj.word === word.trim().toLocaleLowerCase())
            return { index: index, obj: obj };
        index++;
    }
}

async function search(message) {
    if (message == null)
        return;

    const searchEngine = message.searchEngine ?? settings["default"];

    const infoObj = getInformationIfTheWordHasBeenSearchedBefore(message.word);
    const isItSearchedBefore = infoObj ?? false;
    const indexOfInfo = (isItSearchedBefore) ? infoObj.index : null;
    const storedInformation = (isItSearchedBefore) ? infoObj.obj : {};

    if (isItSearchedBefore && storedInformation.hasOwnProperty(searchEngine)) {
        const info = storedInformation[searchEngine];

        if (info != null)
            return info;
    }

    const info = (searchEngine === searchEngineList.tdk)
        ? await searchFromTDK(message)
        : await searchFromGoogle(message.word);

    if (!info)
        return;

    if (isItSearchedBefore) {
        settings.storedWords[indexOfInfo][searchEngine] = info;
    } else {
        settings.storedWords.push({
            word: message.word,
            [searchEngine]: info
        });
    }

    await browser.storage.local.set({ "storedWords": settings.storedWords });

    return info;
}

async function onMessage(message, sender) {
    if (message.type === "search")
        return Promise.resolve(search(message, sender));
}

function onConnect(port) {
    //browserAction
    if (port.sender.envType == "addon_child") {
        if (popupPort) {
            popupPort.disconnect();
            popupPort = null;
        }

        popupPort = port;

        popupPort.name = "bA";

        if (isWaitingForThePopupToLoadToSendAWord && objectToBeSentToPopupWhenLoaded) {
            popupPort.postMessage(objectToBeSentToPopupWhenLoaded);

            isWaitingForThePopupToLoadToSendAWord = false;
            objectToBeSentToPopupWhenLoaded = null;
        }
        else {
            popupPort.postMessage({
                type: "popup_connected_to_background"
            });
        }

        popupPort.onDisconnect.addListener(onDisconnect);

        return;
    }
}

function onDisconnect(port) {
    if (port.name === "bA")
        popupPort = null;
}

browser.runtime.onConnect.addListener(onConnect);

browser.runtime.onMessage.addListener(onMessage);

browser.storage.onChanged.addListener(updateSettings);

browser.contextMenus.onClicked.addListener(contextMenuClicked);

createContextMenuEntries();