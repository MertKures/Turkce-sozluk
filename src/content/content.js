import { addElements, createElement, getSettings, getDefaultSettings } from 'modules/utils.js';

let settings = getDefaultSettings();

getSettings().then(_settings => settings = _settings);

let dragDivMouseClickX,
    dragDivMouseClickY,
    windowMouseDown,
    dragDiv,
    boxIsMouseDown = false,
    boxMouseClickX = 0,
    boxMouseClickY = 0,
    dialog,
    boxDiv,
    boxIsBeingDragged = true,
    insideDialogOrBoxMouseUp = false,
    selectedText = "";

//Google çeviri için kullanılacak "doc" parametresi background_scriptten gelecek.
function createGoogleUIFromHTMLDoc(doc, parent) {
    let query = doc.querySelector("[data-dobid='hdw']");

    if (!query) {
        throw "[data-dobid='hdw'] bulunamadı.";
    }

    let word = query.textContent;

    if (word.trim().toLocaleLowerCase() === "ne demek?") {
        throw "Geçersiz kelime seçildiğinden sadece 'ne demek?' cümlesi aratıldı ve elementler eklenmedi."
    }

    let _extraInfoAfterWord = doc.querySelector("ol[class='eQJLDd']").previousElementSibling?.textContent ?? "";
    let extraInfoAfterWord = (_extraInfoAfterWord) ? ' •' + _extraInfoAfterWord : "";

    addElements(parent, createElement("b", 1, { textContent: word.toUpperCase() + extraInfoAfterWord }));

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

    let contentWrapper = document.createElement('div');
    contentWrapper.style.width = parent.style.width;

    let meaningCounter = 0;

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

            addElements(contentWrapper, boldElement, exampleSpan, createElement("br", 2));
        } catch (err) {
            console.error(err);
        }
    });

    parent.appendChild(contentWrapper);
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

    let ustKelime = createElement("b", 1, { "textContent": message.word.charAt(0).toUpperCase() + message.word.slice(1) });

    if (!ustKelime) {
        console.error("Kelimenin en üste yazıldığı kısımda \"b\" elementi oluşturulamadı.");
        return;
    }

    parentElement.appendChild(ustKelime);

    addElements(parentElement, createElement("br", 2));

    let meaningElement = createElement("b", 1, { style: "color:orange", textContent: "Anlam(lar):" });

    if (!meaningElement) {
        console.error("Couldn't create \"meaningElement\".");
        return;
    }

    parentElement.appendChild(meaningElement);

    meaningElement = null;

    addElements(parentElement, createElement("br", 2));

    let meaningCounter = 1;

    //Meanings

    message.anlamlarListe.forEach(a => {
        if (a.anlam) {
            addElements(parentElement, createElement("span", 1, { textContent: meaningCounter.toString() + ")" + a.anlam }), createElement("br", 2));
        }

        meaningCounter++;
    });

    //Examples

    let examplesElement = createElement("b", 1, { style: "color:orange", "textContent": "Örnekler:" });

    if (!examplesElement) {
        console.error("Couldn't create \"examplesElement\".");
        return;
    }

    parentElement.appendChild(examplesElement);

    examplesElement = null;

    addElements(parentElement, createElement("br", 2));

    let exampleCounter = 1;

    for (let obj of message.orneklerListe) {
        let example = obj.ornek;
        let writer = obj.yazar;

        if (!example)
            continue;
        //Renklendirebileceğimiz aynı kelime yoksa olduğu gibi yaz.
        else if (!example.toLocaleLowerCase().includes(message.word.toLocaleLowerCase())) {
            addElements(parentElement, createElement("span", 1, { textContent: exampleCounter.toString() + ")" + example }), createElement("br"));

            if (writer) {
                addElements(parentElement, createElement("br"), createElement("b", 1, { style: "color:rgb(252, 186, 3)", "textContent": writer }), createElement("br"));
            }

            parentElement.appendChild(createElement("br"));

            exampleCounter++;

            continue;
        }

        let orderedElementList = {};
        let orderedListIndex = 0;
        let lastIndex = 0;
        let numberEl = createElement("span", 1, { textContent: exampleCounter.toString() + ")" });

        orderedElementList[orderedListIndex] = numberEl;

        orderedListIndex++;

        for (let match of example.toLocaleLowerCase().matchAll(message.word.toLocaleLowerCase())) {
            //Büyük küçük harfi korumak için substring ile kelimeyi aldık.
            let word = example.substring(match.index, match.index + message.word.length);

            let substring = createElement("span", 1, { textContent: example.substring(lastIndex, match.index) });

            //Kelimeyi renkli olarak ekle.
            let coloredWordEl = createElement("b", 1, { textContent: word, style: "color:green" });

            orderedElementList[orderedListIndex] = substring;

            orderedListIndex++;

            orderedElementList[orderedListIndex] = coloredWordEl;

            orderedListIndex++;

            lastIndex = match.index + message.word.length;
        }

        let lastSubstringEl = createElement("span", 1, { textContent: example.substring(lastIndex) });

        orderedElementList[orderedListIndex] = lastSubstringEl;

        for (let index in orderedElementList) {
            let element = orderedElementList[index];

            addElements(parentElement, element);
        }

        if (writer) {
            addElements(parentElement, createElement("br", 2), createElement("b", 1, { style: "color:rgb(252, 186, 3)", textContent: writer }));
        }

        addElements(parentElement, createElement("br", 2));

        exampleCounter++;
    }
}

function initializeDialog(message) {
    boxDiv = document.createElement('div');
    boxDiv.id = "ts_box";
    boxDiv.className = "ts_boxDivAnimation";

    if (message.isContextMenu == true) {
        boxDiv.classList.add("ts_boxCM");
    }
    else {
        boxDiv.style.left = (message.x - 10) + "px";
        boxDiv.style.top = (message.y + 10) + "px";
    }

    boxDiv.onanimationend = function () {
        this.classList.remove("ts_boxDivAnimation");
    }

    boxDiv.onmousedown = function (e) {
        //Prevents texts on the background to be highlighted
        e.preventDefault();

        //Seçili kelimeyi sildiğimizden dolayı mouse'u hareket ettirdiğimizde "Simple translate" eklentisi ekstra kutucuk çıkaramıyor.
        document.getSelection().removeAllRanges();

        //Eğer context menuden gelmiş ise sürüklendiğinde left,top ve transform değerlerinden etkilenmesini engelliyor.
        this.classList.remove("ts_boxCM");

        //Eğer context menuden gelmiş ise kutucuğa ilk tıklandığında kutucuğun yok olmamasını sağlıyor.
        //left ve top değeri "calc(50%)" olduğundan classList'ten "ts_boxCM" kaldırılınca left ve top boş kalıyor ve kutucuğun yok olmasına sebep oluyordu.
        this.style.left = (e.clientX - e.layerX) + "px";
        this.style.top = (e.clientY - e.layerY) + "px";

        boxMouseClickX = e.layerX;
        boxMouseClickY = e.layerY;

        boxIsMouseDown = true;
    }

    boxDiv.onmouseup = function (e) {
        e.preventDefault();

        insideDialogOrBoxMouseUp = true;

        if (boxIsBeingDragged) {
            boxIsBeingDragged = false;
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

    let imageElement = document.createElement('img');
    imageElement.className = "ts_boxImg ts_boxDivImgAnimation";
    imageElement.id = "ts_boxImg";
    imageElement.src = browser.runtime.getURL("icons/64/icon.png");

    imageElement.onanimationend = function () {
        this.classList.remove("ts_boxImgAnimation");
    }

    imageElement.setAttribute("draggable", false);

    boxDiv.appendChild(imageElement);

    imageElement = null;

    dialog = document.createElement('div');
    dialog.id = "ts_dialog";
    dialog.setAttribute("word", message.word);

    dialog.onmouseup = function (e) {
        insideDialogOrBoxMouseUp = true;
    }

    if (message.isContextMenu == true) {
        dialog.classList.add("ts_dialogCM");
    }
    else {
        dialog.style.left = message.x + "px";
        dialog.style.top = message.y + "px";
    }

    dragDiv = document.createElement("div");
    dragDiv.className = "ts_dragDiv";

    dragDiv.onmousedown = function (e) {
        e.preventDefault();

        document.getSelection().removeAllRanges();

        if (e.button == '0') {
            dragDivMouseClickX = e.layerX;
            dragDivMouseClickY = e.layerY;

            windowMouseDown = true;

            dragDiv = this;

            //Eğer context menuden gelmiş ise sürüklendiğinde left,top ve transform değerlerinden etkilenmesini engelliyor.
            this.parentElement.classList.remove("ts_dialogCM");

            //Eğer context menuden gelmiş ise tutma yerine ilk tıklandığında diyaloğun yok olmamasını sağlıyor.
            this.parentElement.style.left = (e.clientX - e.layerX) + "px";
            this.parentElement.style.top = (e.clientY - e.layerY) + "px";
        }
    };

    dragDiv.onmouseup = function (e) {
        e.preventDefault();
        windowMouseDown = false;
        dragDiv = null;
    };

    let closeButton = document.createElement('div');
    closeButton.className = "ts_closeButton";
    closeButton.textContent = "X";

    closeButton.onmousedown = function (e) {
        e.preventDefault();
        document.getSelection().removeAllRanges();
    };

    closeButton.onmouseup = function (e) {
        e.preventDefault();
    }

    closeButton.onclick = function (e) {
        let el = document.getElementById("ts_dialog");
        if (el)
            el.remove();
        el = null;
    };

    let infoWrapper = document.createElement("div");
    infoWrapper.className = "ts_infoWrapper";

    let info = document.createElement("p");
    info.className = "ts_info";

    infoWrapper.appendChild(info);

    dragDiv.appendChild(closeButton);

    dialog.appendChild(dragDiv);

    dialog.appendChild(infoWrapper);

    //Kutucuğun çıkmasını beklediğimizden saklıyoruz.
    dialog.style.visibility = "hidden";

    document.body.appendChild(dialog);

    document.body.appendChild(boxDiv);

    return info;
}

function onMessage(message) {
    if (!message) return;
    else if (message.type === "search_from_context_menu") { deleteAllElements(); search(message); return; }
    else if (message.type === "getSelectedText") return Promise.resolve(selectedText);
}

async function search(message, Ex, Ey) {
    let parameterIsJustWord = message.word ? false : true;
    let word;
    let newObjects = {};

    if (parameterIsJustWord)
        word = message;
    else {
        word = message.word;

        newObjects = { ...message };
    }

    if (Ex && Ey) {
        newObjects.x = Ex;
        newObjects.y = Ey;
    }

    let result = await browser.runtime.sendMessage({
        word: word,
        type: "search"
    }).catch(err => {
        console.error("search -> Error: " + err);
    });

    if (!result)
        return;

    let newResult = { ...result, ...newObjects };

    let paragraphElement = initializeDialog(newResult);

    if (result.type == "response_from_tdk") {
        try {
            createTDKUI(newResult, paragraphElement);
        } catch (error) {
            deleteAllElements();
        }
    }
    else if (result.type == "response_from_google") {
        try {
            createGoogleUIFromHTMLDoc(new DOMParser().parseFromString(newResult.doc, 'text/html'), paragraphElement);
        } catch (error) {
            deleteAllElements();
            return;
        }
    }
}

async function updateSettings() {
    settings = await getSettings();
}

//true => çevirme işlemlerine devam et, false => gereken koşullar sağlanmadığından işlemleri durdur.
async function checkModifiers(e) {
    let modifierKeys = ["alt", "shift", "ctrl"];
    let values = {};

    for (let item of modifierKeys) {
        values[item] = e[item + "Key"];
    }

    await updateSettings();

    if ((settings.modifiers.length == 1 && settings.modifiers[0] == "none") || settings.modifiers.length == 0)
        return true;

    for (let modifier of settings.modifiers) {
        if (values[modifier] == false)
            return false;
    }

    return true;
}

function deleteAllElements() {
    if (boxDiv) {
        boxDiv.remove();
        boxDiv = null;
    }

    if (dialog) {
        dialog.remove();
        dialog = null;
    }
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
    if (document.querySelector(`div[class='ts_dialog']`))
        return { word: text, info: "There is a dialog already.Selected text: " + text };
    return { word: text, info: (text === "") ? "Word was empty." : "" };
};

async function window_onmouseup(e) {
    if (insideDialogOrBoxMouseUp) {
        insideDialogOrBoxMouseUp = false;
        return;
    }
    else deleteAllElements();

    //Left Click
    if (e.button !== 0) return;

    let wordObj = getSelectedTextIfThereIsNoDialog();

    selectedText = wordObj.word;

    //There is an error.
    if (wordObj.info !== "") {
        //console.debug(wordObj.info);
        return;
    }

    let modifiersArePressed = false;

    try {
        modifiersArePressed = await checkModifiers(e);
    } catch (error) {
        console.error(error);
    }

    if (!modifiersArePressed) return;

    search(wordObj.word, e.clientX, e.clientY);
}

window.addEventListener("mouseup", window_onmouseup);
window.addEventListener('mousemove', function (e) {
    if (e.buttons == '1') {
        if (dragDiv && windowMouseDown == true) {
            dragDiv.parentElement.style.left = (e.clientX - dragDivMouseClickX) + 'px';
            dragDiv.parentElement.style.top = (e.clientY - dragDivMouseClickY) + 'px';
        }

        if (boxDiv && boxIsMouseDown == true) {
            boxIsBeingDragged = true;
            boxDiv.style.left = (e.clientX - boxMouseClickX) + "px";
            boxDiv.style.top = (e.clientY - boxMouseClickY) + "px";
        }
    } else {
        boxIsMouseDown = false;
        boxIsBeingDragged = false;
    }
}, true);

browser.runtime.onMessage.addListener(onMessage);