/*
Örnek background script -> content script mesajı

{
  "tur": "response_from_tdk",
  "message": [
    [
      {
        "anlam": "Bir yeri kazma işi, hafriyat",
        "fiil": "0",
        "isim": "isim"
      },
      {
        "anlam": "Yer altındaki tarihsel değeri olan şeyleri, yapıları ortaya çıkarmak amacıyla arkeologlarca toprağın belli kurallara ve yöntemlere göre kazılması, araştırılması",
        "fiil": "0",
        "isim": ""
      },
      {
        "anlam": "Hak (II)",
        "fiil": "0",
        "isim": ""
      }
    ],
    []
  ],
  "x": 331,
  "y": 335,
  "word": "kazı"
}
*/

(function () {
    const defaultSettings = { modifiers: ["none"], default: "tdk", searchSelectedTextOnPopupShow: false };

    let tutmaYeriMouseX,
        tutmaYeriMouseY,
        mouseDown,
        tiklanan_tutmayeri_elementi,
        kutucukMouseDown = false,
        kutucukMouseX = 0,
        kutucukMouseY = 0,
        aktifKutucuk,
        kutucukSurukleniyor = true,
        settings = { modifiers: ["none"], default: "tdk", searchSelectedTextOnPopupShow: false },
        modifiersArePressed = false,
        insideDialogOrBoxMouseUp = false,
        selectedText = "";

    function createElement(tag, _count, properties) {
        if (!tag) {
            console.error("\"tag\" parameter was empty.");
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

    //Google çeviri için kullanılacak "doc" parametresi background_scriptten gelecek.
    function createGoogleUIFromHTMLDoc(doc, parent) {
        let kelimeQuery = doc.querySelector("[data-dobid='hdw']");

        if (!kelimeQuery) {
            throw "[data-dobid='hdw'] bulunamadı.";
        }

        let word = kelimeQuery.textContent;

        if (word.trim().toLocaleLowerCase() === "ne demek?") {
            throw "Geçersiz kelime seçildiğinden sadece 'ne demek?' cümlesi aratıldı ve elementler eklenmedi."
        }

        addElements(parent, createElement("b", 1, { textContent: word.toUpperCase() }));

        addElements(parent, createElement("br", 2));

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

        parent.appendChild(icon);

        addElements(parent, createElement("br", 2));

        let icerikSaranDiv = document.createElement('div');
        icerikSaranDiv.style.width = parent.style.width;

        let sayac = 0;

        doc.querySelector("ol[class='eQJLDd']").childNodes.forEach(p => {
            try {
                let meaningElement = p.querySelector("div[data-dobid='dfn']");
                let exampleElement = (meaningElement) ? (meaningElement.nextElementSibling) ? (meaningElement.nextElementSibling.getAttribute("class") === "vmod") ? meaningElement.nextElementSibling : null : null : null;

                if (!meaningElement)
                    return;

                sayac++;

                addElements(icerikSaranDiv, createElement("span", 1, { textContent: sayac.toString() + ")" + meaningElement.textContent }), createElement("br", 2));

                //icerikSaranDiv.innerHTML += sayac + ")" + meaningElement.textContent + "<br><br>";

                if (!exampleElement)
                    return;

                if (exampleElement.textContent.trim() === "")
                    return;

                let boldElement = createElement("span", 1, { attributes: { style: "color:rgb(3, 138, 255)" }, "textContent": "Örnek: " });
                let exampleSpan = createElement("b", 1, { "textContent": exampleElement.textContent });

                addElements(icerikSaranDiv, boldElement, exampleSpan, createElement("br", 2));

                //icerikSaranDiv.innerHTML += "<br/><b style='color:blue;'>Örnek: </b><span>" + exampleElement.textContent + "</span><br/><br/>";
            } catch (hata) {
                console.error(hata);
            }
        });

        parent.appendChild(icerikSaranDiv);
    }

    async function loadSettings() {
        settings = await browser.storage.local.get();

        checkSettings();
    }

    function updateSettings(e) {
        let _settings = e;

        //browser.storage.local.onChanged sadece değişen key ve value'yu verdiğinden varsayılan üstüne yazıyoruz.

        for (key in _settings) {
            settings[key] = _settings[key].newValue;
        }

        _settings = null;
    }

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

            console.log("Kaydedilecek ayar", propertyObj);
    
            browser.storage.local.set(propertyObj);
        }
    
        return settings;
    }

    function checkSettings() {
        if (!settings) {
            settings = makeSettingsDefault();
            console.warn("Settings, nesne boş olduğundan varsayılana ayarlandı.");
            console.log(settings);
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
        
        if (!(settings.searchSelectedTextOnPopupShow === false || settings.searchSelectedTextOnPopupShow === true)) {
            settings = makeSettingsDefault("searchSelectedTextOnPopupShow");
            console.warn("'searchSelectedTextOnPopupShow' değeri boş olduğundan varsayılana ayarlandı.");
        }
    }

    // function checkSettings() {
    //     if (!settings) {
    //         console.debug("Settings, boş olduğundan varsayılana ayarlandı.");
    //         settings = makeSettingsDefault();
    //     } else if (!settings["default"] || settings["default"] == "" || !settings["modifiers"]) {
    //         console.debug("Settings, modifiers veya default değeri boş olduğundan varsayılana ayarlandı.");
    //         settings = makeSettingsDefault();
    //     }
    //     else if (settings["modifiers"].length == 0) {
    //         //Varsayılan default değeri var ise metodu çağırabiliriz.
    //         if (settings["default"] == "tdk") {
    //             settings = makeSettingsDefault();
    //             console.debug("Settings, modifiers dizisinin uzunluğu 0 olduğundan varsayılana ayarlandı.");
    //         }
    //         else {
    //             settings["modifiers"] = ["none"];
    //         }
    //     }
    // }

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
            //Renklendirebileceğimiz aynı kelime yoksa olduğu gibi yaz.
            else if (!ornek.toLocaleLowerCase().includes(message.word.toLocaleLowerCase())) {
                addElements(parentElement, createElement("span", 1, { textContent: ornekSayac.toString() + ")" + ornek }), createElement("br"));

                if (yazar) {
                    addElements(parentElement, createElement("br"), createElement("b", 1, { style: "color:rgb(252, 186, 3)", "textContent": yazar }), createElement("br"));
                }

                parentElement.appendChild(createElement("br"));

                ornekSayac++;

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

    function onMessage(message) {
        if (!message) {
            //console.debug("onMessage() -> \"message\" boş olduğundan işleme devam edilmedi.");
            return;
        }
        else if (message.type == "SearchFromContextMenu") {
            //Kutucugu ve diyalogu sil.
            deleteAllElements();
            //console.debug("onMessage() -> Context menu çağrıldığından tüm sözlük elementleri silindi.");
            return;
        }
        else if (message.type === "getSelectedText") {
            return Promise.resolve(selectedText);
        }
        //Gereksiz mi ??
        else if (!(message.type === "response_from_tdk" || message.type === "response_from_google")) {
            //console.debug("onMessage() -> message.type bilinen değerlerden farklı olduğundan işleme devam edilmedi.");
            return;
        }

        //#region Elementlerin oluşturulması

        var kutucuk = document.createElement('div');
        kutucuk.id = "ts_kutucuk";
        kutucuk.className = "ts_kutucukDivAnimasyon";

        if (message.isContextMenu == true) {
            kutucuk.classList.add("ts_kutucukCM");
        }
        else {
            kutucuk.style.left = (message.x - 10) + "px";
            kutucuk.style.top = (message.y + 10) + "px";
        }

        kutucuk.onanimationend = function () {
            this.classList.remove("ts_kutucukDivAnimasyon");
        }

        kutucuk.onmousedown = function (e) {
            //Prevents texts on the background to be highlighted
            e.preventDefault();

            //Seçili kelimeyi sildiğimizden dolayı mouse'u hareket ettirdiğimizde "Simple translate" eklentisi ekstra kutucuk çıkaramıyor.
            document.getSelection().removeAllRanges();

            //Eğer context menuden gelmiş ise sürüklendiğinde left,top ve transform değerlerinden etkilenmesini engelliyor.
            this.classList.remove("ts_kutucukCM");

            //Eğer context menuden gelmiş ise kutucuğa ilk tıklandığında kutucuğun yok olmamasını sağlıyor.
            //left ve top değeri "calc(50%)" olduğundan classList'ten "ts_kutucukCM" kaldırılınca left ve top boş kalıyor ve kutucuğun yok olmasına sebep oluyordu.
            this.style.left = (e.clientX - e.layerX) + "px";
            this.style.top = (e.clientY - e.layerY) + "px";

            kutucukMouseX = e.layerX;
            kutucukMouseY = e.layerY;

            kutucukMouseDown = true;

            //Sadece 1 kutucuk ve sözlük alanı olduğundan şu anlık gereksiz gibi.
            aktifKutucuk = this;
        }

        kutucuk.onmouseup = function (e) {
            e.preventDefault();

            insideDialogOrBoxMouseUp = true;

            if (kutucukSurukleniyor) {
                kutucukSurukleniyor = false;
                return;
            }

            let dialog = document.getElementById("ts_dialog");

            if (dialog) {
                dialog.style.visibility = "";
                dialog.style.transform = "";
            }

            this.remove();

            document.getSelection().removeAllRanges();
        }

        var resim = document.createElement('img');
        resim.className = "ts_kutucukResmi ts_kutucukImgAnimasyon";
        resim.id = "ts_kutucukResmi";
        resim.src = browser.runtime.getURL("icons/64/icon.png");

        resim.onanimationend = function () {
            this.classList.remove("ts_kutucukImgAnimasyon");
        }

        resim.setAttribute("draggable", false);

        kutucuk.appendChild(resim);

        resim = null;

        var alan = document.createElement('div');
        alan.id = "ts_dialog";
        alan.setAttribute("word", message.word);

        alan.onmouseup = function (e) {
            insideDialogOrBoxMouseUp = true;
        }

        if (message.isContextMenu == true) {
            alan.classList.add("ts_dialogCM");
        }
        else {
            alan.style.left = message.x + "px";
            alan.style.top = message.y + "px";
        }

        var tutmayeri = document.createElement("div");
        tutmayeri.className = "ts_kaydirma_cubugu";

        tutmayeri.onmousedown = function (e) {
            e.preventDefault();

            document.getSelection().removeAllRanges();

            if (e.button == '0') {
                tutmaYeriMouseX = e.layerX;
                tutmaYeriMouseY = e.layerY;

                mouseDown = true;

                tiklanan_tutmayeri_elementi = this;

                //Eğer context menuden gelmiş ise sürüklendiğinde left,top ve transform değerlerinden etkilenmesini engelliyor.
                this.parentElement.classList.remove("ts_dialogCM");

                //Eğer context menuden gelmiş ise tutma yerine ilk tıklandığında diyaloğun yok olmamasını sağlıyor.
                this.parentElement.style.left = (e.clientX - e.layerX) + "px";
                this.parentElement.style.top = (e.clientY - e.layerY) + "px";
            }
        };

        tutmayeri.onmouseup = function (e) {
            e.preventDefault();
            mouseDown = false;
            tiklanan_tutmayeri_elementi = null;
        };

        var kapamaTusu = document.createElement('div');
        kapamaTusu.className = "ts_kapamaTusu";
        kapamaTusu.textContent = "X";

        kapamaTusu.onmousedown = function (e) {
            e.preventDefault();
            document.getSelection().removeAllRanges();
        };

        kapamaTusu.onmouseup = function (e) {
            e.preventDefault();
        }

        kapamaTusu.onclick = function (e) {
            let el = document.getElementById("ts_dialog");
            if (el)
                el.remove();
            el = null;
        };

        let bilgiWrapper = document.createElement("div");
        bilgiWrapper.className = "ts_bilgiDiv";

        let bilgiAlani = document.createElement("p");
        bilgiAlani.className = "P_Anlamyeri";

        bilgiWrapper.appendChild(bilgiAlani);

        //#endregion

        bilgiAlani.innerText = "";

        if (message.type == "response_from_tdk") {
            try {
                createTDKUI(message, bilgiAlani);
            } catch (error) {
                //console.error(error);
                deleteAllElements();
            }
        }
        else if (message.type == "response_from_google") {
            try {
                createGoogleUIFromHTMLDoc(new DOMParser().parseFromString(message.doc, 'text/html'), bilgiAlani);
            } catch (error) {
                //console.error("onMessage() -> \"Google\"'dan çeviri -> " + error);
                deleteAllElements();
                return;
            }
        }

        tutmayeri.appendChild(kapamaTusu);

        alan.appendChild(tutmayeri);

        alan.appendChild(bilgiWrapper);

        //Kutucuğun çıkmasını beklediğimizden saklıyoruz.
        alan.style.visibility = "hidden";

        document.body.appendChild(alan);

        document.body.appendChild(kutucuk);

        return Promise.resolve();
    }

    function Search(word, Ex, Ey) {
        checkSettings();

        browser.runtime.sendMessage({
            message: word,
            type: (settings["default"] === "tdk") ? "search_from_tdk" : "search_from_google",
            x: Ex,
            y: Ey
        }).catch(err => {
            console.error("Search -> Hata -> " + err);
        });
    }

    //true => çevirme işlemlerine devam et, false => gereken koşullar sağlanmadığından işlemleri durdur.
    function checkModifiers(e) {
        let modifierKeys = ["alt", "shift", "ctrl"];
        let values = {};

        for (item of modifierKeys) {
            values[item] = e[item + "Key"];
        }

        checkSettings();

        if ((settings.modifiers.length == 1 && settings.modifiers[0] == "none") || settings.modifiers.length == 0)
            return true;

        for (modifier of settings.modifiers) {
            if (values[modifier] == false)
                return false;
        }

        return true;
    }

    function deleteAllElements() {
        let kutucuk = document.getElementById("ts_kutucuk");

        if (kutucuk)
            kutucuk.remove();

        let dialog = document.getElementById("ts_dialog");

        if (dialog)
            dialog.remove();
    }

    function deleteBoxes() {
        let kutucukDiv = document.getElementById("ts_kutucuk");

        if (kutucukDiv)
            kutucukDiv.remove();
    }

    const getSelectedText = () => {
        const element = document.activeElement;
        const isInTextField = element.tagName === "INPUT" || element.tagName === "TEXTAREA";
        const text = isInTextField
            ? element.value.substring(element.selectionStart, element.selectionEnd)
            : window.getSelection()?.toString() ?? "";
        return text.trim().toLocaleLowerCase();
    };

    const getSelectedTextIfThereIsNoDialog = () => {
        let text = getSelectedText();
        //console.debug(text);
        if (document.querySelector(`div[class='ts_dialog']`))
            return { word: text, info: "Didn't search the word because there is a dialog already.Word: " + text };
        return { word: text, info: (text === "") ? "Didn't do anything because the word was empty." : "" };
    };

    function window_onmouseup(e) {
        wordObj = getSelectedTextIfThereIsNoDialog();

        selectedText = wordObj.word;

        if (insideDialogOrBoxMouseUp) {
            insideDialogOrBoxMouseUp = false;

            return;
        }
        else
            deleteAllElements();

        //console.debug("All dictionary elements are deleted because the mouse click event wasn't in the dialog.");

        try {
            modifiersArePressed = checkModifiers(e);
        } catch (error) {
            console.error(error);
        }

        if (!modifiersArePressed) {
            //console.debug("Didn't search the text because modifiers were not pressed.");
            return;
        }
        else if (wordObj.info !== "")
        {
            //console.debug(wordObj.info);
            return;
        }
        //Return if not clicked with left mouse button.
        else if (e.button !== 0)
        {
            //console.debug("Didn't search the text because left key wasn't pressed.");
            return;
        }

        Search(wordObj.word, e.clientX, e.clientY);
    }

    browser.runtime.onMessage.addListener(onMessage);

    window.addEventListener("mouseup", window_onmouseup);
    window.addEventListener('mousemove', function (e) {
        if (e.buttons == '1') {
            if (tiklanan_tutmayeri_elementi && mouseDown == true) {
                tiklanan_tutmayeri_elementi.parentElement.style.left = (e.clientX - tutmaYeriMouseX) + 'px';
                tiklanan_tutmayeri_elementi.parentElement.style.top = (e.clientY - tutmaYeriMouseY) + 'px';
            }

            if (aktifKutucuk && kutucukMouseDown == true) {
                kutucukSurukleniyor = true;
                aktifKutucuk.style.left = (e.clientX - kutucukMouseX) + "px";
                aktifKutucuk.style.top = (e.clientY - kutucukMouseY) + "px";
            }
        } else {
            kutucukMouseDown = false;
            aktifKutucuk = null;
            kutucukSurukleniyor = false;
        }
    }, true);

    browser.storage.onChanged.addListener(updateSettings);

    loadSettings();
})();