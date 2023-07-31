import { getDefaultSettings, initializeSettings, searchEngineList, addElements, createElement } from 'modules/utils.js';

let settings = getDefaultSettings();
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

        console.debug("Successfully created context menu !");
    } catch (hata) {
        delete parentContextMenuOptions.icons;
        try {
            browser.contextMenus.create(parentContextMenuOptions);

            console.debug("Successfully created context menu !");
        } catch (error) {
            console.error(error);
            return;
        }
    }

    browser.contextMenus.create({
        id: "cm_onpage",
        parentId: "ContextMenuParent",
        title: "Sayfa üzerinde",
        contexts: ["selection"]
    });

    if (parentContextMenuOptions.hasOwnProperty("icons")) {
        browser.contextMenus.create({
            id: "cm_onpopup",
            parentId: "ContextMenuParent",
            title: "Uzantı üzerinde",
            contexts: ["selection"]
        });
    }
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

    if (!list) {
        console.error("list -> undefined");
        return;
    }
    else if (list.error) {
        console.error(list.error);
        return;
    }

    list = list[0];

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

    // TODO: Parse the document and check if the word is in the document.
    const documentText = await response.text();

    if (!documentText)
        return;

    const doc = new DOMParser().parseFromString(documentText, 'text/html');

    // TODO: Get everything out of the document and turn it into a JSON object. Then send it.
    let query = doc.querySelector("[data-dobid='hdw']");

    if (!query) {
        console.error("[data-dobid='hdw'] bulunamadı.");
        return;
    }

    const wordOnTheDocument = query.textContent;

    if (wordOnTheDocument.trim().toLocaleLowerCase() === "ne demek?") {
        console.error("Geçersiz kelime seçildiğinden sadece 'ne demek?' cümlesi aratıldı ve elementler eklenmedi.");
        return;
    }

    const elements = {};

    const _extraInfoAfterWord = doc.querySelector("ol[class='eQJLDd']").previousElementSibling?.textContent ?? "";
    const extraInfoAfterWord = (_extraInfoAfterWord) ? ' •' + _extraInfoAfterWord : "";

    let audio = doc.querySelector("audio[jsname='QInZvb']");

    let meaningCounter = 0;

    const contentWrapper = document.createElement('div');

    doc.querySelector("ol[class='eQJLDd']").childNodes.forEach(p => {
        try {
            let meaningElement = p.querySelector("div[data-dobid='dfn']");

            if (!meaningElement)
                return;

            meaningCounter++;

            let extraInfoBeforeExample = meaningElement.parentElement?.previousElementSibling?.textContent ?? "";
            let extraInfoBeforeExampleElements = (extraInfoBeforeExample) ? [
                createElement("b", 1, { textContent: extraInfoBeforeExample, style: "font-size: 0.75em" }),
                createElement("br", 1)
            ] : null;

            let _similarWord;

            meaningElement.parentElement?.querySelectorAll('div[class^="vmod"]')?.forEach(p => {
                _similarWord = p.querySelector('div[class*="vmod"]')?.querySelector('div')?.textContent ?? "";

                if (_similarWord && _similarWord.toLocaleLowerCase().includes('benzer:'))
                    return;
            });

            let similarWord = (_similarWord && _similarWord.toLocaleLowerCase().includes('benzer:')) ? _similarWord.substring(_similarWord.toLocaleLowerCase().indexOf("benzer:")) : "";

            let similarWordElements;

            if (similarWord)
                similarWordElements = [
                    createElement('br', 1),
                    createElement('b', 1, { textContent: similarWord, className: "ts_similarWord" })
                ];

            addElements(contentWrapper,
                extraInfoBeforeExampleElements,
                createElement("span", 1,
                    {
                        textContent: meaningCounter.toString() + ")" + meaningElement.textContent
                    }),
                similarWordElements,
                createElement("br", 2)
            );

            let exampleElement = meaningElement.nextElementSibling?.className === "vmod" ? meaningElement.nextElementSibling : null;

            if (!exampleElement)
                return;
            else if (exampleElement.textContent.trim() === "")
                return;

            let boldElement = createElement("span", 1, { attributes: { style: "color:rgb(3, 138, 255)" }, "textContent": "Örnek: " });
            let exampleSpan = createElement("b", 1, { "textContent": exampleElement.textContent });

            console.debug(exampleSpan.textContent);

            addElements(contentWrapper, boldElement, exampleSpan, createElement("br", 2));
        } catch (err) {
            console.error(err);
        }
    });

    elements.word = word;
    elements.extraInfoAfterWord = extraInfoAfterWord;
    elements.audio = audio ? JSON.stringify(audio.innerHTML) : null;
    elements.contentWrapper = JSON.stringify(contentWrapper.innerHTML);

    return { type: "response_from_google", elements: elements };
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
        return Promise.resolve(await search(message, sender));
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

initializeSettings()
    .then(_settings => settings = _settings);