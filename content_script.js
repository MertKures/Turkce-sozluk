/*
Örnek background script -> content script mesajı

{
  "tur": "Turkce_Sozluk_Anlam",
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
  "kelime": "kazı"
}
*/

(function () {
    var tutmaYeriMouseX,
        tutmaYeriMouseY,
        mouseDown,
        tmp,
        deger,
        tiklanan_tutmayeri_elementi,
        kutucukMouseDown = false,
        kutucukMouseX = 0,
        kutucukMouseY = 0,
        aktifKutucuk,
        kutucukSurukleniyor = true,
        settings = { modifiers: ["none"], default: "tdk" },
        modifiersArePressed = false,
        nameForExtensionCreatedElements = "ts_uzanti_elementi";

    function elementOlustur(tag, _count, properties) {
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

    function elementleriEkle(parent, ...childs) {
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
                    console.error("elementleriEkle() -> Hata mesajı : " + error);
                }
            }
        }

        return true;
    }

    //Google çeviri için kullanılacak "doc" parametresi background_scriptten gelecek.
    function AnlamiCikar(doc, parent) {
        let kelimeQuery = doc.querySelector("[data-dobid='hdw']");

        if (!kelimeQuery) {
            throw "[data-dobid='hdw'] bulunamadı.";
        }

        let kelime = kelimeQuery.textContent;

        elementleriEkle(parent, elementOlustur("b", 1, { attributes: { name: nameForExtensionCreatedElements }, textContent: kelime.toUpperCase() }));

        elementleriEkle(parent, elementOlustur("br", 2));

        let icon = document.createElement('img');
        icon.style.width = "24px";
        icon.style.height = "24px";
        icon.setAttribute("name", nameForExtensionCreatedElements);
        icon.src = browser.runtime.getURL("/icons/hoparlör2.png");

        icon.onclick = function () {
            let audio = this.getElementsByTagName('audio')[0];
            if (audio)
                audio.play();
        }

        let audio = doc.querySelector("audio[jsname='QInZvb']");

        if (!audio) {
            audio = document.createElement('audio');
            audio.src = `https://www.google.com/speech-api/v1/synthesize?text=${kelime.replace(/·/g, '')}&enc=mpeg&lang=tr&speed=0.4&client=lr-language-tts&use_google_only_voices=1`;
        } else {
            if (!audio.src) {
                audio.src = `https://www.google.com/speech-api/v1/synthesize?text=${kelime.replace(/·/g, '')}&enc=mpeg&lang=tr&speed=0.4&client=lr-language-tts&use_google_only_voices=1`;
            }
        }

        audio.setAttribute("name", nameForExtensionCreatedElements);

        icon.appendChild(audio);

        parent.appendChild(icon);

        elementleriEkle(parent, elementOlustur("br", 2));

        icon = null;
        audio = null;

        let icerikSaranDiv = document.createElement('div');
        icerikSaranDiv.style.width = parent.style.width;
        icerikSaranDiv.setAttribute("name", nameForExtensionCreatedElements);

        let sayac = 0;

        doc.querySelector("ol[class='eQJLDd']").childNodes.forEach(p => {
            try {
                let meaningElement = p.querySelector("div[data-dobid='dfn']");
                let exampleElement = (meaningElement) ? (meaningElement.nextElementSibling) ? (meaningElement.nextElementSibling.getAttribute("class") === "vmod") ? meaningElement.nextElementSibling : null : null : null;

                if (!meaningElement)
                    return;

                sayac++;

                icerikSaranDiv.innerHTML += sayac + ")" + meaningElement.textContent + "<br><br>";

                //tmp = p.querySelector("div[class='vmod']");
                if (!exampleElement)
                    return;

                if (exampleElement.textContent.trim() === "")
                    return;
                //console.debug(p.parentElement, tmp?.textContent, tmp?.nextElementSibling);

                let boldElement = elementOlustur("span", 1, { attributes: { name: nameForExtensionCreatedElements, style: "color:rgb(3, 138, 255)" }, "textContent": "Örnek -> " });
                let exampleSpan = elementOlustur("b", 1, { attributes: { name: nameForExtensionCreatedElements }, "textContent": exampleElement.textContent });
                let satirlar = elementOlustur("br", 2);

                elementleriEkle(icerikSaranDiv, boldElement, exampleSpan);
                elementleriEkle(icerikSaranDiv, satirlar);

                //icerikSaranDiv.innerHTML += "<br/><b style='color:blue;'>Örnek -> </b><span>" + exampleElement.textContent + "</span><br/><br/>";
            } catch (hata) {
                console.error(hata);
            }
        });

        parent.appendChild(icerikSaranDiv);

        kelime = null;
        icerikSaranDiv = null;
        sayac = null;
    }

    async function loadSettings() {
        let _settings = await browser.storage.local.get();

        if (!_settings.default || !_settings.modifiers) {
            settings = makeSettingsDefault();
            return;
        } else if (_settings.modifiers.length == 0) {
            settings = makeSettingsDefault();
            return;
        }

        settings.modifiers = _settings.modifiers;
        settings.default = _settings.default;
    }

    function updateSettings(e) {
        let _settings = e;

        //browser.storage.local.onChanged sadece değişen key ve value'yu verdiğinden varsayılan üstüne yazıyoruz.

        for (key in _settings) {
            settings[key] = _settings[key].newValue;
        }

        _settings = null;
    }

    function makeSettingsDefault() {
        browser.storage.local.set({ default: "tdk", modifiers: ["none"] });
        return { default: "tdk", modifiers: ["none"] };
    }

    function checkSettings() {
        if (!settings) {
            console.debug("Settings, boş olduğundan varsayılana ayarlandı.");
            settings = makeSettingsDefault();
        } else if (!settings["default"] || settings["default"] == "" || !settings["modifiers"]) {
            console.debug("Settings, modifiers veya default değeri boş olduğundan varsayılana ayarlandı.");
            settings = makeSettingsDefault();
        }
        else if (settings["modifiers"].length == 0) {
            //Varsayılan default değeri var ise metodu çağırabiliriz.
            if (settings["default"] == "tdk") {
                settings = makeSettingsDefault();
                console.debug("Settings, modifiers dizisinin uzunluğu 0 olduğundan varsayılana ayarlandı.");
            }
            else {
                settings["modifiers"] = ["none"];
            }
        }
    }

    function YanitiAl(mesaj) {
        if (!mesaj) {
            //console.debug("YanitiAl() -> \"mesaj\" boş olduğundan işleme devam edilmedi.");
            return;
        }
        else if (mesaj.type == "ContextMenudenCevir") {
            //Kutucukları sil.
            deleteAllElements();
            //console.debug("YanitiAl() -> Context menu çağrıldığından tüm sözlük elementleri silindi.");
            return;
        }
        //Gereksiz mi ??
        else if (mesaj.tur != "TDK_Anlam" && mesaj.tur != "Google_Anlam") {
            //console.debug("YanitiAl() -> mesaj.tur bilinen değerlerden farklı olduğundan işleme devam edilmedi.");
            return;
        }

        //#region Elementlerin oluşturulması

        var kutucuk = document.createElement('div');
        kutucuk.id = "ts_kutucuk";
        kutucuk.className = "ts_kutucuk ts_kutucukDiv ts_kutucukDivAnimasyon";
        kutucuk.setAttribute("name", nameForExtensionCreatedElements);

        if (mesaj.isContextMenu == true) {
            kutucuk.classList.add("ts_kutucukCM");
        }
        else {
            kutucuk.style.left = (mesaj.x - 10) + "px";
            kutucuk.style.top = (mesaj.y + 10) + "px";
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

            if (kutucukSurukleniyor) {
                kutucukSurukleniyor = false;
                return;
            }

            //Tüm sözlük alanlarını göster.
            Object.values(document.getElementsByClassName("ts_diyalog")).forEach(p => {
                p.style.visibility = "";
                p.style.transform = "";
            });

            this.remove();

            document.getSelection().removeAllRanges();
        }

        var resim = document.createElement('img');
        resim.className = "ts_kutucuk ts_kutucukResmi ts_kutucukImgAnimasyon";
        resim.id = "ts_kutucukResmi";
        resim.src = browser.runtime.getURL("icons/iconY.png");

        resim.onanimationend = function () {
            this.classList.remove("ts_kutucukImgAnimasyon");
        }

        resim.setAttribute("draggable", false);
        resim.setAttribute("name", nameForExtensionCreatedElements);

        kutucuk.appendChild(resim);

        resim = null;

        var alan = document.createElement('div');
        alan.id = "ts_diyalog";
        alan.className = "ts_diyalog";
        alan.setAttribute("name", nameForExtensionCreatedElements);
        alan.setAttribute("kelime", mesaj.kelime);

        if (mesaj.isContextMenu == true) {
            alan.classList.add("ts_diyalogCM");
        }
        else {
            alan.style.left = mesaj.x + "px";
            alan.style.top = mesaj.y + "px";
        }

        var tutmayeri = document.createElement("div");
        tutmayeri.setAttribute("name", nameForExtensionCreatedElements);
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
                this.parentElement.classList.remove("ts_diyalogCM");

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
        kapamaTusu.setAttribute("name", nameForExtensionCreatedElements);

        kapamaTusu.onmousedown = function (e) {
            e.preventDefault();
            document.getSelection().removeAllRanges();
        };

        kapamaTusu.onmouseup = function (e) {
            e.preventDefault();
        }

        kapamaTusu.onclick = function (e) {
            var el = document.getElementById("ts_diyalog");
            if (el)
                el.remove();
            el = null;
        };

        var bilgiWrapper = document.createElement("div");
        bilgiWrapper.setAttribute("name", nameForExtensionCreatedElements);
        bilgiWrapper.className = "ts_bilgiDiv";

        var bilgiAlani = document.createElement("p");
        bilgiAlani.setAttribute("name", nameForExtensionCreatedElements);
        bilgiAlani.className = "P_Anlamyeri";

        bilgiWrapper.appendChild(bilgiAlani);

        //#endregion

        bilgiAlani.innerText = "";

        if (mesaj.tur == "TDK_Anlam") {
            //TDK ile gösterim yeri
            var sayac = 1;

            var satirlar;

            if (!mesaj.kelime) {
                return;
            } else if (mesaj.anlamlarListe && mesaj.orneklerListe) {
                //İlk önce kelimeyi yazalım.

                var ustKelime = elementOlustur("b", 1, { attributes: { name: nameForExtensionCreatedElements }, "textContent": mesaj.kelime.charAt(0).toUpperCase() + mesaj.kelime.slice(1) });

                if (!ustKelime) {
                    console.error("Kelimenin en üste yazıldığı kısımda \"b\" elementi oluşturulamadı.");
                    return;
                }

                bilgiAlani.appendChild(ustKelime);

                ustKelime = null;

                satirlar = elementOlustur("br", 2);

                if (!satirlar) {
                    console.error("2 tane \"br\" elementi oluşturulamadı.");
                    return;
                }

                if (!elementleriEkle(bilgiAlani, satirlar)) {
                    console.error("Elementler eklenemedi.");
                    return;
                }

                satirlar = null;

                if (mesaj.anlamlarListe.length > 0) {
                    var anlamlarEl = elementOlustur("b", 1, { attributes: { name: nameForExtensionCreatedElements }, style: "color:orange", textContent: "Anlam(lar):" });

                    if (!anlamlarEl) {
                        console.error("\"anlamlarEl\" elementi oluşturulamadı.");
                        return;
                    }

                    bilgiAlani.appendChild(anlamlarEl);

                    anlamlarEl = null;

                    satirlar = elementOlustur("br", 2);

                    if (!satirlar) {
                        console.error("2 tane \"br\" elementi oluşturulamadı.");
                        return;
                    }

                    if (!elementleriEkle(bilgiAlani, satirlar)) {
                        console.error("2 tane \"br\" elementi eklenemedi.");
                        return;
                    }

                    satirlar = null;

                    //Anlamlar burada ekleniyor.
                    Object.values(mesaj.anlamlarListe).forEach(a => {
                        if (a.anlam) {
                            elementleriEkle(bilgiAlani, elementOlustur("span", 1, { attributes: { name: nameForExtensionCreatedElements }, textContent: sayac.toString() + ")" + a.anlam }), elementOlustur("br", 2));
                        }

                        sayac++;
                    });
                }

                if (mesaj.orneklerListe.length > 0) {

                    sayac = 1;

                    var orneklerYazisiEl = elementOlustur("b", 1, { attributes: { name: nameForExtensionCreatedElements }, style: "color:orange", "textContent": "Örnekler:" });

                    if (!orneklerYazisiEl) {
                        console.error("\"orneklerYazisiEl\" elementi oluşturulamadı.");
                        return;
                    }

                    bilgiAlani.appendChild(orneklerYazisiEl);

                    orneklerYazisiEl = null;

                    satirlar = elementOlustur("br", 2);

                    if (!satirlar) {
                        console.error("2 tane \"br\" elementi oluşturulamadı.");
                        return;
                    }

                    if (!elementleriEkle(bilgiAlani, satirlar)) {
                        console.error("2 tane \"br\" elementi eklenemedi.");
                        return;
                    }

                    satirlar = null;

                    var mliste;

                    Object.values(mesaj.orneklerListe).forEach(a => {
                        //continue burada çalışmadığından böyle yazdık.
                        if (a.ornek) {
                            if (a.ornek.toLowerCase().indexOf(mesaj.kelime.toLowerCase()) != -1) {

                                mliste = a.ornek.toLowerCase().matchAll(mesaj.kelime.toLowerCase());

                                var indexListesi = [];

                                for (match of mliste) {
                                    indexListesi.push(match.index);
                                }

                                mliste = null;

                                if (indexListesi.length > 0) {
                                    var metin = elementOlustur("p", 1, { attributes: { name: nameForExtensionCreatedElements } });

                                    if (!metin) {
                                        console.error("\"metin\" elementi oluşturulamadı.");
                                        return;
                                    }

                                    var sayac2 = 0;

                                    var ornekNumaraEl = elementOlustur("span", 1, { attributes: { name: nameForExtensionCreatedElements }, textContent: sayac.toString() + ")" });

                                    if (!ornekNumaraEl) {
                                        console.error("\"ornekNumaraEl\" elementi oluşturulamadı.");
                                        return;
                                    }

                                    metin.appendChild(ornekNumaraEl);

                                    ornekNumaraEl = null;

                                    var ornekEl = elementOlustur("span", 1, { attributes: { name: nameForExtensionCreatedElements } });

                                    if (!ornekEl) {
                                        console.error("\"ornekEl\" elementi oluşturulamadı.");
                                        return;
                                    }

                                    while (sayac2 != a.ornek.length) {
                                        //await new Promise(res => { setTimeout(res,10); });

                                        //Aranan kelime ise yeşil ile yaz.
                                        if (indexListesi.includes(sayac2)) {
                                            metin.appendChild(ornekEl);

                                            var kelimeEl = elementOlustur("b", 1, { attributes: { name: nameForExtensionCreatedElements }, style: "color:green", "textContent": a.ornek.substring(sayac2, sayac2 + mesaj.kelime.length) });

                                            if (!kelimeEl) {
                                                console.error("\"kelimeEl\" elementi oluşturulamadı.");
                                                continue;
                                            }

                                            metin.appendChild(kelimeEl);

                                            sayac2 += mesaj.kelime.length;

                                            ornekEl = elementOlustur("span", 1, { attributes: { name: nameForExtensionCreatedElements } });

                                            if (!ornekEl) {
                                                console.error("\"ornekEl\" elementi oluşturulamadı.");
                                                return;
                                            }
                                        }
                                        //Döngüye girmesin diye yaptım.
                                        else if (!sayac || sayac2 >= 5000) {
                                            break;
                                        }
                                        //Normal bir şekilde karakterleri ekle.
                                        else {
                                            ornekEl.textContent += a.ornek[sayac2];
                                            sayac2++;
                                        }
                                    }

                                    if (ornekEl.textContent != "")
                                        metin.appendChild(ornekEl);

                                    bilgiAlani.appendChild(metin);

                                    ornekEl = null;

                                    sayac2 = null;

                                    bilgiAlani.appendChild(elementOlustur("br"));

                                    if (a.yazar) {
                                        elementleriEkle(bilgiAlani, elementOlustur("b", 1, { attributes: { name: nameForExtensionCreatedElements }, style: "color:rgb(252, 186, 3)", "textContent": a.yazar }), elementOlustur("br", 2));
                                    }
                                }

                                indexListesi = null;
                            } else {
                                elementleriEkle(bilgiAlani, elementOlustur("span", 1, { attributes: { name: nameForExtensionCreatedElements }, "textContent": sayac.toString() + ")" + a.ornek }), elementOlustur("br"));

                                if (a.yazar) {
                                    elementleriEkle(bilgiAlani, elementOlustur("br"), elementOlustur("b", 1, { attributes: { name: nameForExtensionCreatedElements }, style: "color:rgb(252, 186, 3)", "textContent": a.yazar }), elementOlustur("br"));
                                }

                                bilgiAlani.appendChild(elementOlustur("br"));
                            }
                        }

                        sayac++;
                    });

                    mliste = null;
                    sayac = null;
                }
            }
        }
        else if (mesaj.tur == "Google_Anlam") {
            //console.debug("YanitiAl() -> mesaj.tur = \"Google_Anlam\"");
            try {
                AnlamiCikar(new DOMParser().parseFromString(mesaj.doc, 'text/html'), bilgiAlani);
            } catch (error) {
                console.error("YanitiAl() -> \"Google\"'dan çeviri -> " + error);
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

        tutmayeri = null;
        alan = null;
        bilgiWrapper = null;
        bilgiAlani = null;
        kapamaTusu = null;

        return Promise.resolve();
    }

    function Search(kelime, Ex, Ey) {
        checkSettings();

        browser.runtime.sendMessage({
            message: kelime,
            tur: (settings["default"] == "tdk") ? "TDK_Anlam_Ara" : "Google_Anlam_Ara",
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
        Object.values(document.getElementsByClassName("ts_kutucuk")).forEach(p => {
            p.remove();
        });
        Object.values(document.getElementsByClassName('ts_diyalog')).forEach(p => {
            p.remove();
        });
    }

    function deleteBoxes() {
        Object.values(document.getElementsByClassName("ts_kutucuk")).forEach(p => {
            p.remove();
        });
    }

    const getSelectedText = () => {
        const element = document.activeElement;
        const isInTextField = element.tagName === "INPUT" || element.tagName === "TEXTAREA";
        const selectedText = isInTextField
            ? element.value.substring(element.selectionStart, element.selectionEnd)
            : window.getSelection()?.toString() ?? "";
        return selectedText.trim().toLowerCase();
    };

    const getSelectedTextIfThereIsNoDialog = () => {
        let text = getSelectedText();
        //console.debug(text);
        if (document.querySelector(`div[class='ts_diyalog']`))
            return { word: text, info: "Didn't search the word because there is a dialog already.Word: " + text };
        return { word: text, info: (text === "") ? "Didn't do anything because the word was empty." : "" };
    };

    function window_onmouseup(e) {
        let clickedElement = e.target ?? document.activeElement;

        let name = clickedElement.getAttribute("name");

        if (name === nameForExtensionCreatedElements)
            return;
        else
        {
            deleteAllElements();

            //console.debug("All dictionary elements are deleted because the clicked element's name wasn't a name for extension created elements.");
        }

        try {
            modifiersArePressed = checkModifiers(e);
        } catch (error) {
            console.error(error);
        }

        if (!modifiersArePressed) {
            //console.debug("Modifierlar basılı olmadığından geri dönüldü.");
            return;
        }

        wordObj = getSelectedTextIfThereIsNoDialog();

        if (wordObj.info != "") {
            //console.debug(wordObj.info);
            return;
        }
        //Return if not clicked with left mouse button.
        else if (e.button != 0)
            return;

        Search(wordObj.word, e.clientX, e.clientY);
    }

    browser.runtime.onMessage.addListener(YanitiAl);

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