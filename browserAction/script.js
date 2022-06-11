//https://sozluk.gov.tr/gts?ara=Hoşgörü
//this.readyState === 4 && this.status === 200

var port = browser.runtime.connect();

function portOnMessage(message) {
    //console.debug(message, "browserAction portuna mesaj geldi.");
    if (message.type == "ContextMenudenCevir")
        ContextMenuHandler(message);
}

port.onMessage.addListener(portOnMessage);

var xhr;

function BoslugaGoreKelimeAra(istenen, cumle) {
    if (!istenen || !cumle) {
        return null;
    }

    var kelime = [];

    var sayac = 0;

    var sonIndex = 0;

    var indexKayması = 0;

    var tmp;

    for (a of cumle) {
        indexKayması = 0;
        if (a == " ") {
            tmp = cumle.substring(sonIndex, sayac);
            if (tmp?.[0] == " ") {
                tmp = tmp.substring(1);
                indexKayması++;
            }
            if (tmp?.toLowerCase() == istenen) {
                kelime.push({ bi: sonIndex + indexKayması, si: sayac });
            }
            sonIndex = sayac;
        } else if (sayac == cumle.length - 1) {
            sayac++;
            tmp = cumle.substring(sonIndex, sayac).trim();
            if (tmp?.toLowerCase() == istenen) {
                kelime.push({ bi: sonIndex, si: sayac });
            }
            sonIndex = sayac;
        }
        sayac++;
    }
    tmp = null;

    sonIndex = null;
    indexKayması = null;

    sayac = 0;
    var gecici;

    //indexe göre düzenleme yapıyoruz.Küçükten büyüğe doğru.
    for (var a = 0; a < kelime.length; a++) {
        for (var i = 0; i < kelime.length; i++) {
            if (i + 1 < kelime.length) {
                if (kelime[i].bi > kelime[i + 1].bi) {
                    gecici = kelime[i];
                    kelime[i] = kelime[i + 1];
                    kelime[i + 1] = gecici;
                    gecici = null;
                }
            }
        }
    }
    sayac = null;
    return kelime;
}

var cevirilecekTA = document.getElementById('cevirilecekTA');
cevirilecekTA.oninput = function() {
    if (!this.value.trim()) {
        cevirilenAlan.innerHTML = "";
    }
    if (looptaMi == true) {
        baslangic = +new Date();
    } else {
        baslangic = +new Date();
        Sayac();
    }
}
var cevirilenAlan = document.getElementById('cevirilenAlan');
var gcevirilenAlan = document.getElementById('gcevirilenAlan');
var gcevirilecekTA = document.getElementById('gcevirilecekTA');
gcevirilecekTA.oninput = function() {
    if (!this.value?.trim()) {
        gcevirilenAlan.innerHTML = "";
    }
    if (looptaMi == true) {
        baslangic = +new Date();
    } else {
        baslangic = +new Date();
        Sayac();
    }
};
var googleKapsayici = document.getElementById('GoogleKapsayici');
googleKapsayici.hidden = true;
var tdkKapsayici = document.getElementById('TDKKapsayici');
var google = document.getElementById('Google');
var tdk = document.getElementById('TDK');
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

var baslangic = +new Date();
var looptaMi = false;

async function Sayac() {
    looptaMi = true;
    while ((+new Date() - baslangic) <= 300) {
        await new Promise(resolve => {
            setTimeout(resolve, 100);
        });
    }
    looptaMi = false;
    if (tdkKapsayici.hidden == false) {
        if (cevirilecekTA.value.trim().length > 0) {
            TDKdenCevir(cevirilecekTA.value.trim());
        }
    } else {
        if (gcevirilecekTA.value.trim().length > 0) {
            GoogledanCevir(gcevirilecekTA.value.trim());
        }
    }
}

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

    var count = (_count)?((_count > 1)?_count : ((_count == 1)?1 : false)) : 1;

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
                    console.error("The value of property \"" + key + "\" was " + ((!properties[key])?"empty" : properties[key]) + ".Error message : " + error);
                }
            } else {
                try {
                    for (var keyAttr in properties[key]) {
                        el.setAttribute(keyAttr, properties[key][keyAttr]);
                    }
                } catch (error) {
                    console.error("The value of attribute \"" + keyAttr + "\" was " + ((!properties[key][keyAttr])?"empty" : properties[key][keyAttr]) + ".Error message : " + error);
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

        for (var a = 0; a < ((arr)?childs[i].length : 1); a++) {
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

function TDKdenCevir(mesaj) {
    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        //Bir sıkıntı çıkmadıysa devam et.
        if (this.readyState == XMLHttpRequest.DONE && (xhr.status == 0 || (xhr.status >= 200 && xhr.status < 400))) {
            var liste = JSON.parse(xhr.responseText);
            //Hata oluştuysa bitir.
            if (liste.error) {
                cevirilenAlan.innerHTML = "Sonuç bulunamadı";

                liste = null;

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
                    anlam: (a.anlam)?a.anlam : "",
                    fiil: (a.fiil)?a.fiil : "",
                    isim: (a.ozelliklerListe)?(a.ozelliklerListe[0])?(a.ozelliklerListe[0].tam_adi)?a.ozelliklerListe[0].tam_adi : "" : "" : ""
                });

                if (a.orneklerListe) {
                    a.orneklerListe.forEach(b => {
                        orneklerListe.push({
                            ornek: (b.ornek)?b.ornek : "",
                            yazar: (b.yazar)?(b.yazar[0])?(b.yazar[0].tam_adi)?b.yazar[0].tam_adi : "" : "" : ""
                        });
                    });
                }
            });

            liste = null;

            var sayac = 1;

            cevirilenAlan.innerHTML = "";

            cevirilenAlan.innerHTML += "<b style=\"color:orange\">Anlam(lar):</b><br/><br/>";

            for (c of anlamlarListe) {
                cevirilenAlan.innerHTML += sayac.toString() + ")" + c.anlam + "<br/><br/>";

                sayac++;
            }

            anlamlarListe = null;

            sayac = 1;

            if (orneklerListe.length > 0) {
                var mliste;

                var sonIndex = 0;

                elementleriEkle(cevirilenAlan, elementOlustur("b", 1, {textContent: "Örnekler:", style:"color:orange"}), elementOlustur("br"));

                for (d of orneklerListe) {

                    mliste = d.ornek.toLowerCase().matchAll(mesaj.toLowerCase());

                    var indexListesi = [];

                    for (match of mliste) {
                        indexListesi.push(match.index);
                    }

                    mliste = null;

                    if (indexListesi.length > 0) {
                        var metin = elementOlustur("p", 1, { attributes: { name: "TSözlük_isim" } });

                        if (!metin) {
                            console.error("\"metin\" elementi oluşturulamadı.");
                            return;
                        }

                        var sayac2 = 0;

                        var ornekNumaraEl = elementOlustur("span", 1, { attributes: { name: "TSözlük_isim" }, textContent: sayac.toString() + ")" });

                        if (!ornekNumaraEl) {
                            console.error("\"ornekNumaraEl\" elementi oluşturulamadı.");
                            return;
                        }

                        metin.appendChild(ornekNumaraEl);

                        ornekNumaraEl = null;

                        var ornekEl = elementOlustur("span", 1, { attributes: { name: "TSözlük_isim" } });

                        if (!ornekEl) {
                            console.error("\"ornekEl\" elementi oluşturulamadı.");
                            return;
                        }

                        while (sayac2 != d.ornek.length) {
                            //await new Promise(res => { setTimeout(res,10); });

                            //Aranan kelime ise yeşil ile yaz.
                            if (indexListesi.includes(sayac2)) {
                                metin.appendChild(ornekEl);

                                var kelimeEl = elementOlustur("b", 1, { attributes: { name: "TSözlük_isim" }, style: "color:green", "textContent": d.ornek.substring(sayac2, sayac2 + mesaj.length) });

                                if (!kelimeEl) {
                                    console.error("\"kelimeEl\" elementi oluşturulamadı.");
                                    continue;
                                }

                                metin.appendChild(kelimeEl);

                                sayac2 += mesaj.length;

                                ornekEl = elementOlustur("span", 1, { attributes: { name: "TSözlük_isim" } });

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
                                ornekEl.textContent += d.ornek[sayac2];
                                sayac2++;
                            }
                        }

                        if (ornekEl.textContent != "")
                        {
                            metin.appendChild(ornekEl);

                            cevirilenAlan.appendChild(metin);

                            //cevirilenAlan.appendChild(elementOlustur("br"));
    
                            if (d.yazar) {
                                elementleriEkle(cevirilenAlan, elementOlustur("b", 1, { attributes: { name: "TSözlük_isim" }, style: "color:rgb(252, 186, 3)", "textContent": d.yazar }), elementOlustur("br", 1));
                            }
                        }

                        ornekEl = null;

                        sayac2 = null;
                    }

                    indexListesi = null;
                    /*if (d.ornek.includes(mesaj) == false) {
                        cevirilenAlan.innerHTML += sayac + ")" + d.ornek + "<br/>";

                        cevirilenAlan.innerHTML += ((d.yazar)?("<b style=\"color:rgb(252, 186, 3)\">" + d.yazar + "<b/><br/>") : "") + "<br/>";
                        
                        sayac++;

                        continue;
                    }

                    //Kelimenin bulunduğu indexleri döndür.
                    mliste = BoslugaGoreKelimeAra(mesaj, d.ornek);
                    
                    if (!mliste?.[0]) {
                        continue;
                    }

                    cevirilenAlan.innerHTML += sayac + ")";

                    if (mliste.length > 1) {
                        cevirilenAlan.innerHTML += d.ornek.substring(0, mliste[0].bi) + "<b style=\"color:green\">" + mesaj + "</b>";
                        
                        for (var i = 1; i < mliste.length; i++) {
                            cevirilenAlan.innerHTML += d.ornek.substring(mliste[i - 1].si, mliste[i].bi) + "<b style=\"color:green\">" + mesaj + "</b>";
                        }
                    } else {
                        cevirilenAlan.innerHTML += d.ornek.substring(0, mliste[0].bi) + ("<b style=\"color:green\">" + mesaj + "</b>") + d.ornek.substring(mliste[0].si);
                    }

                    cevirilenAlan.innerHTML += "<br/>" + ((d.yazar)?("<b style=\"color:rgb(252, 186, 3)\">" + d.yazar + "<b/><br/>") : "") + "<br/>";
                    */
                    sayac++;
                }

                sonIndex = null;
                mliste = null;
            }

            sayac = null;
            orneklerListe = null;

            //xhr null yapınca null diye hata veriyor.
            //xhr = null;
        }
    }
    xhr.open("GET", "https://sozluk.gov.tr/gts?ara=" + mesaj);
    xhr.send();
}

//Google çeviri için kullanılacak "doc" parametresi background_scriptten gelecek.
function AnlamiCikar(doc) {
    let kelimeQuery = doc.querySelector("[data-dobid='hdw']");

    if (!kelimeQuery) {
        throw "[data-dobid='hdw'] bulunamadı.";
    }

    let kelime = kelimeQuery.textContent;

    elementleriEkle(gcevirilenAlan, elementOlustur("b", 1, { textContent: kelime.toUpperCase() }));

    elementleriEkle(gcevirilenAlan, elementOlustur("br", 2));

    let icon = document.createElement('img');
    icon.style.width = "24px";
    icon.style.height = "24px";
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

    icon.appendChild(audio);

    gcevirilenAlan.appendChild(icon);

    elementleriEkle(gcevirilenAlan, elementOlustur("br", 2));

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

            icerikSaranDiv.innerHTML += sayac + ")" + meaningElement.textContent + "<br><br>";

            //tmp = p.querySelector("div[class='vmod']");
            if (!exampleElement)
                return;

            if (exampleElement.textContent.trim() === "")
                return;
            //console.debug(p.parentElement, tmp?.textContent, tmp?.nextElementSibling);

            let boldElement = elementOlustur("span", 1, { attributes: { style: "color:rgb(3, 138, 255)" }, textContent: "Örnek -> " });
            let exampleSpan = elementOlustur("b", 1, { textContent: exampleElement.textContent });
            let satirlar = elementOlustur("br", 2);

            elementleriEkle(icerikSaranDiv, boldElement, exampleSpan);
            elementleriEkle(icerikSaranDiv, satirlar);

            //icerikSaranDiv.innerHTML += "<br/><b style='color:blue;'>Örnek -> </b><span>" + exampleElement.textContent + "</span><br/><br/>";
        } catch (hata) {
            console.error(hata);
        }
    });

    gcevirilenAlan.appendChild(icerikSaranDiv);

    kelime = null;
    icerikSaranDiv = null;
    sayac = null;
}

/*function AnlamiCikar(doc) {
    if (!doc.querySelector("[data-dobid='hdw']")) {
        return [1, "[data-dobid='hdw'] bulunamadı."];
    }

    var kelime = doc.querySelector("[data-dobid='hdw']").textContent

    var icon = document.createElement('img');
    icon.style.width = "24px";
    icon.style.height = "24px";
    icon.src = browser.runtime.getURL("/icons/hoparlör2.png");
    icon.onclick = function() {
        document.getElementsByTagName('audio')[0].play();
    }

    var audio = doc.querySelector("audio[jsname='QInZvb']");

    if (!audio) {
        audio = document.createElement('audio');
        audio.src = `https://www.google.com/speech-api/v1/synthesize?text=${kelime.replace(/·/g, '')}&enc=mpeg&lang=tr&speed=0.4&client=lr-language-tts&use_google_only_voices=1`;
    } else {
        if (!audio.src) {
            audio.src = `https://www.google.com/speech-api/v1/synthesize?text=${kelime.replace(/·/g, '')}&enc=mpeg&lang=tr&speed=0.4&client=lr-language-tts&use_google_only_voices=1`;
        }
    }
    icon.appendChild(audio);
    gcevirilenAlan.appendChild(icon);

    icon = null;
    audio = null;

    var icerikSaranDiv = document.createElement('div');
    icerikSaranDiv.style.width = gcevirilenAlan.style.width;

    var asd, sayac = 1;

    doc.querySelector("ol[class='eQJLDd']").childNodes.forEach(p => {
        try {
            asd = p.querySelector("div[data-dobid='dfn']");
            if (asd) {
                icerikSaranDiv.innerHTML += sayac + ")" + asd.innerText;
            } else {
                sayac++;
                return;
            }
            icerikSaranDiv.innerHTML += "<br/>";
            asd = p.querySelector("div[class='vmod']");
            if (asd) {
                if (parseInt(asd.innerText[0]) || parseInt(asd.innerText[1]) || asd.innerText[2] == ".") {
                    sayac++;
                    icerikSaranDiv.innerHTML += "<br/>";
                    return;
                }
                icerikSaranDiv.innerHTML += "Örnek -> " + asd.innerText + "<br/><br/>";
            } else {
                icerikSaranDiv.innerHTML += "<br/>";
            }
            sayac++;
        } catch (hata) {
            console.error(hata);
        }
    });
    gcevirilenAlan.appendChild(icerikSaranDiv);

    asd = null;
    kelime = null;
    icerikSaranDiv = null;
    sayac = null;
}*/

function GoogledanCevir(kelime) {
    gcevirilenAlan.innerHTML = "";
    //"https://www.google.com/search?q=" + kelime + "+ne+demek"

    fetch("https://www.google.com/search?q=" + kelime + "+ne+demek", {
            method: 'GET',
            credentials: 'omit'
        })
        .then((response) => response.text())
        .then((text) => {
            const _document = new DOMParser().parseFromString(text, 'text/html');

            AnlamiCikar(_document);
        }).catch(hata => {
            console.error(hata);
        });
}

function ContextMenuHandler(message) {
    //console.debug(message, "mesajı browserAction tarafından alındı.");

    let word = message.message.word;
    //let modifiers = message.message.modifiers;

    //Hangi arama motoru seçilmiş ise ona göre arama yap.
    if (message.searchSite == "tdk") {
        tdk.click();

        cevirilecekTA.value = word;

        try {
            TDKdenCevir(word);
        } catch (error) {
            console.error(error);
        }
    } else if (message.searchSite == "google") {
        google.click();

        gcevirilecekTA.value = word;

        try {
            GoogledanCevir(word);
        } catch (error) {
            console.error(error);
        }
    }
}