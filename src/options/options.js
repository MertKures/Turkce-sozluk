import { getSettings, getDefaultSettings } from 'modules/utils.js';

let settings = getDefaultSettings();
let modifierSelectIDCounter = 1;
let blockDiv, selectDiv, modifierSelects, addModifierButton, searchEngineSelect, searchSelectedTextOnPopupShowInput;
let currentModifierCount = 1;

const modifierCount = 3;
const modifierKeys = Object.freeze(["ctrl", "alt", "shift", "none"]);

function loadModifierSelectElementsFromSettings(modifiers) {
    deleteAllModifierSelectElements();

    if (modifiers.length == 0) {
        addModifierSelectElement("none");
    }

    for (let modifier of modifiers) {
        addModifierSelectElement(modifier, true, false);
    }
}

function deleteAllModifierSelectElements(addDefaultAfterDeletion = false, saveDefaultValue = true) {
    let elements = selectDiv.getElementsByTagName("select");

    for (let element of elements) {
        element.remove();
    }

    elements = null;

    currentModifierCount = 0;

    if (addDefaultAfterDeletion) {
        //Varsayılan ekle.
        addModifierSelectElement("none", true, saveDefaultValue);
    }
}

function addModifierSelectElement(modifier, appendChild = true, save = true) {
    if (currentModifierCount === modifierCount) {
        console.debug("Modifier count reached the limit.Which is " + modifierCount);
        return;
    }
    else if (currentModifierCount > modifierCount) {
        modifierSelects = Object.values(selectDiv.getElementsByTagName("select"));

        currentModifierCount = modifierSelects.length;

        for (let i = modifierCount; i < currentModifierCount; i++) {
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
    let _modifiers = [...modifierKeys];

    for (let el of modifierSelects) {
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
    for (let modifier of modifiers) {
        if (!modifier)
            continue;

        let option = document.createElement("option");
        option.value = modifier.toLocaleLowerCase();
        option.textContent = modifier.toUpperCase();

        select.appendChild(option);
    }
}

function modifierSelectOnInput(e) {
    if (this.value === "none" && currentModifierCount > 1) {
        this.remove();
        currentModifierCount--;
    }

    //"modifierSelects" is being updated in here so we didn't updated it again inside the if block.
    Save();
}

function searchEngineSelect_OnInput(e) {
    Save();
}

async function Save() {
    console.debug("Save çağırıldı !");

    //Prevent user to select anything until the process is done.
    blockDiv.style.visibility = "visible";

    let objects = await getSaveObjects();

    await browser.storage.local.set(objects);

    console.debug("Kaydedilen ayarlar", objects);

    blockDiv.style.visibility = "hidden";
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

async function getSaveObjects() {
    let objects = await browser.storage.local.get();
    
    modifierSelects = Object.values(selectDiv.getElementsByTagName("select"));

    objects.modifiers = [];

    for (let modifierSelect of modifierSelects)
        if (modifierSelect.value)
            objects.modifiers.push(modifierSelect.value);

    objects.default = searchEngineSelect.value;

    objects.modifiers = objects.modifiers.filter(onlyUnique);

    if (objects.modifiers.length > 1)
        objects.modifiers = objects.modifiers.filter(modifier => modifier != "none");

    objects.searchSelectedTextOnPopupShow = searchSelectedTextOnPopupShowInput.checked;

    return objects;
}

function searchSelectedTextOnPopupShowInput_OnInput(e) {
    Save();
}

async function initialize() {
    settings = await getSettings();

    blockDiv = document.getElementById("blockDiv");

    selectDiv = document.getElementsByClassName("selectDiv")[0];

    modifierSelects = Object.values(selectDiv.getElementsByTagName("select"));

    for (let select of modifierSelects) {
        select.oninput = modifierSelectOnInput;
    }

    //img
    addModifierButton = document.getElementById("addModifierButton");

    searchEngineSelect = document.getElementById("searchEngineSelect");
    searchEngineSelect.oninput = searchEngineSelect_OnInput;

    searchSelectedTextOnPopupShowInput = document.getElementById("searchSelectedTextOnPopupShowInput");
    searchSelectedTextOnPopupShowInput.oninput = searchSelectedTextOnPopupShowInput_OnInput;

    loadModifierSelectElementsFromSettings(settings.modifiers);

    searchEngineSelect.value = settings.default;

    searchSelectedTextOnPopupShowInput.checked = settings.searchSelectedTextOnPopupShow ?? false;

    addModifierButton.addEventListener("click", addModifierButtonHandler);
}

initialize();