/* YAPILACAKLAR
 * 
 */

const defaultSettings = Object.freeze({ modifiers: Object.freeze(["none"]), default: "tdk", searchSelectedTextOnPopupShow: false });

let modifierSelectIDCounter = 1;

let blockDiv = document.getElementById("blockDiv");

let selectDiv = document.getElementsByClassName("selectDiv")[0];

let modifierSelects = Object.values(selectDiv.getElementsByTagName("select"));

for (select of modifierSelects) {
    select.oninput = modifierSelectOnInput;
}

//img
let addModifierButton = document.getElementById("addModifierButton");

let searchEngineSelect = document.getElementById("searchEngineSelect");
searchEngineSelect.oninput = searchEngineSelectOnInput;

function searchSelectedTextOnPopupShowInputOnInput(e) {
    Save();
}

let searchSelectedTextOnPopupShowInput = document.getElementById("searchSelectedTextOnPopupShowInput");
searchSelectedTextOnPopupShowInput.oninput = searchSelectedTextOnPopupShowInputOnInput;

const modifierCount = 3;
let currentModifierCount = 1;
const modifierKeys = Object.freeze(["ctrl", "alt", "shift", "none"]);
let modifierList = [];

async function loadSettings() {
    let _settings = await browser.storage.local.get();

    _settings = fixSettings(_settings);

    loadModifierSelectElementsFromSettings(_settings.modifiers);

    searchEngineSelect.value = _settings.default;

    searchSelectedTextOnPopupShowInput.checked = _settings.searchSelectedTextOnPopupShow ?? false;
}

loadSettings();

function loadModifierSelectElementsFromSettings(modifiers) {
    deleteAllModifierSelectElements();

    if (modifiers.length == 0) {
        addModifierSelectElement("none");
    }

    for (modifier of modifiers) {
        addModifierSelectElement(modifier, true, false);
    }
}

function deleteAllModifierSelectElements(addDefaultAfterDeletion = false, saveDefaultValue = true) {
    let elements = selectDiv.getElementsByTagName("select");

    for (element of elements) {
        element.remove();
    }

    elements = null;

    currentModifierCount = 0;

    if (addDefaultAfterDeletion) {
        //Varsayılan ekle.
        addModifierSelectElement("none", true, saveDefaultValue);
    }
}

function fixSettings(_settings) {
    let settings = _settings;

    if (!settings) {
        settings = {};
        copyObj(defaultSettings, settings);
        console.debug("Settings, nesne boş olduğundan varsayılana ayarlandı.");
        return settings;
    }

    if (!(settings.default === "tdk" || settings.default === "google")) {
        settings = makeSettingsDefault(settings, "default");
        console.debug("'default' değeri boş olduğundan varsayılana ayarlandı.");
    }

    if ((Array.isArray(settings.modifiers)) ? settings.modifiers.length === 0 : true) {
        settings = makeSettingsDefault(settings, "modifiers");
        console.debug("'modifiers' dizisi boş olduğundan varsayılana ayarlandı.");
    }

    if (!(settings.searchSelectedTextOnPopupShow === false || settings.searchSelectedTextOnPopupShow === true)) {
        settings = makeSettingsDefault(settings, "searchSelectedTextOnPopupShow");
        console.debug("'searchSelectedTextOnPopupShow' değeri boş olduğundan varsayılana ayarlandı.");
    }

    return settings;
}

function makeSettingsDefault(_settings, ...properties) {
    let settings = _settings;

    if (properties.length === 0) {
        settings = {};
        copyObj(defaultSettings, settings);
    }

    for (property of properties) {
        if (defaultSettings[property] == null)
            continue;
        settings[property] = defaultSettings[property];
    }

    return settings;
}

function addModifierSelectElement(modifier, appendChild = true, save = true) {
    if (currentModifierCount === modifierCount) {
        console.debug("Modifier count reached the limit.Which is " + modifierCount);
        return;
    }
    else if (currentModifierCount > modifierCount)
    {
        modifierSelects = Object.values(selectDiv.getElementsByTagName("select"));

        currentModifierCount = modifierSelects.length;

        for (let i = modifierCount;i < currentModifierCount;i++) {
            modifierSelects.pop();
        }
    }

    let select = document.createElement("select");

    select.id = "modifierSelect" + modifierSelectIDCounter;

    addModifierOptions(select, modifierKeys);

    select.value = modifier.toLocaleLowerCase();

    select.oninput = modifierSelectOnInput;

    modifierSelectIDCounter++;

    if (appendChild) {
        selectDiv.appendChild(select);

        modifierSelects.push(select);

        currentModifierCount++;

        if (save)
            Save();
    }
    else
        return select;
}

function addModifierButtonHandler(e) {
    let _modifiers = [];

    copyObj(modifierKeys, _modifiers);

    for (el of modifierSelects) {
        let index = _modifiers.indexOf(el.value);

        if (index !== -1)
            _modifiers[index] = null;
    }

    let modifier = _modifiers.filter(modifier => modifier !== null).at(0);

    if (!modifier) {
        console.error("Can not add modifier because the limit has been reached.");
        return;
    }

    addModifierSelectElement(modifier.toLocaleLowerCase());

    _modifiers = null;
}

function addModifierOptions(select, modifiers) {
    for (modifier of modifiers) {
        if (!modifier)
            continue;

        let option = document.createElement("option");
        option.value = modifier.toLocaleLowerCase();
        option.textContent = modifier.toUpperCase();

        select.appendChild(option);
    }
}

function copyObj(from, to) {
    for (let key in from) {
        let obj = from[key];
        //We don't want to pass old reference to the array.
        to[key] = Array.isArray(obj) ? Array.from(obj) : obj;
    }
    return to;
}

function findKeyOfValueInDictionary(dict, value) {
    for (let key in dict) {
        if (dict[key] === value)
            return key;
    }
    return null;
}

function modifierSelectOnInput(e) {
    if (this.value === "none" && currentModifierCount > 1) {
        this.remove();
        currentModifierCount--;
    }

    //"modifierSelects" is being updated in here so we didn't updated it again inside the if block.
    Save();
}

function searchEngineSelectOnInput(e) {
    Save();
}

function Save() {
    console.debug("Save çağırıldı !");

    //Prevent user to select anything until the process is done.
    blockDiv.style.visibility = "visible";

    let objects = getSaveObjects();

    browser.storage.local.set(objects);

    console.debug("Kaydedilen ayarlar", objects);

    blockDiv.style.visibility = "hidden";
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function getSaveObjects() {
    let objects = {};

    copyObj(defaultSettings, objects);

    modifierSelects = Object.values(selectDiv.getElementsByTagName("select"));

    for (modifierSelect of modifierSelects)
        if (modifierSelect.value)
            objects.modifiers.push(modifierSelect.value);
        else
            console.debug("Ayarlar kaydedilirken modifierSelect değişkenlerinden birinin \"value\" özelliği boştu.");

    objects.default = searchEngineSelect.value;

    objects.modifiers = objects.modifiers.filter(onlyUnique);

    objects.searchSelectedTextOnPopupShow = searchSelectedTextOnPopupShowInput.checked;

    //Modifier atanmış işe "none" değeri varsa sil.
    if (objects.modifiers.length > 1) {
        objects.modifiers = objects.modifiers.filter(modifier => modifier != "none");
    }

    return objects;
}

addModifierButton.addEventListener("click", addModifierButtonHandler);
