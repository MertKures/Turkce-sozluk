(function () {
    /* YAPILACAKLAR
     * Başlangıçta ayarları yüklemek. (Tdk ve modifier değerlerini doğru bir şekilde göstermek)
     */

    /* Ayarlar örneği
        { modifiers: ["none"], default: "tdk" }
    */

    let modifierSelectIDCounter = 1;

    let blockDiv = document.getElementById("blockDiv");

    let selectDiv = document.getElementsByClassName("selectDiv")[0];

    let modifierSelects = selectDiv.getElementsByTagName("select");

    for (select of modifierSelects) {
        select.oninput = modifierSelectOnInput;
    }

    let addModifierButton = document.getElementById("addModifierButton");

    let searchSiteSelect = document.getElementById("searchSiteSelect");
    searchSiteSelect.oninput = searchSiteSelectOnInput;

    const modifierCount = 3;
    let currentModifierCount = 1;
    const modifierKeys = ["ctrl", "alt", "shift", "none"];
    let modifierList = [];

    loadSettings();

    function loadSettings() {
        browser.storage.local.get().then(settings => {
            console.log(settings);
            if (settings.modifiers) {
                loadModifierSelectElementsFromSettings(settings.modifiers);
            }

            if (settings.default) {
                loadSearchSiteFromSettings(settings.default);
            }
        });
    }

    function loadModifierSelectElementsFromSettings(modifiers) {
        deleteAllModifierSelectElements();

        if (modifiers.length == 0) {
            addModifierSelectElement("none");
        }

        for (modifier of modifiers) {
            addModifierSelectElement(modifier, true, false);
        }

        selectDiv = document.getElementsByClassName("selectDiv")[0];
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

    function loadSearchSiteFromSettings(searchSite) {
        searchSiteSelect.value = searchSite;
    }

    function addModifierSelectElement(modifier, appendChild = true, updateAndSave = true) {
        if (currentModifierCount == modifierCount)
            return;
        else if (currentModifierCount > modifierCount) {
            modifierSelects[modifierSelects.length - 1].remove();
        }

        let select = document.createElement("select");

        select.id = "modifierSelect" + modifierSelectIDCounter;

        addModifierOptions(select, modifierKeys);

        select.value = modifier.toLowerCase();

        select.oninput = modifierSelectOnInput;

        modifierSelectIDCounter++;

        if (appendChild) {
            selectDiv.appendChild(select);

            if (updateAndSave) {
                currentModifierCount++;

                Save();
            }
        }
        else {
            return select;
        }
    }

    function addModifierButtonHandler(e) {
        let _modifiers = [];

        copyArray(modifierKeys, _modifiers);

        for (var el of modifierSelects) {
            if (_modifiers.includes(el.value)) {
                _modifiers[_modifiers.indexOf(el.value)] = null;
            }
        }

        let modifier = returnFirstValidValueFromArray(_modifiers);

        if (!modifier) {
            throw "_modifier listesi boştu !";
        }

        addModifierSelectElement(modifier.toLowerCase());

        _modifiers = null;
    }

    function addModifierOptions(select, modifiers) {
        for (modifier of modifiers) {
            if (!modifier)
                continue;

            let option = document.createElement("option");
            option.value = modifier.toLowerCase();
            option.textContent = modifier.toUpperCase();

            select.appendChild(option);
        }
    }

    function copyArray(arr1, arr2) {
        for (var el of arr1) {
            arr2.push(el);
        }
        return arr2;
    }

    function findKeyOfValueInDictionary(json, value) {
        for (var key in json) {
            if (json[key] == value)
                return key;
        }
        return null;
    }

    function returnFirstValidValueFromArray(arr) {
        for (var item of arr) {
            if (item)
                return item;
        }
        return null;
    }

    function modifierSelectOnInput(e) {
        if (this.value == "none" && currentModifierCount > 1) {
            let key = findKeyOfValueInDictionary(modifierSelects, this);

            if (key) {
                modifierSelects[key].remove();
                this.remove();
                currentModifierCount--;
            } else {
                console.error("NONE yapıldıktan sonra element silinemedi çünkü listede bulunamadı.");
            }
        }

        Save();
    }

    function searchSiteSelectOnInput(e) {
        Save();
    }

    function Save() {
        console.warn("Save çağırıldı !");

        //Prevent user to select anything until the process is done.
        blockDiv.style.visibility = "visible";

        let objects = getSaveObjects();

        browser.storage.local.set(objects);

        console.warn("Kaydedilen ayarlar", objects);

        sendSettings(objects);

        objects = null;

        blockDiv.style.visibility = "hidden";
    }

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    function getSaveObjects() {
        let objects = { modifiers: ["none"], default: "tdk" };

        updateSelectDiv();

        for (modifierSelect of modifierSelects) {
            if (modifierSelect.value) {
                objects.modifiers.push(modifierSelect.value);
            } else {
                console.warn("Ayarlar kaydedilirken modifierSelect değişkenlerinden birinin \"value\" özelliği boştu.");
            }
        }

        objects.default = searchSiteSelect.value;

        objects.modifiers = objects.modifiers.filter(onlyUnique);

        //Modifier atanmış işe "none" değeri varsa sil.
        if (objects.modifiers.length > 1)
        {
            objects.modifiers = objects.modifiers.filter(modifier => modifier != "none");
        }
        
        return objects;
    }

    function sendSettings(settings) {
        browser.runtime.sendMessage({ type: "UpdateSettings", settings: settings });
    }

    function updateSelectDiv() {
        if (!selectDiv)
            selectDiv = document.getElementsByClassName("selectDiv")[0];
    }

    addModifierButton.addEventListener("click", addModifierButtonHandler);
})();