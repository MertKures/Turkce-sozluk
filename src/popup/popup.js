import { getSettings, createElement, addElements, getDefaultSettings, getSelectedTextOnActiveTab, searchEngineList } from 'modules/utils.js';

let settings = getDefaultSettings();

let timerStart = +new Date(),
    isInLoop = false,
    port;

const [input_tdk, tdk_result_div, google_result_div, input_google, search_engine_google_div, search_engine_tdk_div, search_engine_google_option, search_engine_tdk_option] = ["input_tdk", "tdk_result_div", "google_result_div", "input_google", "search_engine_google_div", "search_engine_tdk_div", "search_engine_google_option", "search_engine_tdk_option"].map(id => document.getElementById(id));

const SPEECH_API = new URL("https://www.google.com/speech-api/v1/synthesize?text=&enc=mpeg&lang=tr&speed=0.4&client=lr-language-tts&use_google_only_voices=1");
const ACTIVE_DIV_BACKGROUND_COLOR = 'rgba(80,80,80,0.9)';

async function waitForDisplayThenExecuteCallback(element, root, callback) {
    let observed = false;

    const observerCallback = (entries, options) => {
        entries.forEach(entry => {
            if (entry.intersectionRatio > 0) {
                callback();

                observer.disconnect();

                observed = true;
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, { root: root });
    observer.observe(element);

    // TODO: Add a timeout ?
    while (observed == false)
        await new Promise(res => setTimeout(res, 200));
}

async function initialize() {
    settings = await getSettings();

    input_tdk.oninput = function () {
        if (!input_tdk.value.trim()) {
            tdk_result_div.textContent = "";
        }
        if (isInLoop == true) {
            timerStart = +new Date();
        } else {
            timerStart = +new Date();
            searchAfterDelay();
        }
    }

    input_google.oninput = function () {
        if (!input_google.value?.trim()) {
            google_result_div.textContent = "";
        }
        if (isInLoop == true) {
            timerStart = +new Date();
        } else {
            timerStart = +new Date();
            searchAfterDelay();
        }
    };

    search_engine_google_div.hidden = true;

    search_engine_tdk_option.style.backgroundColor = ACTIVE_DIV_BACKGROUND_COLOR;

    search_engine_google_option.onclick = async () => {
        search_engine_tdk_div.hidden = true;
        search_engine_google_option.style.backgroundColor = ACTIVE_DIV_BACKGROUND_COLOR;
        search_engine_tdk_option.style.backgroundColor = "";

        waitForDisplayThenExecuteCallback(input_google, search_engine_google_div, () => {
            // Focus input element.

            input_google.focus({ focusVisible: true });
        });

        // This will trigger observer, then focus the input element.
        search_engine_google_div.hidden = false;
    };

    search_engine_tdk_option.onclick = () => {
        search_engine_google_div.hidden = true;
        search_engine_tdk_option.style.backgroundColor = ACTIVE_DIV_BACKGROUND_COLOR;
        search_engine_google_option.style.backgroundColor = "";

        waitForDisplayThenExecuteCallback(input_tdk, search_engine_tdk_div, () => {
            // Focus input element.

            input_tdk.focus({ focusVisible: true });
        });

        // This will trigger observer, then focus the input element.
        search_engine_tdk_div.hidden = false;
    };

    port = browser.runtime.connect();

    port.onMessage.addListener(portOnMessage);

    changeView(settings["default"]);

    if (settings["default"] == searchEngineList.tdk)
        input_tdk.focus({ focusVisible: true });
    else
        input_google.focus({ focusVisible: true });
}

async function searchAfterDelay() {
    isInLoop = true;
    while ((+new Date() - timerStart) <= 300) {
        await new Promise(resolve => {
            setTimeout(resolve, 100);
        });
    }

    isInLoop = false;

    let input;

    if (search_engine_tdk_div.hidden == false)
        input = input_tdk.value ?? "";
    else if (search_engine_google_div.hidden == false)
        input = input_google.value ?? "";

    input = input.trim().toLocaleLowerCase();

    if (input == "") {
        console.debug("Input was empty.");
        return;
    }

    try {
        const comparedInput = input.replace(/[^a-zA-Zçşüğöıâ ]/g, '');

        if (input != comparedInput) {
            console.debug("Input had invalid characters.");
            return;
        }

        search(input);
    } catch (error) {
        console.error(error);
    }
}

function createTDKUI(message, parentElement) {
    if (!message.word)
        return;
    else if (!message.anlamlarListe)
        return;
    else if (message.anlamlarListe.length <= 0)
        return;

    let boldWordElement = createElement("b", 1, { "textContent": message.word.charAt(0).toUpperCase() + message.word.slice(1) });

    if (!boldWordElement) {
        console.error("Couldn't create an element.");
        return;
    }

    parentElement.appendChild(boldWordElement);

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

function createGoogleUIFromHTMLDoc(doc, parent) {
    let query = doc.querySelector("[data-dobid='hdw']");

    if (!query) {
        console.error("Couldn't find element with data-dobid='hdw'");
        return false;
    }

    let word = query.textContent;

    if (word.trim().toLocaleLowerCase() === "ne demek?")
    {
        console.error("The word was invalid.");
        return false;
    }

    let _extraInfoAfterWord = doc.querySelector("ol[class='eQJLDd']").previousElementSibling?.textContent;
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

    SPEECH_API.searchParams.set("text", word.replace(/·/g, ''));
    
    let audio = doc.querySelector("audio[jsname='QInZvb']");

    if (!audio) {
        audio = document.createElement('audio');
        audio.src = SPEECH_API.href;
    } else {
        if (!audio.src) {
            audio.src = SPEECH_API.href;
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

            let exampleElement = meaningElement.nextElementSibling?.className === "vmod" ? meaningElement.nextElementSibling : null;

            if (extraInfoBeforeExample)
                addElements(contentWrapper,
                    createElement("b", 1, { textContent: extraInfoBeforeExample, style: "font-size: 0.75em" }),
                    createElement("br", 1),
                    createElement("span", 1,
                        {
                            textContent: meaningCounter.toString() + ")" + meaningElement.textContent
                        }),
                    createElement("br", 2));

            else
                addElements(contentWrapper,
                    createElement("span", 1,
                        {
                            textContent: meaningCounter.toString() + ")" + meaningElement.textContent
                        }),
                    createElement("br", 2));

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

    return true;
}

function contextMenuHandler(message) {
    let word = message.word;

    if (message.searchEngine == "tdk") {
        search_engine_tdk_option.click();

        input_tdk.value = word;
    } else if (message.searchEngine == "google") {
        search_engine_google_option.click();

        input_google.value = word;
    }

    search(word, message.searchEngine);
}

function changeView(searchEngine) {
    if (searchEngine === searchEngineList.tdk)
        search_engine_tdk_option.click();
    else if (searchEngine === searchEngineList.google)
        search_engine_google_option.click();
    else
        console.debug("[changeView()] Invalid parameter ignored.");
}

function clearTextFields() {
    let activeElement = (!search_engine_google_div.hidden || search_engine_tdk_div.hidden) ? input_google : input_tdk;

    if (activeElement == input_google)
        input_tdk.value = "";
    else if (activeElement == input_tdk)
        input_google.value = "";

    tdk_result_div.textContent = "";
    google_result_div.textContent = "";
}

async function search(word, _searchEngine, searchAfterPopupOpen = false) {
    if (!word)
        return;

    clearTextFields();

    let searchEngine = _searchEngine ?? "";
    searchEngine = searchEngine.toLocaleLowerCase().trim();

    if (!(searchEngine === "tdk" || searchEngine === "google"))
        searchEngine = (!search_engine_google_div.hidden || search_engine_tdk_div.hidden) ? "google" : "tdk";

    let result = await browser.runtime.sendMessage({
        word: word,
        type: "search",
        searchEngine: searchEngine
    }).catch(err => {
        console.error("search -> " + err);
    });

    if (!result)
    {
        if (searchEngine === "tdk")
            tdk_result_div.textContent = "Sonuç bulunamadı !";
        else if (searchEngine === "google")
            google_result_div.textContent = "Sonuç bulunamadı !";
        return;
    }

    if (result.type == "response_from_tdk") {
        if (searchAfterPopupOpen === true) {
            input_tdk.value = word; // This doesn't invoke oninput event, so it's not going to search the word again.
            changeView(searchEngineList.tdk);
        }

        try {
            createTDKUI(result, tdk_result_div);
        } catch (error) {
            console.error(error);
            tdk_result_div.textContent = "Hata oluştu.";
        }
    }
    else if (result.type == "response_from_google") {
        if (searchAfterPopupOpen === true) {
            input_google.value = word; // This doesn't invoke oninput event, so it's not going to search the word again.
            changeView(searchEngineList.google);
        }

        try {
            const success = createGoogleUIFromHTMLDoc(new DOMParser().parseFromString(result.doc, 'text/html'), google_result_div);
            
            if (!success)
                google_result_div.textContent = "Sonuç bulunamadı !";
        } catch (error) {
            console.error(error);
            google_result_div.textContent = "Hata oluştu !";
        }
    }
}

async function portOnMessage(message) {
    if (message.type == "search_from_context_menu")
        contextMenuHandler(message);
    else if (message.type == "popup_connected_to_background") {
        if (settings["searchSelectedTextOnPopupShow"] === true) {
            const selectedText = await getSelectedTextOnActiveTab();

            if (selectedText == "")
                return;

            const searchEngine = settings["default"];

            search(selectedText, searchEngine, true);
        }
    }
}

initialize();