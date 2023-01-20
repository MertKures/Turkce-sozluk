import { getDefaultSettings, initializeSettings } from 'modules/utils.js';
let settings = getDefaultSettings();

//#region TEST
initializeSettings()
    .then(_settings => settings = _settings)
    // TEST: [Search after popup open]: Select appropriate settigns to true.
    .then(async (obj) => {
        await browser.storage.local.set({ "searchSelectedTextOnPopupShow": true });
        settings.searchSelectedTextOnPopupShow = true;
    });
//#endregion

let waitingBrowserActionToSendAWord = false;
let objectToSendToBrowserAction = null;

//browserAction portu
let portbA = null;

//Sends meaning of the word that came from context menu.
function sendContextMenuSelectedTextToTab(info, tab) {
    browser.tabs.sendMessage(tab.id, { type: "SearchFromContextMenu", word: info.selectionText.trim().toLocaleLowerCase(), isContextMenu: true });
}

//async olursa browserAction açılmıyor.
function ContextMenuClicked(info, tab) {
    if (info.menuItemId == "cm_onpopup") {
        waitingBrowserActionToSendAWord = true;

        objectToSendToBrowserAction = { word: info.selectionText.trim(), type: "SearchFromContextMenu", searchEngine: settings["default"] };

        browser.browserAction.openPopup();
    } else if (info.menuItemId == "cm_onpage")
        sendContextMenuSelectedTextToTab(info, tab);
}

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

function updateSettings(e) {
    for (const key in e)
        settings[key] = e[key].newValue;
}

async function SearchFromTDK(message, sender) {
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

//Sadece 2 cümleye ulasabiliyoruz.
async function SearchFromGoogle(word) {
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

async function Search(message, sender) {
    if (message == null)
        return;

    let _searchEngine = message.searchEngine ?? settings["default"];

    if (_searchEngine === "tdk") return await SearchFromTDK(message, sender);
    else if (_searchEngine === "google") return await SearchFromGoogle(message.word);
    else return;
}

async function onMessage(message, sender) {
    if (message.type === "Search")
        return Promise.resolve(Search(message, sender));
}

function onConnect(port) {
    //browserAction
    if (port.sender.envType == "addon_child") {
        if (portbA) {
            portbA.disconnect();
            portbA = null;
        }

        portbA = port;

        portbA.name = "bA";

        if (waitingBrowserActionToSendAWord && objectToSendToBrowserAction) {
            portbA.postMessage(objectToSendToBrowserAction);

            waitingBrowserActionToSendAWord = false;
            objectToSendToBrowserAction = null;
        }
        else {
            portbA.postMessage({
                type: "PopupConnectedToBackground"
            });
        }

        portbA.onDisconnect.addListener(onDisconnect);

        return;
    }
}

function onDisconnect(port) {
    console.debug(port, "'" + port.name + "' portuyla bağlantı koptu.", (port.error) ? "Error: " + port.error : "");

    if (port.name === "bA")
        portbA = null;
}

browser.runtime.onConnect.addListener(onConnect);

browser.runtime.onMessage.addListener(onMessage);

browser.storage.onChanged.addListener(updateSettings);

browser.contextMenus.onClicked.addListener(ContextMenuClicked);