//https://sozluk.gov.tr/gts?ara=Medeniyet
//this.readyState === 4 && this.status === 200

let settings = { modifiers: ["none"], default: "tdk" };

async function loadSettings() {
    let _settings = await browser.storage.local.get();

    if (!_settings.default || !_settings.modifiers) {
        settings = makeSettingsDefault();
        return;
    } else if (_settings.modifiers.length == 0) {
        settings = makeSettingsDefault();
        return;
    }

    settings.modifiers = _settings.modifiers.newValue;
    settings.default = _settings.default.newValue;
}

loadSettings();

let waitingForbrowserActionToSendAWord = false;
let objectToSendToBrowserAction = null;

//browserAction portu
let portbA = null;


async function kelimeyiSayfayaGonder(info, tab) {
    let searchFrom = settings["default"];

    if (searchFrom == "tdk") {
        TDKdanArastir({ message: info.selectionText, isContextMenu: true }, { tab: tab });
    } else if (searchFrom == "google") {
        let text = await GoogleYanitiAl(info.selectionText);

        browser.tabs.sendMessage(tab.id, { tur: "Google_Anlam", doc: text, isContextMenu: true });

        text = null;
    }

    searchFrom = null;
}

//async olursa browserAction açılmıyor.
function ContextMenuClicked(info, tab) {
    //Content script'e kutucuğu kapatmasını söylüyor.
    browser.tabs.sendMessage(tab.id, { type: "ContextMenudenCevir" });

    if (info.menuItemId == "Uzanti_uzerinde") {
        waitingForbrowserActionToSendAWord = true;

        objectToSendToBrowserAction = { message: { modifiers: info.modifiers, word: info.selectionText.trim() }, type: "ContextMenudenCevir", searchSite: settings["default"] };

        browser.browserAction.openPopup();

    } else if (info.menuItemId == "Sayfa_uzerinde") {
        kelimeyiSayfayaGonder(info, tab);
    }
}

try {
    browser.contextMenus.create({
        id: "ContextMenuParent",
        title: "Seçili kelimeyi çevir",
        contexts: ["selection"],
        icons: { "32": browser.runtime.getURL("icons/iconY.png") }
    });

    browser.contextMenus.create({
        id: "Sayfa_uzerinde",
        parentId: "ContextMenuParent",
        title: "Sayfa üzerinde",
        contexts: ["selection"]
    });

    browser.contextMenus.create({
        id: "Uzanti_uzerinde",
        parentId: "ContextMenuParent",
        title: "Uzantı üzerinde",
        contexts: ["selection"]
    });

    browser.contextMenus.onClicked.addListener(ContextMenuClicked);
} catch (hata) { console.error(hata); }

function Mesajgonder(mesaj, gonderen) {
    browser.tabs.sendMessage(gonderen.tab.id, mesaj);
}

function makeSettingsDefault() {
    browser.storage.local.set({ default: "tdk", modifiers: ["none"] });
    return { default: "tdk", modifiers: ["none"] };
}

function updateSettings(e) {
    let _settings = e;

    settings = {};

    for (key in _settings) {
        settings[key] = _settings[key].newValue;
    }

    _settings = null;
}

function checkSettings() {
    if (!settings) {
        console.log("Settings, boş olduğundan varsayılana ayarlandı.");
        settings = makeSettingsDefault();
    } else if (!settings["default"] || settings["default"] == "" || !settings["modifiers"]) {
        settings = makeSettingsDefault();
        console.log("Settings, modifiers veya default değeri boş olduğundan varsayılana ayarlandı.");
    } else if (settings["modifiers"].length == 0) {
        settings = makeSettingsDefault();
        console.log("Settings, modifiers dizisinin uzunluğu 0 olduğundan varsayılana ayarlandı.");
    }
}

function TDKdanArastir(mesaj, gonderen) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && (xhr.status == 0 || (xhr.status >= 200 && xhr.status < 400))) {
            var liste = JSON.parse(xhr.responseText);
            //Hata oluştuysa bitir.
            if (!liste) {
                console.error("liste -> undefined");
                return;
            }
            if (liste.error) {
                console.error("Sonuç bulunamadı");
                return;
            }
            liste = liste[0];
            //Anlam var ise devam et.
            if (parseInt(liste.anlam_say) < 1) {
                return;
            }
            var anlamlarListe = [];
            var orneklerListe = [];
            liste.anlamlarListe.forEach(a => {
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
            liste = null;

            Mesajgonder({
                tur: "TDK_Anlam",
                anlamlarListe: anlamlarListe,
                orneklerListe: orneklerListe,
                x: mesaj.x,
                y: mesaj.y,
                kelime: mesaj.message,
                isContextMenu: mesaj.isContextMenu
            }, gonderen);
        }

        anlamlarListe = null;
        orneklerListe = null;

        //xhr null yapınca null diye hata veriyor.
        //xhr = null;
    }
    xhr.open("GET", "https://sozluk.gov.tr/gts?ara=" + mesaj.message);
    xhr.send();
}

//await ile çağırılmazsa promise döndürüyor.Bu yüzden browser.(runtime veya tabs).sendMessage'da "Obje kopyalanamıyor" benzeri hata veriyor.
//Daha temiz versiyonu FAKAT sadece 2 cümleye ulaşabiliyoruz ?
function GoogleYanitiAl(kelime) {
    //"https://www.google.com/search?q=" + kelime + "+ne+demek"

    try {
        return fetch("https://www.google.com/search?q=" + kelime + "+ne+demek", {
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

async function YanitiAl(mesaj, gonderen) {
    /*
    mesaj -> {
        message: "kazı",
        x: 15,
        y: 50,
        tur: "Google_Anlam" veya "TDK_Anlam_Ara"
    }
    */
    if (mesaj.tur == "TDK_Anlam_Ara") {
        TDKdanArastir(mesaj, gonderen);
    } else if (mesaj.tur == "Google_Anlam_Ara") {
        var text = await GoogleYanitiAl(mesaj.message);

        browser.tabs.sendMessage(gonderen.tab.id, { tur: "Google_Anlam", doc: text, x: mesaj.x, y: mesaj.y });

        text = null;
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

            console.debug(objectToSendToBrowserAction, "mesajı browserAction'a gönderildi.");

            waitingForbrowserActionToSendAWord = false;
            objectToSendToBrowserAction = null;
        }

        portbA.onDisconnect.addListener(onDisconnect);
    }
}

function onDisconnect(port) {
    //console.log(port, "browserAction portunda bağlantı koptu.", "Hata : " + ((port.error) ? port.error : "Yok"));

    if (port.name == "bA") {
        portbA = null;
        return;
    }
}

browser.runtime.onConnect.addListener(onConnect);

browser.runtime.onMessage.addListener(YanitiAl);

browser.storage.onChanged.addListener(updateSettings);