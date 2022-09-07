//https://sozluk.gov.tr/gts?ara=Hoşgörü
//this.readyState === 4 && this.status === 200

const defaultSettings = { modifiers: ["none"], default: "tdk", searchSelectedTextOnPopupShow: false };

let settings = defaultSettings;

async function loadSettings() {
    settings = await browser.storage.local.get();

    checkSettings();
}

loadSettings();

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
        console.warn("Settings, nesne boş olduğundan varsayılana ayarlandı.");
        return;
    }
    
    if (!(settings.default === "tdk" || settings.default === "google")) {
        settings = makeSettingsDefault("default");
        console.warn("'default' değeri boş olduğundan varsayılana ayarlandı.");
    }

    if ((Array.isArray(settings.modifiers)) ? settings.modifiers.length === 0 : true) {
        settings = makeSettingsDefault("modifiers");
        console.warn("'modifiers' dizisi boş olduğundan varsayılana ayarlandı.");
    }
    
    if (typeof settings.searchSelectedTextOnPopupShow !== "boolean") {
        settings = makeSettingsDefault("searchSelectedTextOnPopupShow");
        console.warn("'searchSelectedTextOnPopupShow' değeri boş olduğundan varsayılana ayarlandı.");
    }
}

browser.storage.onChanged.addListener(updateSettings);

let xhr,
    cevirilecekTA,
    cevirilenAlan,
    gcevirilenAlan,
    gcevirilecekTA,
    googleKapsayici,
    tdkKapsayici,
    google,
    tdk,
    baslangic = +new Date(),
    looptaMi = false;

function init() {
    cevirilecekTA = document.getElementById('cevirilecekTA');
    cevirilecekTA.oninput = function () {
        if (!this.value.trim()) {
            cevirilenAlan.textContent = "";
        }
        if (looptaMi == true) {
            baslangic = +new Date();
        } else {
            baslangic = +new Date();
            searchAfterInterval();
        }
    }
    cevirilenAlan = document.getElementById('cevirilenAlan');
    gcevirilenAlan = document.getElementById('gcevirilenAlan');
    gcevirilecekTA = document.getElementById('gcevirilecekTA');
    gcevirilecekTA.oninput = function () {
        if (!this.value?.trim()) {
            gcevirilenAlan.textContent = "";
        }
        if (looptaMi == true) {
            baslangic = +new Date();
        } else {
            baslangic = +new Date();
            searchAfterInterval();
        }
    };
    googleKapsayici = document.getElementById('GoogleKapsayici');
    googleKapsayici.hidden = true;
    tdkKapsayici = document.getElementById('TDKKapsayici');
    google = document.getElementById('Google');
    tdk = document.getElementById('TDK');
    tdk.style.backgroundColor = "rgb(92,91,86)";

    google.onclick = () => {
        tdkKapsayici.hidden = true;
        google.style.backgroundColor = "rgb(92,91,86)";
        tdk.style.backgroundColor = "";
        googleKapsayici.hidden = false;
    };

    tdk.onclick = () => {
        googleKapsayici.hidden = true;
        tdkKapsayici.hidden = false;
        tdk.style.backgroundColor = "rgb(92,91,86)";
        google.style.backgroundColor = "";
    };
}

init();

async function searchAfterInterval() {
    looptaMi = true;
    while ((+new Date() - baslangic) <= 300) {
        await new Promise(resolve => {
            setTimeout(resolve, 100);
        });
    }
    looptaMi = false;
    if (tdkKapsayici.hidden == false) {
        if (cevirilecekTA.value.trim().length > 0) {
            SearchFromTDK(cevirilecekTA.value.trim().toLocaleLowerCase());
        }
    } else {
        if (gcevirilecekTA.value.trim().length > 0) {
            SearchFromGoogle(gcevirilecekTA.value.trim().toLocaleLowerCase());
        }
    }
}

function createElement(tag, _count, properties) {
    if (!tag) {
        console.error("\"tag\" parameter was empty.")
        return null;
    } else if (isNaN(parseInt(_count))) {
        //properties var ama _count belirtilmemiş.
        if (properties) {
            console.error("\"properties\" parametresi belirtilmiş fakat \"_count\" parametresi belirtilmemiş veya yanlış belirtilmiş.");
            return null;
        }
    }

    var count = (_count) ? ((_count > 1) ? _count : ((_count == 1) ? 1 : false)) : 1;

    if (!count) {
        console.error("\"_count\" parameter was smaller than or equal to zero.", tag, _count, properties);
        return null;
    }

    if (!properties) {
        try {
            if (count == 1)
                return document.createElement(tag);
            else {
                var list = [];
                for (var i = 0; i < count; i++)
                    list.push(document.createElement(tag));
                return list;
            }
        } catch (error) {
            console.error("There was an error while trying to add an \"" + tag + "\" element without properties.Error message : " + error);
            return null;
        }
    }

    var list = [];

    for (var i = 0; i < count; i++) {
        var el = document.createElement(tag);

        if (!el) {
            console.warn("The list of elements had an empty item at " + i);
            continue;
        }

        for (var key in properties) {
            if (key != "attributes") {
                //Catching errors because there may be invalid values.
                try {
                    el[key] = properties[key];
                } catch (error) {
                    console.error("The value of property \"" + key + "\" was " + ((!properties[key]) ? "empty" : properties[key]) + ".Error message : " + error);
                }
            } else {
                try {
                    for (var keyAttr in properties[key]) {
                        el.setAttribute(keyAttr, properties[key][keyAttr]);
                    }
                } catch (error) {
                    console.error("The value of attribute \"" + keyAttr + "\" was " + ((!properties[key][keyAttr]) ? "empty" : properties[key][keyAttr]) + ".Error message : " + error);
                }
            }
        }

        list.push(el);
    }

    if (list.length == 1)
        return list[0];
    else
        return list;
}

function addElements(parent, ...childs) {
    if (!parent || !childs) {
        console.error("\"parent\" veya \"childs\" parametresi nulldu.Parametreler ...", parent, childs);
        return false;
    }

    for (var i = 0; i < childs.length; i++) {
        var arr = false;

        //Uzunluğu yoksa parametre bir dizi değil.
        if (!childs[i].length) {
            arr = false;
        }
        //Uzunluk 0'dan büyük ise parametre bir dizidir ve işlenecek elemanları vardır.
        else if (childs[i].length > 0) {
            arr = true;
        }
        //Uzunluk 0 olduğundan atla.
        else if (childs[i].length == 0) {
            continue;
        }

        for (var a = 0; a < ((arr) ? childs[i].length : 1); a++) {
            var el;

            if (arr) {
                el = childs[i][a];
            } else {
                el = childs[i]
            }

            //Elementi ekle.
            try {
                if (el) {
                    parent.appendChild(el);
                }
            } catch (error) {
                console.error("addElements() -> Hata mesajı : " + error);
            }
        }
    }

    return true;
}

function SearchFromTDK(message) {
    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState != XMLHttpRequest.DONE || !(xhr.status == 0 || (xhr.status >= 200 && xhr.status < 400)))
            return;

        var list = JSON.parse(xhr.responseText);

        if (list.error) {
            cevirilenAlan.textContent = "Sonuç bulunamadı";

            list = null;

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

        cevirilenAlan.textContent = "";

        createTDKUI({
            anlamlarListe: anlamlarListe,
            orneklerListe: orneklerListe,
            word: message
        }, cevirilenAlan);

        //xhr null yapınca null diye hata veriyor.
        //xhr = null;
    }
    xhr.open("GET", "https://sozluk.gov.tr/gts?ara=" + message);
    xhr.send();
}

function createTDKUI(message, parentElement) {
    //console.debug(message);

    //message.word trim'lenmiş ve küçük harflerle geliyor.
    if (!message.word) {
        return;
    }
    else if (!message.anlamlarListe) {
        return;
    }
    else if (message.anlamlarListe.length <= 0) {
        return;
    }

    //İlk önce kelimeyi yazalım.

    var ustKelime = createElement("b", 1, { "textContent": message.word.charAt(0).toUpperCase() + message.word.slice(1) });

    if (!ustKelime) {
        console.error("Kelimenin en üste yazıldığı kısımda \"b\" elementi oluşturulamadı.");
        return;
    }

    parentElement.appendChild(ustKelime);

    addElements(parentElement, createElement("br", 2));

    var anlamlarEl = createElement("b", 1, { style: "color:orange", textContent: "Anlam(lar):" });

    if (!anlamlarEl) {
        console.error("\"anlamlarEl\" elementi oluşturulamadı.");
        return;
    }

    parentElement.appendChild(anlamlarEl);

    anlamlarEl = null;

    addElements(parentElement, createElement("br", 2));

    let anlamSayac = 1;

    //Anlamlar burada ekleniyor.
    message.anlamlarListe.forEach(a => {
        if (a.anlam) {
            addElements(parentElement, createElement("span", 1, { textContent: anlamSayac.toString() + ")" + a.anlam }), createElement("br", 2));
        }

        anlamSayac++;
    });

    //Örnekler

    var orneklerYazisiEl = createElement("b", 1, { style: "color:orange", "textContent": "Örnekler:" });

    if (!orneklerYazisiEl) {
        console.error("\"orneklerYazisiEl\" elementi oluşturulamadı.");
        return;
    }

    parentElement.appendChild(orneklerYazisiEl);

    orneklerYazisiEl = null;

    addElements(parentElement, createElement("br", 2));

    let ornekSayac = 1;

    for (obj of message.orneklerListe) {
        let ornek = obj.ornek;
        let yazar = obj.yazar;

        if (!ornek)
            continue;
        else if (!ornek.toLocaleLowerCase().includes(message.word.toLocaleLowerCase())) {
            addElements(parentElement, createElement("span", 1, { textContent: ornekSayac.toString() + ")" + ornek }), createElement("br"));

            if (yazar) {
                addElements(parentElement, createElement("br"), createElement("b", 1, { style: "color:rgb(252, 186, 3)", "textContent": yazar }), createElement("br"));
            }

            parentElement.appendChild(createElement("br"));
            continue;
        }

        let orderedElementList = {};
        let orderedListIndex = 0;
        let lastIndex = 0;
        let numberEl = createElement("span", 1, { textContent: ornekSayac.toString() + ")" });

        orderedElementList[orderedListIndex] = numberEl;

        orderedListIndex++;

        for (match of ornek.toLocaleLowerCase().matchAll(message.word.toLocaleLowerCase())) {
            //Büyük küçük harfi korumak için substring ile kelimeyi aldık.
            let word = ornek.substring(match.index, match.index + message.word.length);

            let substring = createElement("span", 1, { textContent: ornek.substring(lastIndex, match.index) });

            //Kelimeyi renkli olarak ekle.
            let coloredWordEl = createElement("b", 1, { textContent: word, style: "color:green" });

            orderedElementList[orderedListIndex] = substring;

            orderedListIndex++;

            orderedElementList[orderedListIndex] = coloredWordEl;

            orderedListIndex++;

            lastIndex = match.index + message.word.length;
        }

        let lastSubstringEl = createElement("span", 1, { textContent: ornek.substring(lastIndex) });

        orderedElementList[orderedListIndex] = lastSubstringEl;

        for (index in orderedElementList) {
            let element = orderedElementList[index];

            addElements(parentElement, element);
        }

        if (yazar) {
            addElements(parentElement, createElement("br", 2), createElement("b", 1, { style: "color:rgb(252, 186, 3)", textContent: yazar }));
        }

        addElements(parentElement, createElement("br", 2));

        ornekSayac++;
    }
}

//Google çeviri için kullanılacak "doc" parametresi background_scriptten gelecek.
function createGoogleUIFromHTMLDoc(doc) {
    let kelimeQuery = doc.querySelector("[data-dobid='hdw']");

    if (!kelimeQuery) {
        throw "[data-dobid='hdw'] bulunamadı.";
    }

    let word = kelimeQuery.textContent;

    addElements(gcevirilenAlan, createElement("b", 1, { textContent: word.toUpperCase() }));

    addElements(gcevirilenAlan, createElement("br", 2));

    let icon = document.createElement('img');
    icon.style.width = "24px";
    icon.style.height = "24px";
    icon.src = browser.runtime.getURL("/icons/hoparlor.png");

    icon.onclick = function () {
        let audio = this.getElementsByTagName('audio')[0];
        if (audio)
            audio.play();
    }

    let audio = doc.querySelector("audio[jsname='QInZvb']");

    if (!audio) {
        audio = document.createElement('audio');
        audio.src = `https://www.google.com/speech-api/v1/synthesize?text=${word.replace(/·/g, '')}&enc=mpeg&lang=tr&speed=0.4&client=lr-language-tts&use_google_only_voices=1`;
    } else {
        if (!audio.src) {
            audio.src = `https://www.google.com/speech-api/v1/synthesize?text=${word.replace(/·/g, '')}&enc=mpeg&lang=tr&speed=0.4&client=lr-language-tts&use_google_only_voices=1`;
        }
    }

    icon.appendChild(audio);

    gcevirilenAlan.appendChild(icon);

    addElements(gcevirilenAlan, createElement("br", 2));

    icon = null;
    audio = null;

    let icerikSaranDiv = document.createElement('div');
    icerikSaranDiv.style.width = gcevirilenAlan.style.width;

    let sayac = 0;

    doc.querySelector("ol[class='eQJLDd']").childNodes.forEach(p => {
        try {
            let meaningElement = p.querySelector("div[data-dobid='dfn']");
            let exampleElement = (meaningElement) ? (meaningElement.nextElementSibling) ? (meaningElement.nextElementSibling.getAttribute("class") === "vmod") ? meaningElement.nextElementSibling : null : null : null;

            if (!meaningElement)
                return;

            sayac++;

            addElements(icerikSaranDiv, createElement("span", 1, { textContent: sayac + ")" + meaningElement.textContent }), createElement("br", 2));

            if (!exampleElement)
                return;

            if (exampleElement.textContent.trim() === "")
                return;

            let boldElement = createElement("span", 1, { attributes: { style: "color:rgb(3, 138, 255)" }, textContent: "Örnek -> " });
            let exampleSpan = createElement("b", 1, { textContent: exampleElement.textContent });

            addElements(icerikSaranDiv, boldElement, exampleSpan);
            addElements(icerikSaranDiv, createElement("br", 2));
        } catch (hata) {
            console.error(hata);
        }
    });

    gcevirilenAlan.appendChild(icerikSaranDiv);

    word = null;
    icerikSaranDiv = null;
    sayac = null;
}

function SearchFromGoogle(word) {
    gcevirilenAlan.textContent = "";
    //"https://www.google.com/search?q=" + word + "+ne+demek"

    fetch("https://www.google.com/search?q=" + word + "+ne+demek", {
        method: 'GET',
        credentials: 'omit'
    })
        .then((response) => response.text())
        .then((text) => {
            const _document = new DOMParser().parseFromString(text, 'text/html');

            createGoogleUIFromHTMLDoc(_document);
        }).catch(hata => {
            console.error(hata);
        });
}

function ContextMenuHandler(message) {
    let word = message.message.word;

    //Hangi arama motoru seçilmiş ise ona göre arama yap.
    if (message.searchEngine == "tdk") {
        tdk.click();

        cevirilecekTA.value = word;

        try {
            SearchFromTDK(word);
        } catch (error) {
            console.error(error);
        }
    } else if (message.searchEngine == "google") {
        google.click();

        gcevirilecekTA.value = word;

        try {
            SearchFromGoogle(word);
        } catch (error) {
            console.error(error);
        }
    }
}

function Search(word) {
    if (settings["default"] === "tdk")
        SearchFromTDK(word);
    else if (settings["default"] === "google")
        SearchFromGoogle(word);
}

async function searchSelectedTextOnActiveTab() {
    let text = await getSelectedTextOnActiveTab();

    Search(text);
}

async function getSelectedTextOnActiveTab() {
    let tab = (await browser.tabs.query({ currentWindow: true, active: true }))[0],
        text;

    try {
        text = await browser.tabs.sendMessage(tab.id, { type: "getSelectedText" });
    } catch (error) {
        console.error(error);
        return "";
    }

    console.debug("Selected text on tab.id: '" + tab.id + "' is: " + text);

    return text ?? "";
}

console.log(settings["searchSelectedTextOnPopupShow"]);

if (settings["searchSelectedTextOnPopupShow"] === true)
    searchSelectedTextOnActiveTab();

let port = browser.runtime.connect();

function portOnMessage(message) {
    //console.debug(message, "browserAction portuna mesaj geldi.");
    if (message.type == "SearchFromContextMenu")
        ContextMenuHandler(message);
}

port.onMessage.addListener(portOnMessage);